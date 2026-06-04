package com.chrisalvis.watashiwomite.ui

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chrisalvis.watashiwomite.data.AppPreferences
import com.chrisalvis.watashiwomite.data.SyncEntry
import com.chrisalvis.watashiwomite.data.SyncHistoryEntry
import com.chrisalvis.watashiwomite.data.SyncRepository
import com.chrisalvis.watashiwomite.data.SyncStatus
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
)

class DashboardViewModel(private val context: Context) : ViewModel() {

    private val prefs = AppPreferences(context)
    private val syncRepo = SyncRepository(context)

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
            )
        }
    }

    fun setFilter(status: SyncStatus?) {
        _uiState.value = _uiState.value.copy(filterStatus = status)
    }

    val filteredEntries: List<SyncEntry> get() {
        val filter = _uiState.value.filterStatus ?: return _uiState.value.entries
        return _uiState.value.entries.filter { it.syncStatus == filter }
    }
}
