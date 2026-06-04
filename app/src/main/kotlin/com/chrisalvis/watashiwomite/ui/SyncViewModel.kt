package com.chrisalvis.watashiwomite.ui

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chrisalvis.watashiwomite.data.AppPreferences
import com.chrisalvis.watashiwomite.data.SyncRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

data class SyncUiState(
    val selectedStatuses: Set<String> = AppPreferences.DEFAULT_STATUSES,
    val isSyncing: Boolean = false,
    val syncProgress: String = "",
    val lastResult: String? = null,
    val lastResultSuccess: Boolean? = null,
    val totalCount: Int = 0,
    val syncedCount: Int = 0,
    val errorCount: Int = 0,
    val notFoundCount: Int = 0,
)

val MAL_STATUSES = listOf(
    "watching" to "Watching",
    "completed" to "Completed",
    "on_hold" to "On Hold",
    "dropped" to "Dropped",
    "plan_to_watch" to "Plan to Watch",
)

class SyncViewModel(private val context: Context) : ViewModel() {

    private val prefs = AppPreferences(context)
    private val syncRepo = SyncRepository(context)

    private val _uiState = MutableStateFlow(SyncUiState())
    val uiState: StateFlow<SyncUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val statuses = prefs.syncStatuses.first()
            _uiState.value = _uiState.value.copy(selectedStatuses = statuses)
        }
    }

    fun toggleStatus(status: String) {
        val current = _uiState.value.selectedStatuses.toMutableSet()
        if (status in current) current.remove(status) else current.add(status)
        _uiState.value = _uiState.value.copy(selectedStatuses = current)
        viewModelScope.launch { prefs.setSyncStatuses(current) }
    }

    fun runSync(onComplete: () -> Unit = {}) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isSyncing = true,
                syncProgress = "Starting sync…",
                lastResult = null,
                lastResultSuccess = null,
            )

            val result = syncRepo.runSync { progress ->
                _uiState.value = _uiState.value.copy(syncProgress = progress)
            }

            if (result.isSuccess) {
                val data = result.getOrThrow()
                _uiState.value = _uiState.value.copy(
                    isSyncing = false,
                    syncProgress = "",
                    lastResult = "Sync complete: ${data.syncedCount} synced, ${data.notFoundCount + data.errorCount} issues",
                    lastResultSuccess = true,
                    totalCount = data.totalCount,
                    syncedCount = data.syncedCount,
                    errorCount = data.errorCount,
                    notFoundCount = data.notFoundCount,
                )
            } else {
                _uiState.value = _uiState.value.copy(
                    isSyncing = false,
                    syncProgress = "",
                    lastResult = result.exceptionOrNull()?.message ?: "Sync failed",
                    lastResultSuccess = false,
                )
            }
            onComplete()
        }
    }
}
