package com.chrisalvis.watashiwomite.ui

import androidx.compose.foundation.clickable
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
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.chrisalvis.watashiwomite.data.SonarrSeries
import com.chrisalvis.watashiwomite.data.SyncEntry
import com.chrisalvis.watashiwomite.data.SyncStatus
import com.chrisalvis.watashiwomite.data.TvdbSeriesResult
import com.chrisalvis.watashiwomite.ui.theme.*
import kotlinx.coroutines.delay
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

    // Toast feedback
    val toastMessage = state.toastMessage
    LaunchedEffect(toastMessage) {
        if (toastMessage != null) {
            delay(2500)
            vm.clearToast()
        }
    }

    // Detail bottom sheet
    state.selectedEntry?.let { entry ->
        AnimeDetailSheet(
            entry = entry,
            sonarrStats = state.sonarrStats[entry.tvdbId],
            sonarrUrl = state.sonarrUrl,
            hasManualOverride = state.manualOverrides.containsKey(entry.malId),
            actionInProgress = state.actionInProgress == entry.malId,
            onFixMatch = { vm.openMatchDialog(entry); vm.dismissDetail() },
            onClearOverride = { vm.clearManualOverride(entry.malId) },
            onToggleMonitoring = { vm.toggleMonitoring(entry) },
            onChangeMalStatus = { vm.updateMalStatus(entry, it) },
            onDismiss = vm::dismissDetail,
        )
    }

    // Toast overlay
    if (toastMessage != null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.BottomCenter) {
            Surface(
                modifier = Modifier
                    .padding(horizontal = 24.dp)
                    .padding(bottom = 80.dp),
                shape = MaterialTheme.shapes.small,
                color = MaterialTheme.colorScheme.inverseSurface,
                tonalElevation = 6.dp,
            ) {
                Text(
                    toastMessage,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.inverseOnSurface,
                )
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Dashboard") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                )
            )
        },
        floatingActionButton = {
            if (!state.isLoading) {
                FloatingActionButton(
                    onClick = vm::quickSync,
                    containerColor = if (state.isSyncing)
                        MaterialTheme.colorScheme.surfaceVariant
                    else MaterialTheme.colorScheme.primary,
                ) {
                    if (state.isSyncing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            strokeWidth = 2.5.dp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    } else {
                        Icon(Icons.Default.Sync, contentDescription = "Sync now")
                    }
                }
            }
        },
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

            // Search bar
            OutlinedTextField(
                value = state.searchQuery,
                onValueChange = vm::setSearchQuery,
                placeholder = { Text("Search anime…") },
                leadingIcon = { Icon(Icons.Default.Search, null) },
                trailingIcon = {
                    if (state.searchQuery.isNotBlank()) {
                        IconButton(onClick = { vm.setSearchQuery("") }) {
                            Icon(Icons.Default.Clear, null)
                        }
                    }
                },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                shape = MaterialTheme.shapes.large,
            )

            // Filter chips
            StatusFilterRow(
                selected = state.filterStatus,
                filterNeedsAttention = state.filterNeedsAttention,
                needsAttentionCount = state.needsAttentionCount,
                onSelect = vm::setFilter,
                onToggleNeedsAttention = { vm.setFilterNeedsAttention(!state.filterNeedsAttention) },
                hasSkipped = state.skippedCount > 0,
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

            @OptIn(ExperimentalMaterial3Api::class)
            PullToRefreshBox(
                isRefreshing = state.isSyncing,
                onRefresh = vm::quickSync,
                modifier = Modifier.fillMaxSize(),
            ) {
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(minSize = 160.dp),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 16.dp, top = 4.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    val displayEntries = vm.filteredEntries
                    items(displayEntries, key = { it.malId }) { entry ->
                        AnimeCard(
                            entry = entry,
                            isDark = isDark,
                            sonarrStats = state.sonarrStats[entry.tvdbId],
                            hasManualOverride = state.manualOverrides.containsKey(entry.malId),
                            onFixMatch = if (entry.syncStatus == SyncStatus.NOT_FOUND || entry.syncStatus == SyncStatus.ERROR)
                                { { vm.openMatchDialog(entry) } } else null,
                            onClick = { vm.openDetail(entry) },
                        )
                    }
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
    filterNeedsAttention: Boolean,
    needsAttentionCount: Int,
    onSelect: (SyncStatus?) -> Unit,
    onToggleNeedsAttention: () -> Unit,
    hasSkipped: Boolean = false,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        FilterChip(
            selected = selected == null && !filterNeedsAttention,
            onClick = { onSelect(null); if (filterNeedsAttention) onToggleNeedsAttention() },
            label = { Text("All") },
        )
        if (needsAttentionCount > 0) {
            FilterChip(
                selected = filterNeedsAttention,
                onClick = onToggleNeedsAttention,
                label = {
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("Needs Attention")
                        Surface(
                            shape = MaterialTheme.shapes.small,
                            color = if (filterNeedsAttention) MaterialTheme.colorScheme.onSecondaryContainer
                            else MaterialTheme.colorScheme.error,
                        ) {
                            Text(
                                "$needsAttentionCount",
                                style = MaterialTheme.typography.labelSmall,
                                color = if (filterNeedsAttention) MaterialTheme.colorScheme.secondaryContainer
                                else MaterialTheme.colorScheme.onError,
                                modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp),
                            )
                        }
                    }
                },
                leadingIcon = { Icon(Icons.Default.Warning, null, modifier = Modifier.size(16.dp)) },
            )
        }
        FilterChip(selected = selected == SyncStatus.SYNCED && !filterNeedsAttention, onClick = { onSelect(SyncStatus.SYNCED) }, label = { Text("Synced") })
        FilterChip(selected = selected == SyncStatus.ERROR && !filterNeedsAttention, onClick = { onSelect(SyncStatus.ERROR) }, label = { Text("Errors") })
        FilterChip(selected = selected == SyncStatus.NOT_FOUND && !filterNeedsAttention, onClick = { onSelect(SyncStatus.NOT_FOUND) }, label = { Text("Not Found") })
        if (hasSkipped) {
            FilterChip(selected = selected == SyncStatus.SKIPPED && !filterNeedsAttention, onClick = { onSelect(SyncStatus.SKIPPED) }, label = { Text("Skipped") })
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
    onClick: () -> Unit = {},
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
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AnimeDetailSheet(
    entry: SyncEntry,
    sonarrStats: SonarrSeries?,
    sonarrUrl: String,
    hasManualOverride: Boolean,
    actionInProgress: Boolean,
    onFixMatch: () -> Unit,
    onClearOverride: () -> Unit,
    onToggleMonitoring: () -> Unit,
    onChangeMalStatus: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    val uriHandler = LocalUriHandler.current
    val isDark = isSystemInDarkTheme()

    val statusColor = when (entry.syncStatus) {
        SyncStatus.SYNCED -> if (isDark) StatusSyncedDark else StatusSynced
        SyncStatus.NOT_FOUND -> if (isDark) StatusNotFoundDark else StatusNotFound
        SyncStatus.ERROR -> if (isDark) StatusErrorDark else StatusError
        SyncStatus.PENDING -> if (isDark) StatusPendingDark else StatusPending
        SyncStatus.SKIPPED -> Color(0xFF7B5800)
    }
    val statusLabel = when (entry.syncStatus) {
        SyncStatus.SYNCED -> "Synced"
        SyncStatus.NOT_FOUND -> "Not Found"
        SyncStatus.ERROR -> "Error"
        SyncStatus.PENDING -> "Pending"
        SyncStatus.SKIPPED -> "Skipped"
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Poster + basic info row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Card(
                    shape = MaterialTheme.shapes.medium,
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    modifier = Modifier.width(110.dp).aspectRatio(3f / 4f),
                ) {
                    if (entry.imageUrl.isNotBlank()) {
                        AsyncImage(
                            model = entry.imageUrl,
                            contentDescription = entry.malTitle,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize(),
                        )
                    } else {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Tv, null, modifier = Modifier.size(36.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }

                Column(
                    modifier = Modifier.weight(1f).padding(top = 4.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(entry.malTitle, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    if (entry.tvdbTitle != null && entry.tvdbTitle != entry.malTitle) {
                        Text("TVDB: ${entry.tvdbTitle}", style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Surface(shape = MaterialTheme.shapes.small, color = statusColor.copy(alpha = 0.15f)) {
                        Text(statusLabel, style = MaterialTheme.typography.labelSmall, color = statusColor,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (entry.score > 0) {
                            Text("★ ${entry.score}/10", style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFFFFD600), fontWeight = FontWeight.SemiBold)
                        }
                        if (entry.numEpisodes > 0) {
                            Text("${entry.numEpisodes} eps", style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        if (entry.mediaType.isNotBlank() && entry.mediaType != "tv") {
                            Text(entry.mediaType.uppercase(), style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    // MAL status chip row
                    if (entry.malStatus.isNotBlank()) {
                        val malStatuses = listOf(
                            "watching" to "Watching",
                            "completed" to "Completed",
                            "on_hold" to "On Hold",
                            "dropped" to "Dropped",
                            "plan_to_watch" to "Plan to Watch",
                        )
                        Text(
                            "MAL Status",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Row(
                            modifier = Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            malStatuses.forEach { (value, label) ->
                                val selected = entry.malStatus == value
                                FilterChip(
                                    selected = selected,
                                    onClick = { if (!actionInProgress) onChangeMalStatus(value) },
                                    label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                    enabled = !actionInProgress,
                                )
                            }
                        }
                    }
                }
            }

            // Error message
            if (entry.errorMessage != null) {
                Surface(shape = MaterialTheme.shapes.small, color = MaterialTheme.colorScheme.errorContainer,
                    modifier = Modifier.fillMaxWidth()) {
                    Row(modifier = Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Error, null, tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(16.dp))
                        Text(entry.errorMessage, style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onErrorContainer)
                    }
                }
            }

            // Manual override badge
            if (hasManualOverride) {
                Surface(shape = MaterialTheme.shapes.small, color = MaterialTheme.colorScheme.tertiaryContainer,
                    modifier = Modifier.fillMaxWidth()) {
                    Row(modifier = Modifier.padding(10.dp), horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically) {
                        Text("📌 Manual TVDB override active", style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onTertiaryContainer)
                        TextButton(onClick = onClearOverride) { Text("Clear", style = MaterialTheme.typography.labelSmall) }
                    }
                }
            }

            HorizontalDivider()

            if (entry.syncStatus == SyncStatus.SYNCED && sonarrStats != null) {
                // ── Sonarr download info ────────────────────────────────────────
                Text("Sonarr", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)

                if (sonarrStats.title.isNotBlank() && sonarrStats.title != entry.malTitle) {
                    Text(sonarrStats.title, style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }

                val pct = (sonarrStats.percentOfEpisodes / 100.0).coerceIn(0.0, 1.0).toFloat()
                val progressColor = when {
                    !sonarrStats.monitored -> MaterialTheme.colorScheme.outline
                    pct >= 1f -> Color(0xFF2E7D32)
                    pct > 0f -> MaterialTheme.colorScheme.primary
                    else -> Color(0xFF7B5800)
                }
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("${sonarrStats.episodeFileCount} / ${sonarrStats.totalEpisodeCount} eps downloaded",
                            style = MaterialTheme.typography.bodySmall)
                        Text("${sonarrStats.percentOfEpisodes.toInt()}%", style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.SemiBold, color = progressColor)
                    }
                    LinearProgressIndicator(
                        progress = { pct },
                        modifier = Modifier.fillMaxWidth(),
                        color = progressColor,
                        trackColor = progressColor.copy(alpha = 0.15f),
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (sonarrStats.sonarrStatus.isNotBlank()) {
                        DetailPill(sonarrStats.sonarrStatus.replaceFirstChar { it.uppercase() })
                    }
                }

                // Monitoring toggle
                val isMonitored = entry.monitored
                OutlinedButton(
                    onClick = onToggleMonitoring,
                    enabled = !actionInProgress,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = if (isMonitored) MaterialTheme.colorScheme.error
                        else Color(0xFF2E7D32),
                    ),
                ) {
                    if (actionInProgress) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                        Spacer(Modifier.width(8.dp))
                        Text("Updating…")
                    } else if (isMonitored) {
                        Icon(Icons.Default.VisibilityOff, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Unmonitor in Sonarr")
                    } else {
                        Icon(Icons.Default.Visibility, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Monitor in Sonarr")
                    }
                }

                if (sonarrUrl.isNotBlank() && sonarrStats.titleSlug.isNotBlank()) {
                    OutlinedButton(
                        onClick = { runCatching { uriHandler.openUri("$sonarrUrl/series/${sonarrStats.titleSlug}") } },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Icon(Icons.Default.OpenInBrowser, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Open in Sonarr")
                    }
                }
            } else if (entry.syncStatus == SyncStatus.NOT_FOUND || entry.syncStatus == SyncStatus.ERROR) {
                Button(
                    onClick = onFixMatch,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary),
                ) {
                    Icon(Icons.Default.Search, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Fix TVDB Match")
                }
            }
        }
    }
}

@Composable
private fun DetailPill(label: String, color: Color = MaterialTheme.colorScheme.onSurfaceVariant) {
    Surface(shape = MaterialTheme.shapes.small, color = color.copy(alpha = 0.12f)) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = color,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
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
