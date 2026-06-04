package com.chrisalvis.watashiwomite.ui

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun SettingsScreen(vm: SettingsViewModel, onSetupAgain: () -> Unit) {
    val state by vm.uiState.collectAsStateWithLifecycle()
    var showLogoutDialog by remember { mutableStateOf(false) }
    var showSonarrApiKey by remember { mutableStateOf(false) }
    var showTvdbApiKey by remember { mutableStateOf(false) }

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
