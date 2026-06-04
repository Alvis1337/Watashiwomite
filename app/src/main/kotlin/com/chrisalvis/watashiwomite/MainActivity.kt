package com.chrisalvis.watashiwomite

import android.content.Intent
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.chrisalvis.watashiwomite.data.AppPreferences
import com.chrisalvis.watashiwomite.ui.*
import com.chrisalvis.watashiwomite.ui.theme.WomiTheme

class MainActivity : AppCompatActivity() {

    // Compose-observable state — onNewIntent can set this and Compose will react
    private val _pendingMalCode = mutableStateOf<String?>(null)

    // Direct ViewModel ref so onNewIntent can dispatch immediately (mirrors rotato)
    private lateinit var setupVmRef: SetupViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        _pendingMalCode.value = extractMalCode(intent)
        setContent { WomiApp() }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val code = extractMalCode(intent) ?: return
        if (::setupVmRef.isInitialized) {
            setupVmRef.handleMalCallback(code)
        } else {
            _pendingMalCode.value = code
        }
    }

    private fun extractMalCode(intent: Intent): String? {
        val uri = intent.data ?: return null
        return if (uri.scheme == "watashiwomite" && uri.host == "callback")
            uri.getQueryParameter("code")
        else null
    }

    @Composable
    private fun WomiApp() {
        WomiTheme {
            val context = LocalContext.current
            val prefs = remember { AppPreferences(context) }
            val setupDone by prefs.setupDone.collectAsStateWithLifecycle(initialValue = null)

            if (setupDone == null) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.background),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        Icon(
                            Icons.Default.SyncAlt, null,
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.primary,
                        )
                        CircularProgressIndicator(strokeWidth = 2.dp)
                    }
                }
                return@WomiTheme
            }

            val navController = rememberNavController()
            val navBackStack by navController.currentBackStackEntryAsState()
            val currentRoute = navBackStack?.destination?.route

            val setupVm = remember { SetupViewModel(context) }
            val dashboardVm = remember { DashboardViewModel(context) }
            val syncVm = remember { SyncViewModel(context) }
            val settingsVm = remember { SettingsViewModel(context) }

            // Assign ref so onNewIntent can dispatch directly (same as rotato's malViewModelRef)
            setupVmRef = setupVm

            // Drain any code that arrived before the ViewModel was ready
            val pendingCode = _pendingMalCode.value
            LaunchedEffect(pendingCode) {
                val code = pendingCode ?: return@LaunchedEffect
                _pendingMalCode.value = null
                setupVm.handleMalCallback(code)
            }

            val selectedTab = when (currentRoute) {
                "dashboard" -> 0
                "sync" -> 1
                "settings" -> 2
                else -> 0
            }
            val showBottomBar = currentRoute in setOf("dashboard", "sync", "settings")

            Scaffold(
                contentWindowInsets = WindowInsets(0),
                bottomBar = {
                    if (showBottomBar) {
                        NavigationBar {
                            NavigationBarItem(
                                selected = selectedTab == 0,
                                onClick = {
                                    navController.navigate("dashboard") {
                                        popUpTo("dashboard") { inclusive = false }
                                        launchSingleTop = true
                                    }
                                },
                                icon = { Icon(Icons.Default.Dashboard, null) },
                                label = { Text("Dashboard") },
                            )
                            NavigationBarItem(
                                selected = selectedTab == 1,
                                onClick = {
                                    navController.navigate("sync") {
                                        popUpTo("dashboard") { saveState = true }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                                icon = { Icon(Icons.Default.Sync, null) },
                                label = { Text("Sync") },
                            )
                            NavigationBarItem(
                                selected = selectedTab == 2,
                                onClick = {
                                    navController.navigate("settings") {
                                        popUpTo("dashboard") { saveState = true }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                                icon = { Icon(Icons.Default.Settings, null) },
                                label = { Text("Settings") },
                            )
                        }
                    }
                }
            ) { paddingValues ->
                NavHost(
                    navController = navController,
                    startDestination = if (setupDone == true) "dashboard" else "setup",
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                ) {
                    composable("setup") {
                        SetupScreen(
                            vm = setupVm,
                            onSetupComplete = {
                                navController.navigate("dashboard") {
                                    popUpTo("setup") { inclusive = true }
                                }
                            }
                        )
                    }
                    composable("dashboard") { DashboardScreen(vm = dashboardVm) }
                    composable("sync") {
                        SyncScreen(
                            vm = syncVm,
                            onSyncComplete = {
                                dashboardVm.loadCachedData()
                                navController.navigate("dashboard") {
                                    popUpTo("dashboard") { inclusive = false }
                                    launchSingleTop = true
                                }
                            },
                        )
                    }
                    composable("settings") {
                        SettingsScreen(
                            vm = settingsVm,
                            onSetupAgain = {
                                navController.navigate("setup") {
                                    popUpTo(0) { inclusive = true }
                                }
                            },
                        )
                    }
                }
            }
        }
    }
}
