package com.chrisalvis.watashiwomite.ui

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chrisalvis.watashiwomite.data.AppPreferences
import com.chrisalvis.watashiwomite.data.SonarrRepository
import com.chrisalvis.watashiwomite.data.SonarrSeries
import com.chrisalvis.watashiwomite.data.SyncEntry
import com.chrisalvis.watashiwomite.data.SyncHistoryEntry
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
    val entries: List<SyncEntry> = emptyList(),
    val totalCount: Int = 0,
    val syncedCount: Int = 0,
    val needSyncCount: Int = 0,
    val errorCount: Int = 0,
    val notFoundCount: Int = 0,
    val skippedCount: Int = 0,
    val lastSyncMs: Long? = null,
    val filterStatus: SyncStatus? = null,
    val syncHistory: List<SyncHistoryEntry> = emptyList(),
    // Sonarr live stats: keyed by tvdbId
    val sonarrStats: Map<Int, SonarrSeries> = emptyMap(),
    // Manual TVDB match dialog state
    val manualOverrides: Map<Int, Pair<Int, String>> = emptyMap(),
    val matchTarget: SyncEntry? = null,
    val isSearching: Boolean = false,
    val searchResults: List<TvdbSeriesResult> = emptyList(),
    val searchError: String? = null,
)

class DashboardViewModel(private val context: Context) : ViewModel() {

    private val prefs = AppPreferences(context)
    private val syncRepo = SyncRepository(context)
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
            val history = syncRepo.loadSyncHistory()
            val overrides = prefs.getManualTvdbOverrides()
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
                syncHistory = history,
                manualOverrides = overrides,
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
        val filter = _uiState.value.filterStatus ?: return _uiState.value.entries
        return _uiState.value.entries.filter { it.syncStatus == filter }
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
}
