package com.chrisalvis.watashiwomite.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chrisalvis.watashiwomite.data.SyncPreview

@Composable
fun SyncScreen(vm: SyncViewModel, onSyncComplete: () -> Unit) {
    val state by vm.uiState.collectAsStateWithLifecycle()
    var showRemovalSection by remember { mutableStateOf(false) }

    // Preview dialog
    if (state.showPreviewDialog) {
        state.syncPreview?.let { preview ->
            SyncPreviewDialog(
                preview = preview,
                onDismiss = vm::dismissPreview,
                onConfirm = { vm.confirmPreviewAndSync(onSyncComplete) },
            )
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Sync") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            // ── List selection ────────────────────────────────────────────────
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            ) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        "MAL Lists to Sync",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        "Select which lists to sync to Sonarr.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    HorizontalDivider()
                    MAL_STATUSES.forEach { (key, label) ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(label, style = MaterialTheme.typography.bodyMedium)
                            Switch(
                                checked = key in state.selectedStatuses,
                                onCheckedChange = { vm.toggleStatus(key) },
                                enabled = !state.isSyncing,
                            )
                        }
                    }
                }
            }

            // ── Sync + Preview buttons ────────────────────────────────────────
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(
                    onClick = vm::previewSync,
                    enabled = !state.isSyncing && !state.isPreviewing && state.selectedStatuses.isNotEmpty(),
                    modifier = Modifier.weight(1f).height(56.dp),
                ) {
                    if (state.isPreviewing) {
                        CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                    } else {
                        Icon(Icons.Default.Visibility, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Preview", fontWeight = FontWeight.Medium)
                    }
                }
                Button(
                    onClick = { vm.runSync { onSyncComplete() } },
                    enabled = !state.isSyncing && !state.isPreviewing && state.selectedStatuses.isNotEmpty(),
                    modifier = Modifier.weight(2f).height(56.dp),
                ) {
                    if (state.isSyncing) {
                        CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                        Spacer(Modifier.width(12.dp))
                        Text("Syncing…")
                    } else {
                        Icon(Icons.Default.Sync, null, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Sync Now", fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            // Preview progress
            if (state.isPreviewing && state.previewProgress.isNotBlank()) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                        Text(state.previewProgress, style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSecondaryContainer)
                    }
                }
            }

            // ── Progress ──────────────────────────────────────────────────────
            if (state.isSyncing && state.syncProgress.isNotBlank()) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                        Text(state.syncProgress, style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onPrimaryContainer)
                    }
                }
            }

            // ── Last result ───────────────────────────────────────────────────
            state.lastResult?.let { msg ->
                val success = state.lastResultSuccess == true
                ResultCard(msg, success)
            }

            // ── Stats after sync ──────────────────────────────────────────────
            if (state.totalCount > 0) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = CardDefaults.outlinedCardBorder(),
                ) {
                    Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Last Sync Results", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        SyncStatRow("Total anime", state.totalCount)
                        SyncStatRow("Synced to Sonarr", state.syncedCount)
                        SyncStatRow("Newly added", state.newlyAddedCount)
                        SyncStatRow("Not found on TVDB", state.notFoundCount)
                        SyncStatRow("Errors", state.errorCount)
                        if (state.skippedCount > 0) SyncStatRow("Skipped (filtered)", state.skippedCount)
                    }
                }

                // ── Post-sync batch actions ───────────────────────────────────
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = CardDefaults.outlinedCardBorder(),
                ) {
                    Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Sonarr Actions", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedButton(
                                onClick = vm::searchMissing,
                                enabled = !state.isRunningCommand,
                                modifier = Modifier.weight(1f),
                            ) {
                                Icon(Icons.Default.Search, null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Search Missing", style = MaterialTheme.typography.labelMedium)
                            }
                            OutlinedButton(
                                onClick = vm::refreshMetadata,
                                enabled = !state.isRunningCommand,
                                modifier = Modifier.weight(1f),
                            ) {
                                Icon(Icons.Default.Refresh, null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Refresh Metadata", style = MaterialTheme.typography.labelMedium)
                            }
                        }
                        if (state.isRunningCommand) {
                            LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                        }
                        state.commandResult?.let { ResultCard(it, !it.contains("failed", ignoreCase = true)) }
                    }
                }
            }

            // ── Remove from Sonarr section ────────────────────────────────────
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = CardDefaults.outlinedCardBorder(),
            ) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text("Remove from Sonarr", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        IconButton(onClick = { showRemovalSection = !showRemovalSection }) {
                            Icon(if (showRemovalSection) Icons.Default.ExpandLess else Icons.Default.ExpandMore, null)
                        }
                    }

                    if (showRemovalSection) {
                        Text(
                            "Find Sonarr series that are NOT in your current MAL sync data. " +
                            "Only runs after a sync has been performed.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )

                        OutlinedButton(
                            onClick = vm::previewRemoval,
                            enabled = !state.isLoadingRemovalDiff && !state.isSyncing,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            if (state.isLoadingRemovalDiff) {
                                CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
                                Spacer(Modifier.width(8.dp))
                            } else {
                                Icon(Icons.Default.Visibility, null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(8.dp))
                            }
                            Text("Preview Candidates")
                        }

                        if (state.removalDiff.isNotEmpty()) {
                            Text(
                                "${state.removalDiff.size} series found not in your MAL sync data:",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                TextButton(onClick = vm::selectAllForRemoval) { Text("Select All") }
                                TextButton(onClick = vm::clearRemovalSelection) { Text("Clear") }
                            }
                            state.removalDiff.forEach { series ->
                                val checked = series.id in state.selectedForRemoval
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Text(series.title, style = MaterialTheme.typography.bodyMedium,
                                        modifier = Modifier.weight(1f))
                                    Checkbox(checked = checked, onCheckedChange = { vm.toggleRemovalSelection(series.id) })
                                }
                            }

                            HorizontalDivider()

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text("Delete files from disk", style = MaterialTheme.typography.bodySmall)
                                Switch(checked = state.deleteFiles, onCheckedChange = vm::setDeleteFiles)
                            }

                            Button(
                                onClick = vm::executeRemoval,
                                enabled = state.selectedForRemoval.isNotEmpty() && !state.isRemoving,
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                if (state.isRemoving) {
                                    CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onError)
                                    Spacer(Modifier.width(8.dp))
                                } else {
                                    Icon(Icons.Default.Delete, null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(8.dp))
                                }
                                Text("Remove ${state.selectedForRemoval.size} Selected", color = MaterialTheme.colorScheme.onError)
                            }
                        }

                        state.removalResult?.let { ResultCard(it, !it.lowercase().contains("fail")) }
                    }
                }
            }
        }
    }
}

