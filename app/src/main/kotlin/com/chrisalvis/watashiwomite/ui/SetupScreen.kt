package com.chrisalvis.watashiwomite.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedContent
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun SetupScreen(
    vm: SetupViewModel,
    onSetupComplete: () -> Unit,
) {
    val state by vm.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    // Open MAL auth URL in browser when it becomes available
    LaunchedEffect(state.authUrl) {
        if (state.authUrl.isNotBlank()) {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(state.authUrl))
            context.startActivity(intent)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Setup") },
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
                .padding(horizontal = 24.dp)
        ) {
            // Step indicator
            SetupStepIndicator(
                currentStep = state.step,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 16.dp)
            )

            AnimatedContent(targetState = state.step, label = "setup_step") { step ->
                when (step) {
                    SetupStep.MAL -> MalStep(
                        state = state,
                        onClientIdChange = vm::setMalClientId,
                        onClientSecretChange = vm::setMalClientSecret,
                        onLogin = { vm.generateAuthUrl() },
                        onNext = { vm.goToStep(SetupStep.SONARR) },
                    )
                    SetupStep.SONARR -> SonarrStep(
                        state = state,
                        onUrlChange = vm::setSonarrUrl,
                        onKeyChange = vm::setSonarrApiKey,
                        onTest = vm::testSonarr,
                        onBack = { vm.goToStep(SetupStep.MAL) },
                        onNext = { vm.goToStep(SetupStep.TVDB) },
                    )
                    SetupStep.TVDB -> TvdbStep(
                        state = state,
                        onKeyChange = vm::setTvdbApiKey,
                        onValidate = vm::validateTvdb,
                        onBack = { vm.goToStep(SetupStep.SONARR) },
                        onFinish = { vm.completeSetup(onSetupComplete) },
                    )
                }
            }
        }
    }
}

@Composable
private fun SetupStepIndicator(currentStep: SetupStep, modifier: Modifier = Modifier) {
    val steps = listOf(
        SetupStep.MAL to "MAL",
        SetupStep.SONARR to "Sonarr",
        SetupStep.TVDB to "TVDB",
    )
    val currentIndex = steps.indexOfFirst { it.first == currentStep }

    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        steps.forEachIndexed { index, (_, label) ->
            val isDone = index < currentIndex
            val isActive = index == currentIndex
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.width(72.dp)
            ) {
                Surface(
                    shape = MaterialTheme.shapes.small,
                    color = when {
                        isDone -> MaterialTheme.colorScheme.primary
                        isActive -> MaterialTheme.colorScheme.primaryContainer
                        else -> MaterialTheme.colorScheme.surfaceVariant
                    },
                    modifier = Modifier.size(36.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        if (isDone) {
                            Icon(Icons.Default.Check, null, tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(18.dp))
                        } else {
                            Text(
                                "${index + 1}",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                                color = if (isActive) MaterialTheme.colorScheme.onPrimaryContainer
                                        else MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    label,
                    style = MaterialTheme.typography.labelSmall,
                    color = if (isActive) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Normal,
                )
            }
            if (index < steps.size - 1) {
                HorizontalDivider(
                    modifier = Modifier
                        .weight(1f)
                        .padding(bottom = 20.dp),
                    color = if (index < currentIndex) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.outlineVariant,
                )
            }
        }
    }
}

@Composable
private fun StepCard(
    icon: ImageVector,
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Spacer(Modifier.height(8.dp))
        Icon(
            icon, null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(48.dp).align(Alignment.CenterHorizontally)
        )
        Text(
            title,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )
        Text(
            subtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )
        HorizontalDivider()
        content()
    }
}

