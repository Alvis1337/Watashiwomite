package com.chrisalvis.watashiwomite.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chrisalvis.watashiwomite.BuildConfig
import com.chrisalvis.watashiwomite.data.AppPreferences
import com.chrisalvis.watashiwomite.data.DownloadState
import com.chrisalvis.watashiwomite.data.UpdateCheckResult
import com.chrisalvis.watashiwomite.data.UpdateRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@Composable
fun SettingsScreen(vm: SettingsViewModel, onSetupAgain: () -> Unit) {
    val state by vm.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var showLogoutDialog by remember { mutableStateOf(false) }
    var showSonarrApiKey by remember { mutableStateOf(false) }
    var showTvdbApiKey by remember { mutableStateOf(false) }

    // Update checker state
    var updateCheckState by remember { mutableStateOf<UpdateCheckResult?>(null) }
    var updateChecking by remember { mutableStateOf(false) }
    var pendingUpdateInfo by remember { mutableStateOf<com.chrisalvis.watashiwomite.data.UpdateInfo?>(null) }
    var downloadState by remember { mutableStateOf<DownloadState>(DownloadState.Idle) }

    // Auto-check on open — show dialog if update available and not ignored
    LaunchedEffect(Unit) {
        val prefs = AppPreferences(context)
        val ignoredVersion = prefs.ignoredUpdateVersion.first()
        val result = UpdateRepository.checkForUpdate()
        updateCheckState = result
        if (result is UpdateCheckResult.UpdateAvailable &&
            result.info.versionCode != ignoredVersion) {
            pendingUpdateInfo = result.info
        }
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Logout from MAL?") },
            text = { Text("This will clear your MAL session and return you to setup. Your Sonarr and TVDB settings are preserved.") },
            confirmButton = {
                TextButton(onClick = {
                    showLogoutDialog = false
                    vm.logoutMal(onSetupAgain)
                }) { Text("Logout", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) { Text("Cancel") }
            }
        )
    }

    // Update available dialog
    pendingUpdateInfo?.let { info ->
        val isDownloading = downloadState is DownloadState.Progress || downloadState is DownloadState.Installing
        androidx.compose.ui.window.Dialog(
            onDismissRequest = { if (!isDownloading) pendingUpdateInfo = null },
            properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth(0.92f)
                    .padding(vertical = 24.dp),
                shape = MaterialTheme.shapes.large
            ) {
                Column(modifier = Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Update Available", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                            Text("v${info.versionName}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
                        }
                        Icon(Icons.Default.SystemUpdateAlt, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(28.dp))
                    }

                    HorizontalDivider()

                    if (info.releaseNotes.isNotEmpty()) {
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("What's New", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                            Column(
                                modifier = Modifier
                                    .heightIn(max = 260.dp)
                                    .verticalScroll(rememberScrollState()),
                                verticalArrangement = Arrangement.spacedBy(2.dp)
                            ) {
                                formatChangelogLines(info.releaseNotes).forEach { (text, isHeader) ->
                                    if (text.isBlank()) {
                                        Spacer(Modifier.size(4.dp))
                                    } else if (isHeader) {
                                        Text(text, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(top = 6.dp))
                                    } else {
                                        Text(text, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                            }
                        }
                    }

                    when (val ds = downloadState) {
                        is DownloadState.Progress -> Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("Downloading… ${ds.percent}%", style = MaterialTheme.typography.bodySmall)
                            LinearProgressIndicator(progress = { ds.percent / 100f }, modifier = Modifier.fillMaxWidth())
                        }
                        is DownloadState.Installing -> Text("Opening installer…", style = MaterialTheme.typography.bodySmall)
                        is DownloadState.Failed -> Text("Failed: ${ds.message}", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                        else -> {}
                    }

                    HorizontalDivider()

                    Button(
                        onClick = {
                            scope.launch {
                                UpdateRepository.downloadAndInstall(context, info) { ds ->
                                    downloadState = ds
                                    if (ds is DownloadState.Installing) {
                                        pendingUpdateInfo = null
                                        downloadState = DownloadState.Idle
                                    }
                                }
                            }
                        },
                        enabled = !isDownloading,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        if (isDownloading) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                            Spacer(Modifier.width(8.dp))
                        }
                        Text(if (isDownloading) "Downloading…" else "Download & Install")
                    }

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(
                            onClick = { pendingUpdateInfo = null; downloadState = DownloadState.Idle },
                            enabled = !isDownloading,
                            modifier = Modifier.weight(1f)
                        ) { Text("Later") }
                        TextButton(
                            onClick = {
                                scope.launch {
                                    AppPreferences(context).setIgnoredUpdateVersion(info.versionCode)
                                    pendingUpdateInfo = null
                                    downloadState = DownloadState.Idle
                                }
                            },
                            enabled = !isDownloading,
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)
                        ) { Text("Ignore") }
                    }
                }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
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
            verticalArrangement = Arrangement.spacedBy(24.dp),
        ) {

            // ── MAL Section ──────────────────────────────────────────────────
            SettingsSection(title = "MyAnimeList") {
                // Client ID field — always shown so it can be updated
                OutlinedTextField(
                    value = state.malClientId,
                    onValueChange = vm::setMalClientId,
                    label = { Text("MAL Client ID") },
                    leadingIcon = { Icon(Icons.Default.Key, null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedButton(
                    onClick = vm::saveMalClientId,
                    enabled = state.malClientId.isNotBlank(),
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Save Client ID") }

                HorizontalDivider()

                if (state.malIsLoggedIn) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Surface(
                            shape = MaterialTheme.shapes.small,
                            color = MaterialTheme.colorScheme.primaryContainer,
                            modifier = Modifier.size(40.dp),
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    state.malUsername.take(1).uppercase(),
                                    style = MaterialTheme.typography.titleMedium,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Logged in as", style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(state.malUsername, style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.SemiBold)
                        }
                    }
                    Spacer(Modifier.height(4.dp))
                    OutlinedButton(
                        onClick = { showLogoutDialog = true },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                        border = ButtonDefaults.outlinedButtonBorder.copy(
                            brush = androidx.compose.ui.graphics.SolidColor(MaterialTheme.colorScheme.error.copy(alpha = 0.5f))
                        )
                    ) {
                        Icon(Icons.Default.Logout, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Logout")
                    }
                } else {
                    Text("Not logged in", style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            // ── Sonarr Section ───────────────────────────────────────────────
            SettingsSection(title = "Sonarr") {
                OutlinedTextField(
                    value = state.sonarrUrl,
                    onValueChange = vm::setSonarrUrl,
                    label = { Text("Sonarr URL") },
                    placeholder = { Text("http://localhost:8989") },
                    leadingIcon = { Icon(Icons.Default.Link, null) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = state.sonarrApiKey,
                    onValueChange = vm::setSonarrApiKey,
                    label = { Text("API Key") },
                    leadingIcon = { Icon(Icons.Default.Key, null) },
                    trailingIcon = {
                        IconButton(onClick = { showSonarrApiKey = !showSonarrApiKey }) {
                            Icon(if (showSonarrApiKey) Icons.Default.VisibilityOff else Icons.Default.Visibility, null)
                        }
                    },
                    visualTransformation = if (showSonarrApiKey) VisualTransformation.None else PasswordVisualTransformation(),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )

                // Root folder picker
                if (state.rootFolders.isNotEmpty()) {
                    var folderExpanded by remember { mutableStateOf(false) }
                    ExposedDropdownMenuBox(
                        expanded = folderExpanded,
                        onExpandedChange = { folderExpanded = it },
                    ) {
                        OutlinedTextField(
                            value = state.sonarrRootFolder.ifBlank { state.rootFolders.firstOrNull()?.path ?: "" },
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Root Folder") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = folderExpanded) },
                            modifier = Modifier.fillMaxWidth().menuAnchor(),
                        )
                        ExposedDropdownMenu(
                            expanded = folderExpanded,
                            onDismissRequest = { folderExpanded = false },
                        ) {
                            state.rootFolders.forEach { folder ->
                                DropdownMenuItem(
                                    text = { Text(folder.path) },
                                    onClick = { vm.setRootFolder(folder.path); folderExpanded = false },
                                )
                            }
                        }
                    }
                }

                // Quality profile picker
                if (state.qualityProfiles.isNotEmpty()) {
                    var profileExpanded by remember { mutableStateOf(false) }
                    val selectedProfile = state.qualityProfiles.find { it.id.toString() == state.sonarrQualityProfileId }
                    ExposedDropdownMenuBox(
                        expanded = profileExpanded,
                        onExpandedChange = { profileExpanded = it },
                    ) {
                        OutlinedTextField(
                            value = selectedProfile?.name ?: state.sonarrQualityProfileId,
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Quality Profile") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = profileExpanded) },
                            modifier = Modifier.fillMaxWidth().menuAnchor(),
                        )
                        ExposedDropdownMenu(
                            expanded = profileExpanded,
                            onDismissRequest = { profileExpanded = false },
                        ) {
                            state.qualityProfiles.forEach { profile ->
                                DropdownMenuItem(
                                    text = { Text(profile.name) },
                                    onClick = { vm.setQualityProfileId(profile.id.toString()); profileExpanded = false },
                                )
                            }
                        }
                    }
                }

                OutlinedButton(
                    onClick = vm::saveSonarr,
                    enabled = state.sonarrUrl.isNotBlank() && state.sonarrApiKey.isNotBlank() && !state.isTesting,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    if (state.isTesting) {
                        CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
                        Spacer(Modifier.width(8.dp))
                    }
                    Text("Test & Save")
                }

                state.testResult?.let { msg ->
                    val success = state.testSuccess == true
                    FeedbackCard(msg, success)
                }
            }

            // ── TVDB Section ─────────────────────────────────────────────────
            SettingsSection(title = "TVDB") {
                OutlinedTextField(
                    value = state.tvdbApiKey,
                    onValueChange = vm::setTvdbApiKey,
                    label = { Text("API Key") },
                    leadingIcon = { Icon(Icons.Default.Key, null) },
                    trailingIcon = {
                        IconButton(onClick = { showTvdbApiKey = !showTvdbApiKey }) {
                            Icon(if (showTvdbApiKey) Icons.Default.VisibilityOff else Icons.Default.Visibility, null)
                        }
                    },
                    visualTransformation = if (showTvdbApiKey) VisualTransformation.None else PasswordVisualTransformation(),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedButton(
                    onClick = vm::saveTvdb,
                    enabled = state.tvdbApiKey.isNotBlank() && !state.isTvdbValidating,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    if (state.isTvdbValidating) {
                        CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
                        Spacer(Modifier.width(8.dp))
                    }
                    Text("Validate & Save")
                }
                state.tvdbResult?.let { msg ->
                    FeedbackCard(msg, state.tvdbSuccess == true)
                }
            }

            // ── Sync Preferences Section ──────────────────────────────────────
            SettingsSection(title = "Sync Preferences") {
                Text("Episode Type Filters", style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)

                @Composable
                fun SwitchRow(label: String, checked: Boolean, onChecked: (Boolean) -> Unit) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(label, style = MaterialTheme.typography.bodyMedium)
                        Switch(checked = checked, onCheckedChange = onChecked)
                    }
                }

                SwitchRow("Skip OVAs", state.skipOVAs, vm::setSkipOVAs)
                SwitchRow("Skip Specials", state.skipSpecials, vm::setSkipSpecials)
                SwitchRow("Skip Movies", state.skipMovies, vm::setSkipMovies)
                SwitchRow("Only main TV series", state.onlyMainSeries, vm::setOnlyMainSeries)

                HorizontalDivider()

                Text("Score-Based Monitoring", style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
                SwitchRow("Enable score-based monitoring", state.scoreBasedMonitoring, vm::setScoreBasedMonitoring)

                if (state.scoreBasedMonitoring) {
                    Text(
                        "Score ≥ High → monitor all\n" +
                        "Score ≥ Med  → monitor future only\n" +
                        "Score < Med  → monitor none",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        OutlinedTextField(
                            value = state.scoreHighThreshold,
                            onValueChange = vm::setScoreHighThreshold,
                            label = { Text("High (≥)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                        )
                        OutlinedTextField(
                            value = state.scoreMedThreshold,
                            onValueChange = vm::setScoreMedThreshold,
                            label = { Text("Med (≥)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }

            // ── About Section ─────────────────────────────────────────────────
            SettingsSection(title = "About") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text("Version", style = MaterialTheme.typography.bodyMedium)
                    Text(
                        "${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                val updateAvailable = updateCheckState is UpdateCheckResult.UpdateAvailable
                OutlinedButton(
                    onClick = {
                        if (updateAvailable) {
                            pendingUpdateInfo = (updateCheckState as UpdateCheckResult.UpdateAvailable).info
                        } else {
                            updateChecking = true
                            scope.launch {
                                val result = UpdateRepository.checkForUpdate()
                                updateCheckState = result
                                updateChecking = false
                                if (result is UpdateCheckResult.UpdateAvailable) {
                                    pendingUpdateInfo = result.info
                                } else if (result is UpdateCheckResult.UpToDate) {
                                    android.widget.Toast.makeText(context, "You're up to date!", android.widget.Toast.LENGTH_SHORT).show()
                                } else if (result is UpdateCheckResult.Error) {
                                    android.widget.Toast.makeText(context, "Update check failed: ${result.message}", android.widget.Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !updateChecking,
                ) {
                    if (updateChecking) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                        Spacer(Modifier.width(8.dp))
                        Text("Checking…")
                    } else if (updateAvailable) {
                        Icon(Icons.Default.SystemUpdateAlt, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp))
                        val info = (updateCheckState as UpdateCheckResult.UpdateAvailable).info
                        Text("Update available — v${info.versionName}")
                    } else {
                        Icon(Icons.Default.SystemUpdateAlt, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Check for Updates")
                    }
                }
                OutlinedButton(
                    onClick = {
                        context.startActivity(
                            Intent(Intent.ACTION_VIEW, Uri.parse("https://alvis1337.github.io/Watashiwomite/privacy/"))
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Privacy Policy") }
                OutlinedButton(
                    onClick = {
                        context.startActivity(
                            Intent(Intent.ACTION_VIEW, Uri.parse("https://alvis1337.github.io/Watashiwomite/terms/"))
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Terms of Service") }
                OutlinedButton(
                    onClick = {
                        context.startActivity(
                            Intent(Intent.ACTION_VIEW, Uri.parse("https://alvis1337.github.io/Watashiwomite/"))
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Website") }
            }

            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun SettingsSection(
    title: String,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary,
        )
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = CardDefaults.outlinedCardBorder(),
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                content()
            }
        }
    }
}

@Composable
private fun FeedbackCard(message: String, success: Boolean) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = if (success) MaterialTheme.colorScheme.primaryContainer
                            else MaterialTheme.colorScheme.errorContainer
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(
                if (success) Icons.Default.CheckCircle else Icons.Default.Error,
                null,
                tint = if (success) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
            )
            Text(message, style = MaterialTheme.typography.bodySmall)
        }
    }
}

private fun formatChangelogLines(raw: String): List<Pair<String, Boolean>> =
    raw.lines().map { line ->
        val t = line.trim()
            .replace(Regex("\\*\\*(.*?)\\*\\*"), "$1")
            .replace(Regex("\\*(.*?)\\*"), "$1")
            .replace(Regex("`(.*?)`"), "$1")
        when {
            t.startsWith("### ") -> t.removePrefix("### ") to true
            t.startsWith("## ")  -> t.removePrefix("## ")  to true
            t.startsWith("# ")   -> t.removePrefix("# ")   to true
            t.startsWith("- ") || t.startsWith("* ") -> "• ${t.drop(2)}" to false
            else -> t to false
        }
    }
