package com.chrisalvis.watashiwomite.data

import com.chrisalvis.watashiwomite.data.api.NetworkClient
import com.chrisalvis.watashiwomite.data.api.TvdbLoginRequest
import com.chrisalvis.watashiwomite.data.api.TvdbSearchItem

data class TvdbSeriesResult(
    val tvdbId: Int,
    val name: String,
    val overview: String,
    val year: String,
    val imageUrl: String,
    val genres: List<String>,
)

// ── Fuzzy title matching helpers ──────────────────────────────────────────────

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

private fun stripSuffix(title: String): String =
    title
        .replace(Regex("\\s+Season\\s+\\d+$", RegexOption.IGNORE_CASE), "")
        .replace(Regex("\\s+S\\d+$", RegexOption.IGNORE_CASE), "")
        .replace(Regex("\\s+\\d+$"), "")
        .replace(Regex("\\s*\\(\\d{4}\\)$"), "")
        .trim()

class TvdbRepository {

    private var cachedToken: String? = null
    private var tokenExpiryMs: Long = 0L

    private suspend fun getToken(apiKey: String): String {
        val now = System.currentTimeMillis()
        if (cachedToken != null && now < tokenExpiryMs) return cachedToken!!
        val resp = NetworkClient.tvdbLoginApi().login(TvdbLoginRequest(apiKey))
        cachedToken = resp.data.token
        tokenExpiryMs = now + 24 * 60 * 60 * 1000L
        return resp.data.token
    }

    suspend fun searchSeries(apiKey: String, title: String): Result<TvdbSeriesResult?> = runCatching {
        val token = getToken(apiKey)
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
            val result = scoreAndPick(NetworkClient.tvdbApi(token).search(variant).data, variant)
            if (result != null) return@runCatching result
        }
        null
    }

    suspend fun searchSeriesAll(apiKey: String, query: String): Result<List<TvdbSeriesResult>> = runCatching {
        val token = getToken(apiKey)
        NetworkClient.tvdbApi(token).searchAll(query).data
            ?.mapNotNull { it.toResult() }
            ?: emptyList()
    }

    suspend fun validateApiKey(apiKey: String): Result<Unit> = runCatching {
        cachedToken = null
        getToken(apiKey)
        Unit
    }

    private fun scoreAndPick(items: List<TvdbSearchItem>?, query: String): TvdbSeriesResult? {
        if (items.isNullOrEmpty()) return null
        val normQuery = normalizeTitle(query)
        var best: Pair<TvdbSeriesResult, Double>? = null

        for (item in items) {
            val result = item.toResult() ?: continue
            val isAnime = item.genres?.any { g ->
                g.contains("anime", ignoreCase = true) || g.contains("animation", ignoreCase = true)
            } ?: false
            val sim = similarityPct(normQuery, normalizeTitle(result.name))
            val aliasSim = item.aliases?.maxOfOrNull { alias ->
                if (alias.isNotBlank()) similarityPct(normQuery, normalizeTitle(alias)) else sim
            } ?: sim
            val score = maxOf(sim, aliasSim) + if (isAnime) 20.0 else 0.0
            if (best == null || score > best.second) best = result to score
        }
        return best?.first
    }

    private fun TvdbSearchItem.toResult(): TvdbSeriesResult? {
        val id = tvdbId?.toIntOrNull() ?: return null
        return TvdbSeriesResult(
            tvdbId = id,
            name = name ?: return null,
            overview = overview ?: "",
            year = year ?: "",
            imageUrl = imageUrl ?: "",
            genres = genres ?: emptyList(),
        )
    }
}
