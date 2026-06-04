package com.chrisalvis.watashiwomite.ui

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chrisalvis.watashiwomite.data.AppPreferences
import com.chrisalvis.watashiwomite.data.SonarrQualityProfile
import com.chrisalvis.watashiwomite.data.SonarrRepository
import com.chrisalvis.watashiwomite.data.SonarrRootFolder
import com.chrisalvis.watashiwomite.data.TvdbRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

data class SettingsUiState(
    val malUsername: String = "",
    val malIsLoggedIn: Boolean = false,
    val malClientId: String = "",
    val sonarrUrl: String = "",
    val sonarrApiKey: String = "",
    val sonarrRootFolder: String = "",
    val sonarrQualityProfileId: String = "1",
    val rootFolders: List<SonarrRootFolder> = emptyList(),
    val qualityProfiles: List<SonarrQualityProfile> = emptyList(),
    val tvdbApiKey: String = "",
    val isTesting: Boolean = false,
    val testResult: String? = null,
    val testSuccess: Boolean? = null,
    val isTvdbValidating: Boolean = false,
    val tvdbResult: String? = null,
    val tvdbSuccess: Boolean? = null,
    val logoutSuccess: Boolean = false,
)

class SettingsViewModel(private val context: Context) : ViewModel() {

    private val prefs = AppPreferences(context)
    private val sonarrRepo = SonarrRepository()
    private val tvdbRepo = TvdbRepository()

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            _uiState.value = SettingsUiState(
                malUsername = prefs.malUsername.first(),
                malIsLoggedIn = prefs.malIsLoggedIn.first(),
                malClientId = prefs.malClientId.first(),
                sonarrUrl = prefs.sonarrUrl.first(),
                sonarrApiKey = prefs.sonarrApiKey.first(),
                sonarrRootFolder = prefs.sonarrRootFolder.first(),
                sonarrQualityProfileId = prefs.sonarrQualityProfileId.first(),
                tvdbApiKey = prefs.tvdbApiKey.first(),
            )
        }
    }

    fun setMalClientId(id: String) {
        _uiState.value = _uiState.value.copy(malClientId = id)
    }

    fun saveMalClientId() {
        viewModelScope.launch {
            prefs.setMalClientCredentials(_uiState.value.malClientId.trim(), "")
        }
    }

    fun setSonarrUrl(url: String) {
        _uiState.value = _uiState.value.copy(sonarrUrl = url, testResult = null)
    }

    fun setSonarrApiKey(key: String) {
        _uiState.value = _uiState.value.copy(sonarrApiKey = key, testResult = null)
    }

    fun setRootFolder(path: String) {
        _uiState.value = _uiState.value.copy(sonarrRootFolder = path)
        viewModelScope.launch { prefs.setSonarrRootFolder(path) }
    }

    fun setQualityProfileId(id: String) {
        _uiState.value = _uiState.value.copy(sonarrQualityProfileId = id)
        viewModelScope.launch { prefs.setSonarrQualityProfileId(id) }
    }

    fun setTvdbApiKey(key: String) {
        _uiState.value = _uiState.value.copy(tvdbApiKey = key, tvdbResult = null)
    }

    fun saveSonarr() {
        val url = _uiState.value.sonarrUrl.trim()
        val key = _uiState.value.sonarrApiKey.trim()
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isTesting = true, testResult = null)
            val result = sonarrRepo.testConnection(url, key)
            if (result.isSuccess) {
                prefs.setSonarr(url, key)
                val folders = sonarrRepo.getRootFolders(url, key).getOrDefault(emptyList())
                val profiles = sonarrRepo.getQualityProfiles(url, key).getOrDefault(emptyList())
                _uiState.value = _uiState.value.copy(
                    isTesting = false,
                    testSuccess = true,
                    testResult = "Connected — Sonarr v${result.getOrNull()}",
                    rootFolders = folders,
                    qualityProfiles = profiles,
                )
            } else {
                _uiState.value = _uiState.value.copy(
                    isTesting = false,
                    testSuccess = false,
                    testResult = result.exceptionOrNull()?.message ?: "Connection failed",
                )
            }
        }
    }

    fun saveTvdb() {
        val key = _uiState.value.tvdbApiKey.trim()
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isTvdbValidating = true, tvdbResult = null)
            val result = tvdbRepo.validateApiKey(key)
            if (result.isSuccess) {
                prefs.setTvdbApiKey(key)
                _uiState.value = _uiState.value.copy(
                    isTvdbValidating = false,
                    tvdbSuccess = true,
                    tvdbResult = "TVDB API key saved",
                )
            } else {
                _uiState.value = _uiState.value.copy(
                    isTvdbValidating = false,
                    tvdbSuccess = false,
                    tvdbResult = result.exceptionOrNull()?.message ?: "Validation failed",
                )
            }
        }
    }

    fun logoutMal(onLoggedOut: () -> Unit) {
        viewModelScope.launch {
            prefs.clearMalAuth()
            prefs.setSetupDone(false)
            onLoggedOut()
        }
    }
}
