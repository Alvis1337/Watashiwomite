package com.chrisalvis.watashiwomite.data

import android.content.Context
import kotlinx.coroutines.flow.first
import org.json.JSONArray
import org.json.JSONObject

enum class SyncStatus { SYNCED, NOT_FOUND, ERROR, PENDING, SKIPPED }

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
    val mediaType: String = "tv",
    val score: Int = 0,
    val numEpisodes: Int = 0,
)

data class SyncHistoryEntry(
    val timestampMs: Long,
    val totalCount: Int,
    val syncedCount: Int,
    val newlyAddedCount: Int,
    val notFoundCount: Int,
    val errorCount: Int,
    val skippedCount: Int,
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("timestampMs", timestampMs)
        put("totalCount", totalCount)
        put("syncedCount", syncedCount)
        put("newlyAddedCount", newlyAddedCount)
        put("notFoundCount", notFoundCount)
        put("errorCount", errorCount)
        put("skippedCount", skippedCount)
    }
}

fun JSONObject.toSyncHistoryEntry() = SyncHistoryEntry(
    timestampMs = optLong("timestampMs", 0L),
    totalCount = optInt("totalCount", 0),
    syncedCount = optInt("syncedCount", 0),
    newlyAddedCount = optInt("newlyAddedCount", 0),
    notFoundCount = optInt("notFoundCount", 0),
    errorCount = optInt("errorCount", 0),
    skippedCount = optInt("skippedCount", 0),
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
    put("mediaType", mediaType)
    put("score", score)
    put("numEpisodes", numEpisodes)
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
    mediaType = optString("mediaType", "tv"),
    score = optInt("score", 0),
    numEpisodes = optInt("numEpisodes", 0),
)

/** Determine Sonarr monitoring string from MAL user score & configured thresholds. */
private fun monitoringForScore(score: Int, highThreshold: Int, medThreshold: Int): String = when {
    score <= 0 -> "all"           // unrated → monitor all
    score >= highThreshold -> "all"
    score >= medThreshold -> "future"
    else -> "none"
}

