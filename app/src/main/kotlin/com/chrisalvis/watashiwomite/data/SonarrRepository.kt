package com.chrisalvis.watashiwomite.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

data class SonarrSeries(
    val id: Int,
    val tvdbId: Int,
    val title: String,
    val alternateTitles: List<String> = emptyList(),
    // Live stats from Sonarr (not persisted in SyncEntry cache)
    val episodeFileCount: Int = 0,
    val episodeCount: Int = 0,
    val totalEpisodeCount: Int = 0,
    val percentOfEpisodes: Double = 0.0,
    val monitored: Boolean = true,
    val sonarrStatus: String = "", // "continuing", "ended", "upcoming", "deleted"
)

data class SonarrRootFolder(
    val id: Int,
    val path: String,
    val freeSpace: Long,
)

data class SonarrQualityProfile(
    val id: Int,
    val name: String,
)

class SonarrRepository {

    private val http = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private fun baseHeaders(url: String, apiKey: String): Request.Builder =
        Request.Builder()
            .header("X-Api-Key", apiKey)
            .header("Accept", "application/json")

    /** Test Sonarr connection. Returns version string on success. */
    suspend fun testConnection(url: String, apiKey: String): Result<String> = withContext(Dispatchers.IO) {
        runCatching {
            val req = baseHeaders(url, apiKey)
                .url("$url/api/v3/system/status")
                .get()
                .build()
            http.newCall(req).execute().use { resp ->
                check(resp.isSuccessful) { "Sonarr connection failed: ${resp.code}" }
                val json = JSONObject(resp.body?.string() ?: throw IOException("Empty response"))
                json.optString("version", "unknown")
            }
        }
    }

    /** Fetch all series currently in Sonarr. */
    suspend fun getSeries(url: String, apiKey: String): Result<List<SonarrSeries>> = withContext(Dispatchers.IO) {
        runCatching {
            val req = baseHeaders(url, apiKey)
                .url("$url/api/v3/series")
                .get()
                .build()
            http.newCall(req).execute().use { resp ->
                check(resp.isSuccessful) { "Failed to fetch Sonarr series: ${resp.code}" }
                val arr = JSONArray(resp.body?.string() ?: throw IOException("Empty response"))
                List(arr.length()) {
                    val obj = arr.getJSONObject(it)
                    val altTitles = mutableListOf<String>()
                    obj.optJSONArray("alternateTitles")?.let { a ->
                        for (j in 0 until a.length()) a.optJSONObject(j)?.optString("title")?.let(altTitles::add)
                    }
                    val stats = obj.optJSONObject("statistics")
                    SonarrSeries(
                        id = obj.getInt("id"),
                        tvdbId = obj.optInt("tvdbId", -1),
                        title = obj.getString("title"),
                        alternateTitles = altTitles,
                        episodeFileCount = stats?.optInt("episodeFileCount", 0) ?: 0,
                        episodeCount = stats?.optInt("episodeCount", 0) ?: 0,
                        totalEpisodeCount = stats?.optInt("totalEpisodeCount", 0) ?: 0,
                        percentOfEpisodes = stats?.optDouble("percentOfEpisodes", 0.0) ?: 0.0,
                        monitored = obj.optBoolean("monitored", true),
                        sonarrStatus = obj.optString("status", ""),
                    )
                }
            }
        }
    }

    /** Fetch available root folders. */
    suspend fun getRootFolders(url: String, apiKey: String): Result<List<SonarrRootFolder>> = withContext(Dispatchers.IO) {
        runCatching {
            val req = baseHeaders(url, apiKey)
                .url("$url/api/v3/rootfolder")
                .get()
                .build()
            http.newCall(req).execute().use { resp ->
                check(resp.isSuccessful) { "Failed to fetch root folders: ${resp.code}" }
                val arr = JSONArray(resp.body?.string() ?: throw IOException("Empty response"))
                List(arr.length()) {
                    val obj = arr.getJSONObject(it)
                    SonarrRootFolder(
                        id = obj.getInt("id"),
                        path = obj.getString("path"),
                        freeSpace = obj.optLong("freeSpace", 0),
                    )
                }
            }
        }
    }

    /** Fetch quality profiles. */
    suspend fun getQualityProfiles(url: String, apiKey: String): Result<List<SonarrQualityProfile>> = withContext(Dispatchers.IO) {
        runCatching {
            val req = baseHeaders(url, apiKey)
                .url("$url/api/v3/qualityprofile")
                .get()
                .build()
            http.newCall(req).execute().use { resp ->
                check(resp.isSuccessful) { "Failed to fetch quality profiles: ${resp.code}" }
                val arr = JSONArray(resp.body?.string() ?: throw IOException("Empty response"))
                List(arr.length()) {
                    val obj = arr.getJSONObject(it)
                    SonarrQualityProfile(id = obj.getInt("id"), name = obj.getString("name"))
                }
            }
        }
    }

    /** Add a new series to Sonarr. Returns the new series ID. */
    suspend fun addSeries(
        url: String,
        apiKey: String,
        tvdbId: Int,
        title: String,
        rootFolderPath: String,
        qualityProfileId: Int,
        monitored: Boolean = true,
    ): Result<Int> = withContext(Dispatchers.IO) {
        runCatching {
            val body = JSONObject().apply {
                put("tvdbId", tvdbId)
                put("title", title)
                put("qualityProfileId", qualityProfileId)
                put("rootFolderPath", rootFolderPath)
                put("monitored", monitored)
                put("seasonFolder", true)
                put("addOptions", JSONObject().apply {
                    put("searchForMissingEpisodes", false)
                    put("monitor", "all")
                })
            }.toString().toRequestBody("application/json".toMediaType())

            val req = baseHeaders(url, apiKey)
                .url("$url/api/v3/series")
                .post(body)
                .build()

            http.newCall(req).execute().use { resp ->
                val respBody = resp.body?.string()
                check(resp.isSuccessful) { "Failed to add series to Sonarr: ${resp.code} $respBody" }
                JSONObject(respBody ?: throw IOException("Empty response")).getInt("id")
            }
        }
    }

    /** Remove a series from Sonarr by series ID. */
    suspend fun removeSeries(
        url: String,
        apiKey: String,
        seriesId: Int,
        deleteFiles: Boolean = false,
    ): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val req = baseHeaders(url, apiKey)
                .url("$url/api/v3/series/$seriesId?deleteFiles=$deleteFiles")
                .delete()
                .build()
            http.newCall(req).execute().use { resp ->
                check(resp.isSuccessful) { "Failed to remove series: ${resp.code}" }
            }
        }
    }

    /** Send a Sonarr command (e.g. "MissingEpisodeSearch", "RefreshSeries"). */
    suspend fun sendCommand(url: String, apiKey: String, name: String): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val body = JSONObject().put("name", name).toString()
                .toRequestBody("application/json".toMediaType())
            val req = baseHeaders(url, apiKey)
                .url("$url/api/v3/command")
                .post(body)
                .build()
            http.newCall(req).execute().use { resp ->
                check(resp.isSuccessful) { "Command '$name' failed: ${resp.code}" }
            }
        }
    }
}
