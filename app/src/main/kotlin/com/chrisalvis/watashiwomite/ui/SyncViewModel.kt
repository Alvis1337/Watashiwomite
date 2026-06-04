package com.chrisalvis.watashiwomite.ui

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chrisalvis.watashiwomite.data.AppPreferences
import com.chrisalvis.watashiwomite.data.SonarrRepository
import com.chrisalvis.watashiwomite.data.SonarrSeries
import com.chrisalvis.watashiwomite.data.SyncPreview
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
    val newlyAddedCount: Int = 0,
    val errorCount: Int = 0,
    val notFoundCount: Int = 0,
    val skippedCount: Int = 0,
    // Removal diff state
    val isLoadingRemovalDiff: Boolean = false,
    val removalDiff: List<SonarrSeries> = emptyList(),
    val selectedForRemoval: Set<Int> = emptySet(),
    val isRemoving: Boolean = false,
    val deleteFiles: Boolean = false,
    val removalResult: String? = null,
    // Batch action state
    val isRunningCommand: Boolean = false,
    val commandResult: String? = null,
    // Preview mode state
    val isPreviewing: Boolean = false,
    val previewProgress: String = "",
    val syncPreview: SyncPreview? = null,
    val showPreviewDialog: Boolean = false,
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
    private val sonarrRepo = SonarrRepository()

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
                commandResult = null,
                removalResult = null,
            )

            val result = syncRepo.runSync { progress ->
                _uiState.value = _uiState.value.copy(syncProgress = progress)
            }

            if (result.isSuccess) {
                val data = result.getOrThrow()
                _uiState.value = _uiState.value.copy(
                    isSyncing = false,
                    syncProgress = "",
                    lastResult = "Sync complete: ${data.syncedCount} synced " +
                        "(${data.newlyAddedCount} new), ${data.notFoundCount + data.errorCount} issues",
                    lastResultSuccess = true,
                    totalCount = data.totalCount,
                    syncedCount = data.syncedCount,
                    newlyAddedCount = data.newlyAddedCount,
                    errorCount = data.errorCount,
                    notFoundCount = data.notFoundCount,
                    skippedCount = data.skippedCount,
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

    fun previewRemoval() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoadingRemovalDiff = true,
                removalDiff = emptyList(),
                selectedForRemoval = emptySet(),
                removalResult = null,
            )
            val result = syncRepo.computeRemovalDiff()
            _uiState.value = _uiState.value.copy(
                isLoadingRemovalDiff = false,
                removalDiff = result.getOrDefault(emptyList()),
                removalResult = result.exceptionOrNull()?.message,
            )
        }
    }

    fun toggleRemovalSelection(seriesId: Int) {
        val current = _uiState.value.selectedForRemoval.toMutableSet()
        if (seriesId in current) current.remove(seriesId) else current.add(seriesId)
        _uiState.value = _uiState.value.copy(selectedForRemoval = current)
    }

    fun selectAllForRemoval() {
        _uiState.value = _uiState.value.copy(
            selectedForRemoval = _uiState.value.removalDiff.map { it.id }.toSet()
        )
    }

    fun clearRemovalSelection() {
        _uiState.value = _uiState.value.copy(selectedForRemoval = emptySet())
    }

    fun setDeleteFiles(v: Boolean) {
        _uiState.value = _uiState.value.copy(deleteFiles = v)
    }

    fun executeRemoval() {
        val ids = _uiState.value.selectedForRemoval.toList()
        if (ids.isEmpty()) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRemoving = true, removalResult = null)
            val result = syncRepo.runRemoval(ids, _uiState.value.deleteFiles)
            val removed = result.getOrDefault(0)
            _uiState.value = _uiState.value.copy(
                isRemoving = false,
                removalResult = if (result.isSuccess) "Removed $removed series from Sonarr"
                                else result.exceptionOrNull()?.message ?: "Removal failed",
                removalDiff = _uiState.value.removalDiff.filter { it.id !in ids },
                selectedForRemoval = emptySet(),
            )
        }
    }

    fun searchMissing() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRunningCommand = true, commandResult = null)
            val url = prefs.sonarrUrl.first()
            val apiKey = prefs.sonarrApiKey.first()
            val result = sonarrRepo.sendCommand(url, apiKey, "MissingEpisodeSearch")
            _uiState.value = _uiState.value.copy(
                isRunningCommand = false,
                commandResult = if (result.isSuccess) "Missing episode search started"
                                else result.exceptionOrNull()?.message ?: "Command failed",
            )
        }
    }

    fun refreshMetadata() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRunningCommand = true, commandResult = null)
            val url = prefs.sonarrUrl.first()
            val apiKey = prefs.sonarrApiKey.first()
            val result = sonarrRepo.sendCommand(url, apiKey, "RefreshSeries")
            _uiState.value = _uiState.value.copy(
                isRunningCommand = false,
                commandResult = if (result.isSuccess) "Refresh metadata started"
                                else result.exceptionOrNull()?.message ?: "Command failed",
            )
        }
    }

    fun previewSync() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isPreviewing = true,
                previewProgress = "Starting preview…",
                syncPreview = null,
                showPreviewDialog = false,
            )
            val result = syncRepo.computeSyncPreview { progress ->
                _uiState.value = _uiState.value.copy(previewProgress = progress)
            }
            _uiState.value = _uiState.value.copy(
                isPreviewing = false,
                previewProgress = "",
                syncPreview = result.getOrNull(),
                showPreviewDialog = result.isSuccess,
                lastResult = if (result.isFailure) result.exceptionOrNull()?.message ?: "Preview failed" else _uiState.value.lastResult,
                lastResultSuccess = if (result.isFailure) false else _uiState.value.lastResultSuccess,
            )
        }
    }

    fun dismissPreview() {
        _uiState.value = _uiState.value.copy(showPreviewDialog = false)
    }

    fun confirmPreviewAndSync(onComplete: () -> Unit = {}) {
        _uiState.value = _uiState.value.copy(showPreviewDialog = false)
        runSync(onComplete)
    }
}