@Composable
private fun MalStep(
    state: SetupUiState,
    onClientIdChange: (String) -> Unit,
    onClientSecretChange: (String) -> Unit,
    onLogin: () -> Unit,
    onNext: () -> Unit,
) {
    var showSecret by remember { mutableStateOf(false) }
    StepCard(
        icon = Icons.Default.Person,
        title = "Connect MyAnimeList",
        subtitle = "Authorize the app to read your anime list using OAuth 2.0. Your credentials are never stored on any server.",
    ) {
        if (state.malIsLoggedIn) {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(Icons.Default.CheckCircle, null, tint = MaterialTheme.colorScheme.primary)
                    Column {
                        Text("Logged in as", style = MaterialTheme.typography.labelMedium)
                        Text(state.malUsername, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        } else {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Register a MAL API app at:", style = MaterialTheme.typography.labelMedium)
                    Text(
                        "myanimelist.net/apiconfig",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Set redirect URI to:  watashiwomite://callback",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            OutlinedTextField(
                value = state.malClientId,
                onValueChange = onClientIdChange,
                label = { Text("MAL Client ID") },
                leadingIcon = { Icon(Icons.Default.Key, null) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = state.malClientSecret,
                onValueChange = onClientSecretChange,
                label = { Text("MAL Client Secret (optional)") },
                leadingIcon = { Icon(Icons.Default.Lock, null) },
                trailingIcon = {
                    IconButton(onClick = { showSecret = !showSecret }) {
                        Icon(if (showSecret) Icons.Default.VisibilityOff else Icons.Default.Visibility, null)
                    }
                },
                visualTransformation = if (showSecret) VisualTransformation.None else PasswordVisualTransformation(),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )

            Button(
                onClick = onLogin,
                enabled = state.malClientId.isNotBlank() && !state.isGeneratingAuthUrl,
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (state.isGeneratingAuthUrl) {
                    CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                }
                Text("Login with MyAnimeList")
            }
        }

        Spacer(Modifier.weight(1f, fill = false))
        Spacer(Modifier.height(16.dp))
        Button(
            onClick = onNext,
            enabled = state.malIsLoggedIn,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Next: Sonarr")
        }
    }
}

@Composable
private fun SonarrStep(
    state: SetupUiState,
    onUrlChange: (String) -> Unit,
    onKeyChange: (String) -> Unit,
    onTest: () -> Unit,
    onBack: () -> Unit,
    onNext: () -> Unit,
) {
    var showKey by remember { mutableStateOf(false) }

    StepCard(
        icon = Icons.Default.Storage,
        title = "Connect Sonarr",
        subtitle = "Enter your Sonarr server URL and API key. The app will add anime series automatically.",
    ) {
        OutlinedTextField(
            value = state.sonarrUrl,
            onValueChange = onUrlChange,
            label = { Text("Sonarr URL") },
            placeholder = { Text("http://localhost:8989") },
            leadingIcon = { Icon(Icons.Default.Link, null) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = state.sonarrApiKey,
            onValueChange = onKeyChange,
            label = { Text("API Key") },
            leadingIcon = { Icon(Icons.Default.Key, null) },
            trailingIcon = {
                IconButton(onClick = { showKey = !showKey }) {
                    Icon(if (showKey) Icons.Default.VisibilityOff else Icons.Default.Visibility, null)
                }
            },
            visualTransformation = if (showKey) VisualTransformation.None else PasswordVisualTransformation(),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )

        OutlinedButton(
            onClick = onTest,
            enabled = state.sonarrUrl.isNotBlank() && state.sonarrApiKey.isNotBlank() && !state.sonarrTesting,
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (state.sonarrTesting) {
                CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                Spacer(Modifier.width(8.dp))
            }
            Text("Test Connection")
        }

        state.sonarrTestResult?.let { msg ->
            val success = state.sonarrTestSuccess == true
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = if (success) MaterialTheme.colorScheme.primaryContainer
                                    else MaterialTheme.colorScheme.errorContainer
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(if (success) Icons.Default.CheckCircle else Icons.Default.Error, null,
                        tint = if (success) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error)
                    Text(msg, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedButton(onClick = onBack, modifier = Modifier.weight(1f)) { Text("Back") }
            Button(
                onClick = onNext,
                enabled = state.sonarrTestSuccess == true,
                modifier = Modifier.weight(1f),
            ) { Text("Next: TVDB") }
        }
    }
}

@Composable
private fun TvdbStep(
    state: SetupUiState,
    onKeyChange: (String) -> Unit,
    onValidate: () -> Unit,
    onBack: () -> Unit,
    onFinish: () -> Unit,
) {
    var showKey by remember { mutableStateOf(false) }

    StepCard(
        icon = Icons.Default.Tv,
        title = "Configure TVDB",
        subtitle = "TVDB is used to map MAL anime titles to Sonarr-compatible series IDs.",
    ) {
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("Get your API key at:", style = MaterialTheme.typography.labelMedium)
                Text("thetvdb.com/api-information", style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary)
            }
        }

        OutlinedTextField(
            value = state.tvdbApiKey,
            onValueChange = onKeyChange,
            label = { Text("TVDB API Key") },
            leadingIcon = { Icon(Icons.Default.Key, null) },
            trailingIcon = {
                IconButton(onClick = { showKey = !showKey }) {
                    Icon(if (showKey) Icons.Default.VisibilityOff else Icons.Default.Visibility, null)
                }
            },
            visualTransformation = if (showKey) VisualTransformation.None else PasswordVisualTransformation(),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )

        OutlinedButton(
            onClick = onValidate,
            enabled = state.tvdbApiKey.isNotBlank() && !state.tvdbValidating,
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (state.tvdbValidating) {
                CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                Spacer(Modifier.width(8.dp))
            }
            Text("Validate Key")
        }

        state.tvdbValidateResult?.let { msg ->
            val success = state.tvdbValidateSuccess == true
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = if (success) MaterialTheme.colorScheme.primaryContainer
                                    else MaterialTheme.colorScheme.errorContainer
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(if (success) Icons.Default.CheckCircle else Icons.Default.Error, null,
                        tint = if (success) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error)
                    Text(msg, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedButton(onClick = onBack, modifier = Modifier.weight(1f)) { Text("Back") }
            Button(
                onClick = onFinish,
                enabled = state.tvdbValidateSuccess == true,
                modifier = Modifier.weight(1f),
            ) {
                Icon(Icons.Default.RocketLaunch, null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Get Started")
            }
        }
    }
}
