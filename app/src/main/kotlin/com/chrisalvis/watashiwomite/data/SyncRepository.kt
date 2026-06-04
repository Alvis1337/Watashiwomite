package com.chrisalvis.watashiwomite.data

import android.content.Context
import kotlinx.coroutines.flow.first
import org.json.JSONArray
import org.json.JSONObject

enum class SyncStatus { SYNCED, NOT_FOUND, ERROR, PENDING }

data class SyncEntry(
    val malId: Int,
    val malTitle: String,
    val malStatus: String,
    val imageUrl: String,
    val tvdbId: Int?,
    val tvdbTitle: String?,
    val sonarrId: Int?,
    val syncStatus: SyncStatus,
    val errorMessage: String?,
)

fun SyncEntry.toJson(): JSONObject = JSONObject().apply {
    put("malId", malId)
    put("malTitle", malTitle)
    put("malStatus", malStatus)
    put("imageUrl", imageUrl)
    put("tvdbId", tvdbId ?: JSONObject.NULL)
    put("tvdbTitle", tvdbTitle ?: JSONObject.NULL)
    put("sonarrId", sonarrId ?: JSONObject.NULL)
    put("syncStatus", syncStatus.name)
    put("errorMessage", errorMessage ?: JSONObject.NULL)
}

fun JSONObject.toSyncEntry(): SyncEntry = SyncEntry(
    malId = getInt("malId"),
    malTitle = getString("malTitle"),
    malStatus = optString("malStatus", ""),
    imageUrl = optString("imageUrl", ""),
    tvdbId = if (isNull("tvdbId")) null else optInt("tvdbId"),
    tvdbTitle = if (isNull("tvdbTitle")) null else optString("tvdbTitle"),
    sonarrId = if (isNull("sonarrId")) null else optInt("sonarrId"),
    syncStatus = runCatching { SyncStatus.valueOf(getString("syncStatus")) }.getOrDefault(SyncStatus.PENDING),
    errorMessage = if (isNull("errorMessage")) null else optString("errorMessage"),
)

class SyncRepository(private val context: Context) {

    private val prefs = AppPreferences(context)
    private val malRepo = MalRepository(context)
    private val sonarrRepo = SonarrRepository()
    private val tvdbRepo = TvdbRepository()

    /** Load last sync results from DataStore cache. */
    suspend fun loadCachedSyncData(): List<SyncEntry> {
        val json = prefs.syncDataJson.first()
        return runCatching {
            val arr = JSONArray(json)
            List(arr.length()) { arr.getJSONObject(it).toSyncEntry() }
        }.getOrDefault(emptyList())
    }

    private suspend fun saveSyncData(entries: List<SyncEntry>) {
        val arr = JSONArray()
        entries.forEach { arr.put(it.toJson()) }
        prefs.setSyncData(arr.toString(), System.currentTimeMillis())
    }

    data class SyncResult(
        val entries: List<SyncEntry>,
        val totalCount: Int,
        val syncedCount: Int,
        val needSyncCount: Int,
        val errorCount: Int,
        val notFoundCount: Int,
    )

