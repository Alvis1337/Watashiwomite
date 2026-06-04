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

    /** Search TVDB for an anime series by title. Returns the best matching result or null. */
    suspend fun searchSeries(apiKey: String, title: String): Result<TvdbSeriesResult?> =
        withContext(Dispatchers.IO) {
            runCatching {
                val token = getToken(apiKey)
                val encodedTitle = java.net.URLEncoder.encode(title, "UTF-8")
                val req = Request.Builder()
                    .url("https://api4.thetvdb.com/v4/search?query=$encodedTitle&type=series&limit=5")
                    .header("Authorization", "Bearer $token")
                    .build()
                http.newCall(req).execute().use { resp ->
                    check(resp.isSuccessful) { "TVDB search failed: ${resp.code}" }
                    val json = JSONObject(resp.body?.string() ?: throw IOException("Empty TVDB search response"))
                    val data = json.optJSONArray("data") ?: return@use null
                    if (data.length() == 0) return@use null

                    // Prefer results tagged as anime/animation
                    var best: TvdbSeriesResult? = null
                    for (i in 0 until data.length()) {
                        val item = data.getJSONObject(i)
                        val genres = mutableListOf<String>()
                        item.optJSONArray("genres")?.let { arr ->
                            for (j in 0 until arr.length()) genres.add(arr.getString(j))
                        }
                        val result = TvdbSeriesResult(
                            tvdbId = item.optInt("tvdb_id", -1),
                            name = item.optString("name", ""),
                            overview = item.optString("overview", ""),
                            year = item.optString("year", ""),
                            imageUrl = item.optString("image_url", ""),
                            genres = genres,
                        )
                        if (result.tvdbId == -1) continue
                        val isAnime = genres.any { g -> g.contains("anime", ignoreCase = true) || g.contains("animation", ignoreCase = true) }
                        if (best == null || isAnime) best = result
                        if (isAnime) break
                    }
                    best
                }
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
