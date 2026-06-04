package com.chrisalvis.watashiwomite.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.chrisalvis.watashiwomite.data.SyncEntry
import com.chrisalvis.watashiwomite.data.SyncStatus
import com.chrisalvis.watashiwomite.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun DashboardScreen(vm: DashboardViewModel) {
    val state by vm.uiState.collectAsStateWithLifecycle()
    val isDark = isSystemInDarkTheme()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Dashboard") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                )
            )
        }
    ) { padding ->
        if (state.isLoading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Hero stats
            HeroStatsRow(
                total = state.totalCount,
                synced = state.syncedCount,
                needSync = state.needSyncCount,
                errors = state.errorCount + state.notFoundCount,
                lastSyncMs = state.lastSyncMs,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            // Filter chips
            StatusFilterRow(
                selected = state.filterStatus,
                onSelect = vm::setFilter,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
            )

            if (state.entries.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(Icons.Default.SyncAlt, null, Modifier.size(64.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("No sync data yet", style = MaterialTheme.typography.titleMedium)
                        Text("Go to the Sync tab to run your first sync", style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                return@Scaffold
            }

            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 160.dp),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                val displayEntries = vm.filteredEntries
                items(displayEntries, key = { it.malId }) { entry ->
                    AnimeCard(entry = entry, isDark = isDark)
                }
            }
        }
    }
}

@Composable
private fun HeroStatsRow(
    total: Int,
    synced: Int,
    needSync: Int,
    errors: Int,
    lastSyncMs: Long?,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        lastSyncMs?.let {
            val fmt = SimpleDateFormat("MMM d 'at' HH:mm", Locale.getDefault())
            Text(
                "Last synced: ${fmt.format(Date(it))}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            StatChip("Total", total, MaterialTheme.colorScheme.primary, Modifier.weight(1f))
            StatChip("Synced", synced, Color(0xFF2E7D32), Modifier.weight(1f))
            StatChip("Need Sync", needSync, Color(0xFF1565C0), Modifier.weight(1f))
            StatChip("Errors", errors, MaterialTheme.colorScheme.error, Modifier.weight(1f))
        }
    }
}

@Composable
private fun StatChip(label: String, value: Int, color: Color, modifier: Modifier = Modifier) {
    Surface(
        shape = MaterialTheme.shapes.medium,
        color = color.copy(alpha = 0.12f),
        modifier = modifier,
    ) {
        Column(
            modifier = Modifier.padding(vertical = 10.dp, horizontal = 4.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                value.toString(),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = color,
            )
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = color.copy(alpha = 0.8f),
            )
        }
    }
}

@Composable
private fun StatusFilterRow(
    selected: SyncStatus?,
    onSelect: (SyncStatus?) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        FilterChip(selected = selected == null, onClick = { onSelect(null) }, label = { Text("All") })
        FilterChip(selected = selected == SyncStatus.SYNCED, onClick = { onSelect(SyncStatus.SYNCED) }, label = { Text("Synced") })
        FilterChip(selected = selected == SyncStatus.ERROR, onClick = { onSelect(SyncStatus.ERROR) }, label = { Text("Errors") })
        FilterChip(selected = selected == SyncStatus.NOT_FOUND, onClick = { onSelect(SyncStatus.NOT_FOUND) }, label = { Text("Not Found") })
    }
}

@Composable
fun AnimeCard(entry: SyncEntry, isDark: Boolean) {
    val statusColor = when (entry.syncStatus) {
        SyncStatus.SYNCED -> if (isDark) StatusSyncedDark else StatusSynced
        SyncStatus.NOT_FOUND -> if (isDark) StatusNotFoundDark else StatusNotFound
        SyncStatus.ERROR -> if (isDark) StatusErrorDark else StatusError
        SyncStatus.PENDING -> if (isDark) StatusPendingDark else StatusPending
    }

    val statusIcon = when (entry.syncStatus) {
        SyncStatus.SYNCED -> Icons.Default.CheckCircle
        SyncStatus.NOT_FOUND -> Icons.Default.SearchOff
        SyncStatus.ERROR -> Icons.Default.Error
        SyncStatus.PENDING -> Icons.Default.Schedule
    }

    val statusLabel = when (entry.syncStatus) {
        SyncStatus.SYNCED -> "Synced"
        SyncStatus.NOT_FOUND -> "Not Found"
        SyncStatus.ERROR -> "Error"
        SyncStatus.PENDING -> "Pending"
    }

    Card(
        shape = MaterialTheme.shapes.medium,
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Column {
            Box(modifier = Modifier.fillMaxWidth().aspectRatio(3f / 4f)) {
                if (entry.imageUrl.isNotBlank()) {
                    AsyncImage(
                        model = entry.imageUrl,
                        contentDescription = entry.malTitle,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = MaterialTheme.colorScheme.surfaceVariant,
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Tv, null, modifier = Modifier.size(40.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                // Status badge overlay
                Surface(
                    shape = MaterialTheme.shapes.small,
                    color = statusColor.copy(alpha = 0.9f),
                    modifier = Modifier.align(Alignment.TopEnd).padding(6.dp),
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Icon(statusIcon, null, modifier = Modifier.size(10.dp), tint = Color.White)
                        Text(statusLabel, style = MaterialTheme.typography.labelSmall, color = Color.White,
                            fontWeight = FontWeight.SemiBold)
                    }
                }
            }
            Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    entry.malTitle,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                if (entry.errorMessage != null) {
                    Text(
                        entry.errorMessage,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.error,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                } else if (entry.tvdbTitle != null && entry.tvdbTitle != entry.malTitle) {
                    Text(
                        "→ ${entry.tvdbTitle}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}
