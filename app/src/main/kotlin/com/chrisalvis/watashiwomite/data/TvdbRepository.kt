package com.chrisalvis.watashiwomite.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

data class TvdbSeriesResult(
    val tvdbId: Int,
    val name: String,
    val overview: String,
    val year: String,
    val imageUrl: String,
    val genres: List<String>,
)

// ── Fuzzy title matching helpers (ported from stringMatchingService.ts) ──────

private fun normalizeTitle(title: String): String =
    title.lowercase()
        .replace(Regex("[^\\w\\s]"), "")
        .replace(Regex("\\s+"), " ")
        .trim()

private fun levenshtein(a: String, b: String): Int {
    val dp = Array(a.length + 1) { IntArray(b.length + 1) }
    for (i in 0..a.length) dp[i][0] = i
    for (j in 0..b.length) dp[0][j] = j
    for (i in 1..a.length) for (j in 1..b.length) {
        dp[i][j] = if (a[i - 1] == b[j - 1]) dp[i - 1][j - 1]
        else minOf(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1)
    }
    return dp[a.length][b.length]
}

fun similarityPct(a: String, b: String): Double {
    val maxLen = maxOf(a.length, b.length)
    if (maxLen == 0) return 100.0
    return (maxLen - levenshtein(a.lowercase(), b.lowercase())) * 100.0 / maxLen
}

/** Strip common trailing season/year suffixes: "Series 2", "Series (2023)", "Series Season 2" */
private fun stripSuffix(title: String): String =
    title
        .replace(Regex("\\s+Season\\s+\\d+$", RegexOption.IGNORE_CASE), "")
        .replace(Regex("\\s+S\\d+$", RegexOption.IGNORE_CASE), "")
        .replace(Regex("\\s+\\d+$"), "")
        .replace(Regex("\\s*\\(\\d{4}\\)$"), "")
        .trim()

class TvdbRepository {

    private val http = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private var cachedToken: String? = null
    private var tokenExpiryMs: Long = 0L

    private suspend fun getToken(apiKey: String): String {
        val now = System.currentTimeMillis()
        if (cachedToken != null && now < tokenExpiryMs) return cachedToken!!

        return withContext(Dispatchers.IO) {
            val body = JSONObject().put("apikey", apiKey).toString()
                .toRequestBody("application/json".toMediaType())
            val req = Request.Builder()
                .url("https://api4.thetvdb.com/v4/login")
                .post(body)
                .build()
            http.newCall(req).execute().use { resp ->
                check(resp.isSuccessful) { "TVDB login failed: ${resp.code}" }
                val json = JSONObject(resp.body?.string() ?: throw IOException("Empty TVDB login response"))
                val token = json.getJSONObject("data").getString("token")
                cachedToken = token
                tokenExpiryMs = now + 24 * 60 * 60 * 1000L // 24h
                token
            }
        }
    }

    /** Search TVDB for an anime series. Tries exact → normalized → suffix-stripped variants. */
    suspend fun searchSeries(apiKey: String, title: String): Result<TvdbSeriesResult?> =
        withContext(Dispatchers.IO) {
            runCatching {
                val token = getToken(apiKey)
                // Build a list of title variants to try (deduplicated, preserving order)
                val variants = buildList {
                    add(title)
                    val stripped = stripSuffix(title)
                    if (stripped != title) add(stripped)
                    val norm = normalizeTitle(title)
                    if (norm != title.lowercase()) add(norm)
                    val normStripped = normalizeTitle(stripped)
                    if (normStripped != norm) add(normStripped)
                }.distinct()

                for (variant in variants) {
                    val result = searchTvdb(token, variant)
                    if (result != null) return@runCatching result
                }
                null
            }
        }

    private fun searchTvdb(token: String, title: String): TvdbSeriesResult? {
        val encodedTitle = java.net.URLEncoder.encode(title, "UTF-8")
        val req = Request.Builder()
            .url("https://api4.thetvdb.com/v4/search?query=$encodedTitle&type=series&limit=5")
            .header("Authorization", "Bearer $token")
            .build()
        http.newCall(req).execute().use { resp ->
            if (!resp.isSuccessful) return null
            val json = JSONObject(resp.body?.string() ?: return null)
            val data = json.optJSONArray("data") ?: return null
            if (data.length() == 0) return null

            // Score each result: anime/animation + title similarity
            var best: Pair<TvdbSeriesResult, Double>? = null
            val normTitle = normalizeTitle(title)

            for (i in 0 until data.length()) {
                val item = data.getJSONObject(i)
                val genres = mutableListOf<String>()
                item.optJSONArray("genres")?.let { arr ->
                    for (j in 0 until arr.length()) genres.add(arr.getString(j))
                }
                val tvdbId = item.optInt("tvdb_id", -1)
                if (tvdbId == -1) continue

                val name = item.optString("name", "")
                val result = TvdbSeriesResult(
                    tvdbId = tvdbId,
                    name = name,
                    overview = item.optString("overview", ""),
                    year = item.optString("year", ""),
                    imageUrl = item.optString("image_url", ""),
                    genres = genres,
                )

                val isAnime = genres.any { g ->
                    g.contains("anime", ignoreCase = true) || g.contains("animation", ignoreCase = true)
                }
                val sim = similarityPct(normTitle, normalizeTitle(name))
                // Also check aliases for a better match
                val aliasSim = item.optJSONArray("aliases")?.let { arr ->
                    var max = sim
                    for (j in 0 until arr.length()) {
                        val alias = arr.optString(j)
                        if (alias.isNotBlank()) max = maxOf(max, similarityPct(normTitle, normalizeTitle(alias)))
                    }
                    max
                } ?: sim
                val score = aliasSim + if (isAnime) 20.0 else 0.0

                if (best == null || score > best.second) best = result to score
            }
            best?.first
        }
    }

    /** Validate the API key returns a token successfully. */
    suspend fun validateApiKey(apiKey: String): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            cachedToken = null // force re-auth
            getToken(apiKey)
            Unit
        }
    }
}
