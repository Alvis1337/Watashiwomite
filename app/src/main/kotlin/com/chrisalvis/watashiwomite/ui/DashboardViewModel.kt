package com.chrisalvis.watashiwomite.ui

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chrisalvis.watashiwomite.data.AppPreferences
import com.chrisalvis.watashiwomite.data.MalRepository
import com.chrisalvis.watashiwomite.data.SonarrRepository
import com.chrisalvis.watashiwomite.data.SonarrSeries
import com.chrisalvis.watashiwomite.data.SyncEntry
import com.chrisalvis.watashiwomite.data.SyncRepository
import com.chrisalvis.watashiwomite.data.SyncStatus
import com.chrisalvis.watashiwomite.data.TvdbRepository
import com.chrisalvis.watashiwomite.data.TvdbSeriesResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

data class DashboardUiState(
    val isLoading: Boolean = true,
    val isSyncing: Boolean = false,
    val entries: List<SyncEntry> = emptyList(),
    val totalCount: Int = 0,
    val syncedCount: Int = 0,
    val needSyncCount: Int = 0,
    val errorCount: Int = 0,
    val notFoundCount: Int = 0,
    val skippedCount: Int = 0,
    val lastSyncMs: Long? = null,
    val filterStatus: SyncStatus? = null,
    val filterNeedsAttention: Boolean = false,
    val searchQuery: String = "",
    // Sonarr live stats: keyed by tvdbId
    val sonarrStats: Map<Int, SonarrSeries> = emptyMap(),
    val sonarrUrl: String = "",
    // Manual TVDB match dialog state
    val manualOverrides: Map<Int, Pair<Int, String>> = emptyMap(),
    val matchTarget: SyncEntry? = null,
    val isSearching: Boolean = false,
    val searchResults: List<TvdbSeriesResult> = emptyList(),
    val searchError: String? = null,
    // Detail sheet state
    val selectedEntry: SyncEntry? = null,
    // Inline action feedback
    val actionInProgress: Int? = null,
    val toastMessage: String? = null,
) {
    /** Entries that are done on MAL but still actively monitored in Sonarr. */
    val needsAttentionEntries: List<SyncEntry> get() = entries.filter { entry ->
        entry.syncStatus == SyncStatus.SYNCED &&
            entry.monitored &&
            (entry.malStatus == "completed" || entry.malStatus == "dropped")
    }

    val needsAttentionCount: Int get() = needsAttentionEntries.size
}

class DashboardViewModel(private val context: Context) : ViewModel() {