/** Lightweight preview of what a sync would do — no writes to Sonarr. */
data class SyncPreview(
    val toAdd: List<Pair<MalAnimeEntry, TvdbSeriesResult>>,     // would be newly added
    val alreadySynced: List<Pair<MalAnimeEntry, SonarrSeries>>, // already in Sonarr
    val notFound: List<MalAnimeEntry>,                          // TVDB lookup returned nothing
    val skipped: List<MalAnimeEntry>,                           // filtered by type
    val errors: List<Pair<MalAnimeEntry, String>>,              // lookup error
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

    /** Load sync history (newest first, capped at 20). */
    suspend fun loadSyncHistory(): List<SyncHistoryEntry> {
        val json = prefs.syncHistoryJson.first()
        return runCatching {
            val arr = JSONArray(json)
            List(arr.length()) { arr.getJSONObject(it).toSyncHistoryEntry() }
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
        val newlyAddedCount: Int,
        val needSyncCount: Int,
        val errorCount: Int,
        val notFoundCount: Int,
        val skippedCount: Int = 0,
    )

    /** Returns true if this anime's mediaType should be skipped based on current filter prefs. */
    private fun shouldSkip(
        mediaType: String,
        skipOVAs: Boolean,
        skipSpecials: Boolean,
        skipMovies: Boolean,
        onlyMain: Boolean,
    ): Boolean {
        if (onlyMain && mediaType != "tv") return true
        if (skipOVAs && mediaType == "ova") return true
        if (skipSpecials && mediaType == "special") return true
        if (skipMovies && mediaType == "movie") return true
        return false
    }

    /** Check if a title is already in Sonarr — tries tvdbId match then fuzzy title match. */
    private fun findInSonarr(
        tvdbId: Int,
        title: String,
        sonarrByTvdbId: Map<Int, SonarrSeries>,
        sonarrAll: List<SonarrSeries>,
    ): SonarrSeries? {
        sonarrByTvdbId[tvdbId]?.let { return it }
        // Fuzzy fallback: check if any Sonarr series title/altTitle is ≥85% similar
        val normSearch = title.lowercase()
        return sonarrAll.firstOrNull { s ->
            val allTitles = listOf(s.title) + s.alternateTitles
            allTitles.any { t -> similarityPct(normSearch, t.lowercase()) >= 85.0 }
        }
    }

    /** Run a full sync: fetch MAL list → look up TVDB IDs → add missing to Sonarr. */
    suspend fun runSync(onProgress: suspend (String) -> Unit = {}): Result<SyncResult> = runCatching {
        onProgress("Fetching Sonarr configuration…")

        val sonarrUrl = prefs.sonarrUrl.first()
        val sonarrApiKey = prefs.sonarrApiKey.first()
        val rootFolder = prefs.sonarrRootFolder.first()
        val qualityProfileId = prefs.sonarrQualityProfileId.first().toIntOrNull() ?: 1
        val tvdbApiKey = prefs.tvdbApiKey.first()
        val syncStatuses = prefs.syncStatuses.first()

        val skipOVAs = prefs.skipOVAs.first()
        val skipSpecials = prefs.skipSpecials.first()
        val skipMovies = prefs.skipMovies.first()
        val onlyMain = prefs.onlyMainSeries.first()
        val scoreBasedMonitoring = prefs.scoreBasedMonitoring.first()
        val scoreHigh = prefs.scoreHighThreshold.first()
        val scoreMed = prefs.scoreMedThreshold.first()

        check(sonarrUrl.isNotBlank()) { "Sonarr URL is not configured" }
        check(sonarrApiKey.isNotBlank()) { "Sonarr API key is not configured" }
        check(tvdbApiKey.isNotBlank()) { "TVDB API key is not configured" }

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
        var newlyAddedCount = 0
        var errorCount = 0
        var notFoundCount = 0
        var skippedCount = 0

        for ((index, anime) in malEntries.withIndex()) {
            onProgress("Processing ${index + 1}/${malEntries.size}: ${anime.title}")

            if (shouldSkip(anime.mediaType, skipOVAs, skipSpecials, skipMovies, onlyMain)) {
                entries.add(SyncEntry(
                    malId = anime.malId, malTitle = anime.title, malStatus = anime.status,
                    imageUrl = anime.imageUrl, tvdbId = null, tvdbTitle = null, sonarrId = null,
                    syncStatus = SyncStatus.SKIPPED, errorMessage = "Filtered by type: ${anime.mediaType}",
                    mediaType = anime.mediaType, score = anime.score, numEpisodes = anime.numEpisodes,
                ))
                skippedCount++
                continue
            }

            val tvdbResult = runCatching { tvdbRepo.searchSeries(tvdbApiKey, anime.title).getOrNull() }

            if (tvdbResult.isFailure) {
                entries.add(SyncEntry(
                    malId = anime.malId, malTitle = anime.title, malStatus = anime.status,
                    imageUrl = anime.imageUrl, tvdbId = null, tvdbTitle = null, sonarrId = null,
                    syncStatus = SyncStatus.ERROR,
                    errorMessage = tvdbResult.exceptionOrNull()?.message ?: "TVDB lookup failed",
                    mediaType = anime.mediaType, score = anime.score, numEpisodes = anime.numEpisodes,
                ))
                errorCount++
                continue
            }

            val tvdb = tvdbResult.getOrNull()
            if (tvdb == null) {
                entries.add(SyncEntry(
                    malId = anime.malId, malTitle = anime.title, malStatus = anime.status,
                    imageUrl = anime.imageUrl, tvdbId = null, tvdbTitle = null, sonarrId = null,
                    syncStatus = SyncStatus.NOT_FOUND, errorMessage = "Not found on TVDB",
                    mediaType = anime.mediaType, score = anime.score, numEpisodes = anime.numEpisodes,
                ))
                notFoundCount++
                continue
            }

            val existingSonarr = findInSonarr(tvdb.tvdbId, tvdb.name, sonarrByTvdbId, sonarrSeries)
            if (existingSonarr != null) {
                entries.add(SyncEntry(
                    malId = anime.malId, malTitle = anime.title, malStatus = anime.status,
                    imageUrl = anime.imageUrl, tvdbId = tvdb.tvdbId, tvdbTitle = tvdb.name,
                    sonarrId = existingSonarr.id, syncStatus = SyncStatus.SYNCED, errorMessage = null,
                    mediaType = anime.mediaType, score = anime.score, numEpisodes = anime.numEpisodes,
                ))
                syncedCount++
                continue
            }

            // Determine monitoring level from score
            val monitoring = if (scoreBasedMonitoring && anime.score > 0) {
                monitoringForScore(anime.score, scoreHigh, scoreMed)
            } else "all"

            val addResult = sonarrRepo.addSeries(
                url = sonarrUrl,
                apiKey = sonarrApiKey,
                tvdbId = tvdb.tvdbId,
                title = tvdb.name,
                rootFolderPath = effectiveRootFolder,
                qualityProfileId = qualityProfileId,
                monitored = monitoring != "none",
            )

            if (addResult.isSuccess) {
                entries.add(SyncEntry(
                    malId = anime.malId, malTitle = anime.title, malStatus = anime.status,
                    imageUrl = anime.imageUrl, tvdbId = tvdb.tvdbId, tvdbTitle = tvdb.name,
                    sonarrId = addResult.getOrNull(), syncStatus = SyncStatus.SYNCED, errorMessage = null,
                    mediaType = anime.mediaType, score = anime.score, numEpisodes = anime.numEpisodes,
                ))
                syncedCount++
                newlyAddedCount++
            } else {
                val errMsg = addResult.exceptionOrNull()?.message ?: "Failed to add to Sonarr"
                val isAlreadyExists = errMsg.contains("already", ignoreCase = true)
                entries.add(SyncEntry(
                    malId = anime.malId, malTitle = anime.title, malStatus = anime.status,
                    imageUrl = anime.imageUrl, tvdbId = tvdb.tvdbId, tvdbTitle = tvdb.name,
                    sonarrId = null,
                    syncStatus = if (isAlreadyExists) SyncStatus.SYNCED else SyncStatus.ERROR,
                    errorMessage = if (isAlreadyExists) null else errMsg,
                    mediaType = anime.mediaType, score = anime.score, numEpisodes = anime.numEpisodes,
                ))
                if (isAlreadyExists) { syncedCount++; newlyAddedCount++ } else errorCount++
            }
        }

        val needSyncCount = entries.count { it.syncStatus == SyncStatus.PENDING }
        saveSyncData(entries)

        // Save history entry
        val historyEntry = SyncHistoryEntry(
            timestampMs = System.currentTimeMillis(),
            totalCount = entries.size,
            syncedCount = syncedCount,
            newlyAddedCount = newlyAddedCount,
            notFoundCount = notFoundCount,
            errorCount = errorCount,
            skippedCount = skippedCount,
        )
        prefs.appendSyncHistory(historyEntry.toJson().toString())

        SyncResult(
            entries = entries,
            totalCount = entries.size,
            syncedCount = syncedCount,
            newlyAddedCount = newlyAddedCount,
            needSyncCount = needSyncCount,
            errorCount = errorCount,
            notFoundCount = notFoundCount,
            skippedCount = skippedCount,
        )
    }

    /**
     * Dry-run: compute what a sync would do without writing anything to Sonarr.
     * Returns [SyncPreview] showing would-add / already-synced / not-found / skipped.
     */
    suspend fun computeSyncPreview(onProgress: suspend (String) -> Unit = {}): Result<SyncPreview> = runCatching {
        onProgress("Fetching configuration…")

        val sonarrUrl = prefs.sonarrUrl.first()
        val sonarrApiKey = prefs.sonarrApiKey.first()
        val tvdbApiKey = prefs.tvdbApiKey.first()
        val syncStatuses = prefs.syncStatuses.first()
        val skipOVAs = prefs.skipOVAs.first()
        val skipSpecials = prefs.skipSpecials.first()
        val skipMovies = prefs.skipMovies.first()
        val onlyMain = prefs.onlyMainSeries.first()

        check(sonarrUrl.isNotBlank()) { "Sonarr URL is not configured" }
        check(sonarrApiKey.isNotBlank()) { "Sonarr API key is not configured" }
        check(tvdbApiKey.isNotBlank()) { "TVDB API key is not configured" }

        onProgress("Fetching Sonarr library…")
        val sonarrSeries = sonarrRepo.getSeries(sonarrUrl, sonarrApiKey).getOrThrow()
        val sonarrByTvdbId = sonarrSeries.associateBy { it.tvdbId }

        onProgress("Fetching MAL list…")
        val malEntries = malRepo.fetchAnimeList(syncStatuses).getOrThrow()

        val toAdd = mutableListOf<Pair<MalAnimeEntry, TvdbSeriesResult>>()
        val alreadySynced = mutableListOf<Pair<MalAnimeEntry, SonarrSeries>>()
        val notFound = mutableListOf<MalAnimeEntry>()
        val skipped = mutableListOf<MalAnimeEntry>()
        val errors = mutableListOf<Pair<MalAnimeEntry, String>>()

        for ((index, anime) in malEntries.withIndex()) {
            onProgress("Checking ${index + 1}/${malEntries.size}: ${anime.title}")

            if (shouldSkip(anime.mediaType, skipOVAs, skipSpecials, skipMovies, onlyMain)) {
                skipped.add(anime)
                continue
            }

            val tvdbResult = runCatching { tvdbRepo.searchSeries(tvdbApiKey, anime.title).getOrNull() }
            if (tvdbResult.isFailure) {
                errors.add(anime to (tvdbResult.exceptionOrNull()?.message ?: "TVDB lookup failed"))
                continue
            }

            val tvdb = tvdbResult.getOrNull()
            if (tvdb == null) {
                notFound.add(anime)
                continue
            }

            val existingSonarr = findInSonarr(tvdb.tvdbId, tvdb.name, sonarrByTvdbId, sonarrSeries)
            if (existingSonarr != null) {
                alreadySynced.add(anime to existingSonarr)
            } else {
                toAdd.add(anime to tvdb)
            }
        }

        SyncPreview(
            toAdd = toAdd,
            alreadySynced = alreadySynced,
            notFound = notFound,
            skipped = skipped,
            errors = errors,
        )
    }

    /**
     * Compute which Sonarr series are NOT in the current MAL sync data.
     * Returns a list of Sonarr series that may be candidates for removal.
     */
    suspend fun computeRemovalDiff(): Result<List<SonarrSeries>> = runCatching {
        val sonarrUrl = prefs.sonarrUrl.first()
        val sonarrApiKey = prefs.sonarrApiKey.first()
        check(sonarrUrl.isNotBlank()) { "Sonarr URL is not configured" }
        check(sonarrApiKey.isNotBlank()) { "Sonarr API key is not configured" }

        val sonarrSeries = sonarrRepo.getSeries(sonarrUrl, sonarrApiKey).getOrThrow()
        val cachedEntries = loadCachedSyncData()
        val syncedTvdbIds = cachedEntries.mapNotNull { it.tvdbId }.toSet()

        sonarrSeries.filter { it.tvdbId !in syncedTvdbIds && it.tvdbId != -1 }
    }

    /** Remove the given Sonarr series IDs. Returns count of successfully removed. */
    suspend fun runRemoval(seriesIds: List<Int>, deleteFiles: Boolean): Result<Int> = runCatching {
        val sonarrUrl = prefs.sonarrUrl.first()
        val sonarrApiKey = prefs.sonarrApiKey.first()
        var removed = 0
        for (id in seriesIds) {
            sonarrRepo.removeSeries(sonarrUrl, sonarrApiKey, id, deleteFiles).onSuccess { removed++ }
        }
        removed
    }

    fun computeStats(entries: List<SyncEntry>) = SyncResult(
        entries = entries,
        totalCount = entries.size,
        syncedCount = entries.count { it.syncStatus == SyncStatus.SYNCED },
        newlyAddedCount = 0,
        needSyncCount = entries.count { it.syncStatus == SyncStatus.PENDING },
        errorCount = entries.count { it.syncStatus == SyncStatus.ERROR },
        notFoundCount = entries.count { it.syncStatus == SyncStatus.NOT_FOUND },
        skippedCount = entries.count { it.syncStatus == SyncStatus.SKIPPED },
    )
}