@Composable
private fun ResultCard(message: String, success: Boolean) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (success) MaterialTheme.colorScheme.primaryContainer
                            else MaterialTheme.colorScheme.errorContainer
        ),
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Icon(
                if (success) Icons.Default.CheckCircle else Icons.Default.Error, null,
                tint = if (success) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
            )
            Text(
                message, style = MaterialTheme.typography.bodyMedium,
                color = if (success) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onErrorContainer,
            )
        }
    }
}

@Composable
private fun SyncStatRow(label: String, value: Int) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value.toString(), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun SyncPreviewDialog(
    preview: SyncPreview,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { Icon(Icons.Default.Visibility, null) },
        title = { Text("Sync Preview") },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    "Here's what will happen when you sync:",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                // Summary stats
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        PreviewStatRow("Would be added to Sonarr", preview.toAdd.size, MaterialTheme.colorScheme.primary)
                        PreviewStatRow("Already in Sonarr", preview.alreadySynced.size, MaterialTheme.colorScheme.secondary)
                        PreviewStatRow("Not found on TVDB", preview.notFound.size, MaterialTheme.colorScheme.error)
                        if (preview.skipped.isNotEmpty()) {
                            PreviewStatRow("Filtered/skipped", preview.skipped.size, MaterialTheme.colorScheme.outline)
                        }
                        if (preview.errors.isNotEmpty()) {
                            PreviewStatRow("Lookup errors", preview.errors.size, MaterialTheme.colorScheme.error)
                        }
                    }
                }

                // Would-be-added list (max 10 shown)
                if (preview.toAdd.isNotEmpty()) {
                    Text(
                        "Would add (${preview.toAdd.size}):",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    preview.toAdd.take(10).forEach { (mal, tvdb) ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(
                                mal.title,
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.weight(1f),
                                maxLines = 1,
                            )
                            if (tvdb.name != mal.title) {
                                Text(
                                    "→ ${tvdb.name}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1,
                                )
                            }
                        }
                    }
                    if (preview.toAdd.size > 10) {
                        Text(
                            "… and ${preview.toAdd.size - 10} more",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }

                // Not-found list (max 5 shown)
                if (preview.notFound.isNotEmpty()) {
                    Text(
                        "Not found on TVDB (${preview.notFound.size}):",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.error,
                    )
                    preview.notFound.take(5).forEach { mal ->
                        Text("• ${mal.title}", style = MaterialTheme.typography.bodySmall)
                    }
                    if (preview.notFound.size > 5) {
                        Text(
                            "… and ${preview.notFound.size - 5} more",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = onConfirm, enabled = preview.toAdd.isNotEmpty()) {
                Icon(Icons.Default.Sync, null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("Sync Now (${preview.toAdd.size} new)")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

@Composable
private fun PreviewStatRow(label: String, value: Int, color: androidx.compose.ui.graphics.Color) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodySmall)
        Text(
            value.toString(),
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.Bold,
            color = color,
        )
    }
}