    private val prefs = AppPreferences(context)
    private val syncRepo = SyncRepository(context)
    private val malRepo = MalRepository(context)
    private val sonarrRepo = SonarrRepository()
    private val tvdbRepo = TvdbRepository()

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        loadCachedData()
    }

    fun loadCachedData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val entries = syncRepo.loadCachedSyncData()
            val lastSyncStr = prefs.lastSyncMs.first()
            val lastSyncMs = lastSyncStr.toLongOrNull()
            val stats = syncRepo.computeStats(entries)
            val overrides = prefs.getManualTvdbOverrides()
            val sonarrUrl = prefs.sonarrUrl.first()
            _uiState.value = DashboardUiState(
                isLoading = false,
                entries = entries,
                totalCount = stats.totalCount,
                syncedCount = stats.syncedCount,
                needSyncCount = stats.needSyncCount,
                errorCount = stats.errorCount,
                notFoundCount = stats.notFoundCount,
                skippedCount = stats.skippedCount,
                lastSyncMs = lastSyncMs,
                manualOverrides = overrides,
                sonarrUrl = sonarrUrl,
            )
            // Background: fetch live Sonarr stats
            fetchSonarrStats()
        }
    }

    private fun fetchSonarrStats() {
        viewModelScope.launch {
            val url = prefs.sonarrUrl.first()
            val apiKey = prefs.sonarrApiKey.first()
            if (url.isBlank() || apiKey.isBlank()) return@launch
            sonarrRepo.getSeries(url, apiKey).getOrNull()?.let { series ->
                _uiState.value = _uiState.value.copy(
                    sonarrStats = series.associateBy { it.tvdbId }
                )
            }
        }
    }

    fun setFilter(status: SyncStatus?) {
        _uiState.value = _uiState.value.copy(filterStatus = status)
    }

    val filteredEntries: List<SyncEntry> get() {
        val state = _uiState.value
        var list = state.entries
        if (state.filterNeedsAttention) return state.needsAttentionEntries
            .let { if (state.searchQuery.isBlank()) it else it.filter { e -> e.malTitle.contains(state.searchQuery, ignoreCase = true) } }
        if (state.filterStatus != null) list = list.filter { it.syncStatus == state.filterStatus }
        if (state.searchQuery.isNotBlank()) list = list.filter { it.malTitle.contains(state.searchQuery, ignoreCase = true) }
        return list
    }

    fun setSearchQuery(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
    }

    fun setFilterNeedsAttention(on: Boolean) {
        _uiState.value = _uiState.value.copy(
            filterNeedsAttention = on,
            filterStatus = if (on) null else _uiState.value.filterStatus,
        )
    }

    fun quickSync() {
        if (_uiState.value.isSyncing) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSyncing = true)
            val result = syncRepo.runSync()
            loadCachedData()
            val msg = result.fold(
                onSuccess = { r -> "Sync done — ${r.newlyAddedCount} added, ${r.syncedCount} synced" },
                onFailure = { "Sync failed: ${it.message}" },
            )
            _uiState.value = _uiState.value.copy(isSyncing = false, toastMessage = msg)
        }
    }

    // ── Manual TVDB matching ───────────────────────────────────────────────────

    fun openMatchDialog(entry: SyncEntry) {
        _uiState.value = _uiState.value.copy(
            matchTarget = entry,
            searchResults = emptyList(),
            searchError = null,
            isSearching = false,
        )
    }

    fun dismissMatchDialog() {
        _uiState.value = _uiState.value.copy(
            matchTarget = null,
            searchResults = emptyList(),
            searchError = null,
        )
    }

    fun searchManualTvdb(query: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSearching = true, searchError = null)
            val tvdbApiKey = prefs.tvdbApiKey.first()
            val result = tvdbRepo.searchSeriesAll(tvdbApiKey, query)
            _uiState.value = _uiState.value.copy(
                isSearching = false,
                searchResults = result.getOrNull() ?: emptyList(),
                searchError = if (result.isFailure) result.exceptionOrNull()?.message else null,
            )
        }
    }

    fun saveManualOverride(malId: Int, tvdbResult: TvdbSeriesResult) {
        viewModelScope.launch {
            prefs.setManualTvdbOverride(malId, tvdbResult.tvdbId, tvdbResult.name)
            val updated = prefs.getManualTvdbOverrides()
            _uiState.value = _uiState.value.copy(
                manualOverrides = updated,
                matchTarget = null,
                searchResults = emptyList(),
            )
        }
    }

    fun clearManualOverride(malId: Int) {
        viewModelScope.launch {
            prefs.clearManualTvdbOverride(malId)
            val updated = prefs.getManualTvdbOverrides()
            _uiState.value = _uiState.value.copy(manualOverrides = updated)
        }
    }

    fun openDetail(entry: SyncEntry) {
        _uiState.value = _uiState.value.copy(selectedEntry = entry)
    }

    fun dismissDetail() {
        _uiState.value = _uiState.value.copy(selectedEntry = null)
    }

    fun clearToast() {
        _uiState.value = _uiState.value.copy(toastMessage = null)
    }

    // ── Sonarr monitoring toggle ───────────────────────────────────────────────

    fun toggleMonitoring(entry: SyncEntry) {
        val sonarrId = entry.sonarrId ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(actionInProgress = entry.malId)
            val url = prefs.sonarrUrl.first()
            val apiKey = prefs.sonarrApiKey.first()
            val newMonitored = !entry.monitored
            val result = sonarrRepo.setMonitored(url, apiKey, sonarrId, newMonitored)
            if (result.isSuccess) {
                val updated = entry.copy(monitored = newMonitored)
                syncRepo.updateCachedEntry(updated)
                val updatedEntries = _uiState.value.entries.map {
                    if (it.malId == entry.malId) updated else it
                }
                _uiState.value = _uiState.value.copy(
                    entries = updatedEntries,
                    selectedEntry = updated,
                    actionInProgress = null,
                    toastMessage = if (newMonitored) "Monitoring enabled in Sonarr" else "Monitoring disabled in Sonarr",
                )
            } else {
                _uiState.value = _uiState.value.copy(
                    actionInProgress = null,
                    toastMessage = "Failed: ${result.exceptionOrNull()?.message}",
                )
            }
        }
    }

    // ── Sonarr season monitoring toggle ───────────────────────────────────────

    fun toggleSeasonMonitoring(entry: SyncEntry, seasonNumber: Int, currentlyMonitored: Boolean) {
        val sonarrId = entry.sonarrId ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(actionInProgress = entry.malId)
            val url = prefs.sonarrUrl.first()
            val apiKey = prefs.sonarrApiKey.first()
            val newMonitored = !currentlyMonitored
            val result = sonarrRepo.setSeasonMonitored(url, apiKey, sonarrId, seasonNumber, newMonitored)
            if (result.isSuccess) {
                val updatedStats = _uiState.value.sonarrStats.toMutableMap()
                updatedStats[entry.tvdbId]?.let { series ->
                    updatedStats[entry.tvdbId] = series.copy(
                        seasons = series.seasons.map { s ->
                            if (s.seasonNumber == seasonNumber) s.copy(monitored = newMonitored) else s
                        }
                    )
                }
                _uiState.value = _uiState.value.copy(
                    sonarrStats = updatedStats,
                    actionInProgress = null,
                    toastMessage = if (newMonitored) "Season $seasonNumber monitoring enabled" else "Season $seasonNumber monitoring disabled",
                )
            } else {
                _uiState.value = _uiState.value.copy(
                    actionInProgress = null,
                    toastMessage = "Failed: ${result.exceptionOrNull()?.message}",
                )
            }
        }
    }

    // ── MAL list status update ─────────────────────────────────────────────────

    fun updateMalStatus(entry: SyncEntry, newStatus: String) {
        if (newStatus == entry.malStatus) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(actionInProgress = entry.malId)
            val malResult = malRepo.updateListStatus(entry.malId, newStatus)
            if (malResult.isFailure) {
                _uiState.value = _uiState.value.copy(
                    actionInProgress = null,
                    toastMessage = "Failed: ${malResult.exceptionOrNull()?.message}",
                )
                return@launch
            }

            var updated = entry.copy(malStatus = newStatus)
            val label = newStatus.replace("_", " ").replaceFirstChar { it.uppercase() }
            var toast = "MAL status → $label"

            // Auto-unmonitor in Sonarr when marking completed or dropped
            val shouldUnmonitor = (newStatus == "completed" || newStatus == "dropped")
                && entry.sonarrId != null
                && entry.monitored
            if (shouldUnmonitor) {
                val url = prefs.sonarrUrl.first()
                val apiKey = prefs.sonarrApiKey.first()
                val unmonitorResult = sonarrRepo.setMonitored(url, apiKey, entry.sonarrId!!, false)
                if (unmonitorResult.isSuccess) {
                    updated = updated.copy(monitored = false)
                    toast = "Marked $label · unmonitored in Sonarr"
                }
            }

            syncRepo.updateCachedEntry(updated)
            val updatedEntries = _uiState.value.entries.map {
                if (it.malId == entry.malId) updated else it
            }
            _uiState.value = _uiState.value.copy(
                entries = updatedEntries,
                selectedEntry = updated,
                actionInProgress = null,
                toastMessage = toast,
            )
        }
    }
}
