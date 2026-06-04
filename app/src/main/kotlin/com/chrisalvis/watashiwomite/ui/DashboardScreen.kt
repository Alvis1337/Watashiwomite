package com.chrisalvis.watashiwomite.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import com.chrisalvis.watashiwomite.data.SonarrSeries
import com.chrisalvis.watashiwomite.data.SyncEntry
import com.chrisalvis.watashiwomite.data.SyncHistoryEntry
import com.chrisalvis.watashiwomite.data.SyncStatus
import com.chrisalvis.watashiwomite.data.TvdbSeriesResult
import com.chrisalvis.watashiwomite.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun DashboardScreen(vm: DashboardViewModel) {
    val state by vm.uiState.collectAsStateWithLifecycle()
    val isDark = isSystemInDarkTheme()

    // Manual match dialog
    state.matchTarget?.let { target ->
        ManualMatchDialog(
            entry = target,
            isSearching = state.isSearching,
            results = state.searchResults,
            searchError = state.searchError,
            hasOverride = state.manualOverrides.containsKey(target.malId),
            onSearch = vm::searchManualTvdb,
            onSelect = { vm.saveManualOverride(target.malId, it) },
            onClearOverride = { vm.clearManualOverride(target.malId) },
            onDismiss = vm::dismissMatchDialog,
        )
    }

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
                skipped = state.skippedCount,
                lastSyncMs = state.lastSyncMs,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            // Filter chips
            StatusFilterRow(
                selected = state.filterStatus,
                onSelect = vm::setFilter,
                hasSkipped = state.skippedCount > 0,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
            )

            if (state.entries.isEmpty()) {
                // Sync history if we have it but no entries
                if (state.syncHistory.isNotEmpty()) {
                    SyncHistorySection(history = state.syncHistory, modifier = Modifier.padding(16.dp))
                }
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
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 16.dp, top = 4.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                // Sync history header (as a first full-width item shown at top)
                if (state.syncHistory.isNotEmpty()) {
                    item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(maxLineSpan) }) {
                        SyncHistorySection(history = state.syncHistory.take(5))
                    }
                }
                val displayEntries = vm.filteredEntries
                items(displayEntries, key = { it.malId }) { entry ->
                    AnimeCard(
                        entry = entry,
                        isDark = isDark,
                        sonarrStats = state.sonarrStats[entry.tvdbId],
                        hasManualOverride = state.manualOverrides.containsKey(entry.malId),
                        onFixMatch = if (entry.syncStatus == SyncStatus.NOT_FOUND || entry.syncStatus == SyncStatus.ERROR)
                            { { vm.openMatchDialog(entry) } } else null,
                    )
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
    skipped: Int,
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
            StatChip("Issues", errors, MaterialTheme.colorScheme.error, Modifier.weight(1f))
            if (skipped > 0) StatChip("Skipped", skipped, Color(0xFF7B5800), Modifier.weight(1f))
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
    hasSkipped: Boolean = false,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        FilterChip(selected = selected == null, onClick = { onSelect(null) }, label = { Text("All") })
        FilterChip(selected = selected == SyncStatus.SYNCED, onClick = { onSelect(SyncStatus.SYNCED) }, label = { Text("Synced") })
        FilterChip(selected = selected == SyncStatus.ERROR, onClick = { onSelect(SyncStatus.ERROR) }, label = { Text("Errors") })
        FilterChip(selected = selected == SyncStatus.NOT_FOUND, onClick = { onSelect(SyncStatus.NOT_FOUND) }, label = { Text("Not Found") })
        if (hasSkipped) {
            FilterChip(selected = selected == SyncStatus.SKIPPED, onClick = { onSelect(SyncStatus.SKIPPED) }, label = { Text("Skipped") })
        }
    }
}