    /** Run a full sync: fetch MAL list → look up TVDB IDs → add missing to Sonarr. */
    suspend fun runSync(onProgress: suspend (String) -> Unit = {}): Result<SyncResult> = runCatching {
        onProgress("Fetching Sonarr configuration…")

        val sonarrUrl = prefs.sonarrUrl.first()
        val sonarrApiKey = prefs.sonarrApiKey.first()
        val rootFolder = prefs.sonarrRootFolder.first()
        val qualityProfileId = prefs.sonarrQualityProfileId.first().toIntOrNull() ?: 1
        val tvdbApiKey = prefs.tvdbApiKey.first()
        val syncStatuses = prefs.syncStatuses.first()

        check(sonarrUrl.isNotBlank()) { "Sonarr URL is not configured" }
        check(sonarrApiKey.isNotBlank()) { "Sonarr API key is not configured" }
        check(tvdbApiKey.isNotBlank()) { "TVDB API key is not configured" }

        // Resolve root folder: use stored or pick first available
        val effectiveRootFolder = if (rootFolder.isNotBlank()) rootFolder else {
            onProgress("Fetching Sonarr root folders…")
            sonarrRepo.getRootFolders(sonarrUrl, sonarrApiKey).getOrThrow().firstOrNull()?.path
                ?: throw IllegalStateException("No root folders found in Sonarr")
        }

        onProgress("Fetching current Sonarr library…")
        val sonarrSeries = sonarrRepo.getSeries(sonarrUrl, sonarrApiKey).getOrThrow()
        val sonarrByTvdbId = sonarrSeries.associateBy { it.tvdbId }

        onProgress("Fetching your MAL list…")
        val malEntries = malRepo.fetchAnimeList(syncStatuses).getOrThrow()

        val entries = mutableListOf<SyncEntry>()
        var syncedCount = 0
        var needSyncCount = 0
        var errorCount = 0
        var notFoundCount = 0

        for ((index, anime) in malEntries.withIndex()) {
            onProgress("Processing ${index + 1}/${malEntries.size}: ${anime.title}")

            // Check if already in Sonarr by searching TVDB first
            val tvdbResult = runCatching { tvdbRepo.searchSeries(tvdbApiKey, anime.title).getOrNull() }

            if (tvdbResult.isFailure) {
                entries.add(SyncEntry(
                    malId = anime.malId,
                    malTitle = anime.title,
                    malStatus = anime.status,
                    imageUrl = anime.imageUrl,
                    tvdbId = null,
                    tvdbTitle = null,
                    sonarrId = null,
                    syncStatus = SyncStatus.ERROR,
                    errorMessage = tvdbResult.exceptionOrNull()?.message ?: "TVDB lookup failed",
                ))
                errorCount++
                continue
            }

            val tvdb = tvdbResult.getOrNull()
            if (tvdb == null) {
                entries.add(SyncEntry(
                    malId = anime.malId,
                    malTitle = anime.title,
                    malStatus = anime.status,
                    imageUrl = anime.imageUrl,
                    tvdbId = null,
                    tvdbTitle = null,
                    sonarrId = null,
                    syncStatus = SyncStatus.NOT_FOUND,
                    errorMessage = "Not found on TVDB",
                ))
                notFoundCount++
                continue
            }

            val existingSonarr = sonarrByTvdbId[tvdb.tvdbId]
            if (existingSonarr != null) {
                entries.add(SyncEntry(
                    malId = anime.malId,
                    malTitle = anime.title,
                    malStatus = anime.status,
                    imageUrl = anime.imageUrl,
                    tvdbId = tvdb.tvdbId,
                    tvdbTitle = tvdb.name,
                    sonarrId = existingSonarr.id,
                    syncStatus = SyncStatus.SYNCED,
                    errorMessage = null,
                ))
                syncedCount++
                continue
            }

            // Not in Sonarr yet — add it
            val addResult = sonarrRepo.addSeries(
                url = sonarrUrl,
                apiKey = sonarrApiKey,
                tvdbId = tvdb.tvdbId,
                title = tvdb.name,
                rootFolderPath = effectiveRootFolder,
                qualityProfileId = qualityProfileId,
            )

            if (addResult.isSuccess) {
                entries.add(SyncEntry(
                    malId = anime.malId,
                    malTitle = anime.title,
                    malStatus = anime.status,
                    imageUrl = anime.imageUrl,
                    tvdbId = tvdb.tvdbId,
                    tvdbTitle = tvdb.name,
                    sonarrId = addResult.getOrNull(),
                    syncStatus = SyncStatus.SYNCED,
                    errorMessage = null,
                ))
                syncedCount++
            } else {
                val errMsg = addResult.exceptionOrNull()?.message ?: "Failed to add to Sonarr"
                val isAlreadyExists = errMsg.contains("already", ignoreCase = true)
                entries.add(SyncEntry(
                    malId = anime.malId,
                    malTitle = anime.title,
                    malStatus = anime.status,
                    imageUrl = anime.imageUrl,
                    tvdbId = tvdb.tvdbId,
                    tvdbTitle = tvdb.name,
                    sonarrId = null,
                    syncStatus = if (isAlreadyExists) SyncStatus.SYNCED else SyncStatus.ERROR,
                    errorMessage = if (isAlreadyExists) null else errMsg,
                ))
                if (isAlreadyExists) syncedCount++ else errorCount++
            }
        }

        needSyncCount = entries.count { it.syncStatus == SyncStatus.PENDING }
        saveSyncData(entries)

        SyncResult(
            entries = entries,
            totalCount = entries.size,
            syncedCount = syncedCount,
            needSyncCount = needSyncCount,
            errorCount = errorCount,
            notFoundCount = notFoundCount,
        )
    }

    fun computeStats(entries: List<SyncEntry>) = SyncResult(
        entries = entries,
        totalCount = entries.size,
        syncedCount = entries.count { it.syncStatus == SyncStatus.SYNCED },
        needSyncCount = entries.count { it.syncStatus == SyncStatus.PENDING },
        errorCount = entries.count { it.syncStatus == SyncStatus.ERROR },
        notFoundCount = entries.count { it.syncStatus == SyncStatus.NOT_FOUND },
    )
}