@Composable
private fun SyncHistorySection(
    history: List<SyncHistoryEntry>,
    modifier: Modifier = Modifier,
) {
    val fmt = SimpleDateFormat("MMM d HH:mm", Locale.getDefault())
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Sync History", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            history.forEach { entry ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        fmt.format(Date(entry.timestampMs)),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        "${entry.syncedCount}/${entry.totalCount} synced" +
                                if (entry.newlyAddedCount > 0) " (+${entry.newlyAddedCount} new)" else "",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.SemiBold,
                    )
                    if (entry.errorCount > 0 || entry.notFoundCount > 0) {
                        Text(
                            "${entry.errorCount + entry.notFoundCount} issues",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun AnimeCard(
    entry: SyncEntry,
    isDark: Boolean,
    sonarrStats: SonarrSeries? = null,
    hasManualOverride: Boolean = false,
    onFixMatch: (() -> Unit)? = null,
) {
    val statusColor = when (entry.syncStatus) {
        SyncStatus.SYNCED -> if (isDark) StatusSyncedDark else StatusSynced
        SyncStatus.NOT_FOUND -> if (isDark) StatusNotFoundDark else StatusNotFound
        SyncStatus.ERROR -> if (isDark) StatusErrorDark else StatusError
        SyncStatus.PENDING -> if (isDark) StatusPendingDark else StatusPending
        SyncStatus.SKIPPED -> Color(0xFF7B5800)
    }

    val statusIcon = when (entry.syncStatus) {
        SyncStatus.SYNCED -> Icons.Default.CheckCircle
        SyncStatus.NOT_FOUND -> Icons.Default.SearchOff
        SyncStatus.ERROR -> Icons.Default.Error
        SyncStatus.PENDING -> Icons.Default.Schedule
        SyncStatus.SKIPPED -> Icons.Default.Block
    }

    val statusLabel = when (entry.syncStatus) {
        SyncStatus.SYNCED -> "Synced"
        SyncStatus.NOT_FOUND -> "Not Found"
        SyncStatus.ERROR -> "Error"
        SyncStatus.PENDING -> "Pending"
        SyncStatus.SKIPPED -> "Skipped"
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
                // Score badge (bottom-start) — only if user has rated
                if (entry.score > 0) {
                    Surface(
                        shape = MaterialTheme.shapes.small,
                        color = Color.Black.copy(alpha = 0.7f),
                        modifier = Modifier.align(Alignment.BottomStart).padding(6.dp),
                    ) {
                        Text(
                            "★ ${entry.score}",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color(0xFFFFD600),
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                        )
                    }
                }
                // Sonarr download status badge (bottom-end) — only for synced entries with stats
                if (entry.syncStatus == SyncStatus.SYNCED && sonarrStats != null) {
                    val pct = sonarrStats.percentOfEpisodes.toInt()
                    val badgeColor = when {
                        !sonarrStats.monitored -> Color(0xFF616161)
                        pct >= 100 -> Color(0xFF2E7D32)
                        pct > 0 -> Color(0xFF1565C0)
                        else -> Color(0xFF7B5800)
                    }
                    val badgeText = when {
                        !sonarrStats.monitored -> "Unmonitored"
                        pct >= 100 -> "✓ 100%"
                        pct > 0 -> "↓ $pct%"
                        else -> "○ 0%"
                    }
                    Surface(
                        shape = MaterialTheme.shapes.small,
                        color = badgeColor.copy(alpha = 0.88f),
                        modifier = Modifier.align(Alignment.BottomEnd).padding(6.dp),
                    ) {
                        Text(
                            badgeText,
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                        )
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
                if (hasManualOverride) {
                    Text(
                        "📌 Manual match",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.tertiary,
                    )
                }
                if (onFixMatch != null) {
                    Spacer(Modifier.height(4.dp))
                    OutlinedButton(
                        onClick = onFixMatch,
                        modifier = Modifier.fillMaxWidth().height(28.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                    ) {
                        Icon(Icons.Default.Search, null, modifier = Modifier.size(12.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Fix Match", style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
    }
}

@Composable
private fun ManualMatchDialog(
    entry: SyncEntry,
    isSearching: Boolean,
    results: List<TvdbSeriesResult>,
    searchError: String?,
    hasOverride: Boolean,
    onSearch: (String) -> Unit,
    onSelect: (TvdbSeriesResult) -> Unit,
    onClearOverride: () -> Unit,
    onDismiss: () -> Unit,
) {
    var query by remember { mutableStateOf(entry.malTitle) }

    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { Icon(Icons.Default.Search, null) },
        title = { Text("Fix TVDB Match") },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    "Searching for: ${entry.malTitle}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                if (hasOverride) {
                    Surface(
                        shape = MaterialTheme.shapes.small,
                        color = MaterialTheme.colorScheme.tertiaryContainer,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                "📌 Manual override active",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onTertiaryContainer,
                            )
                            TextButton(onClick = onClearOverride) {
                                Text("Clear", style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }

                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    label = { Text("Search TVDB") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    trailingIcon = {
                        if (isSearching) {
                            CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                        } else {
                            IconButton(onClick = { onSearch(query) }) {
                                Icon(Icons.Default.Search, "Search")
                            }
                        }
                    }
                )

                if (searchError != null) {
                    Text(searchError, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                }

                if (results.isNotEmpty()) {
                    Text(
                        "Select the correct series:",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    results.forEach { result ->
                        Surface(
                            onClick = { onSelect(result) },
                            shape = MaterialTheme.shapes.small,
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                if (result.imageUrl.isNotBlank()) {
                                    AsyncImage(
                                        model = result.imageUrl,
                                        contentDescription = null,
                                        modifier = Modifier.size(40.dp).clip(MaterialTheme.shapes.small),
                                        contentScale = ContentScale.Crop,
                                    )
                                } else {
                                    Box(
                                        modifier = Modifier.size(40.dp),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Icon(Icons.Default.Tv, null, modifier = Modifier.size(24.dp),
                                            tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        result.name,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                    if (result.year.isNotBlank()) {
                                        Text(
                                            result.year,
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                    if (result.overview.isNotBlank()) {
                                        Text(
                                            result.overview,
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis,
                                        )
                                    }
                                }
                                Icon(Icons.Default.ChevronRight, null,
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                } else if (!isSearching && searchError == null) {
                    Text(
                        "Tap the search icon to find the series on TVDB.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
