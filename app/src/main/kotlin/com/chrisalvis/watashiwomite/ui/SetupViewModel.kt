package com.chrisalvis.watashiwomite.ui

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chrisalvis.watashiwomite.data.AppPreferences
import com.chrisalvis.watashiwomite.data.SonarrRepository
import com.chrisalvis.watashiwomite.data.TvdbRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

enum class SetupStep { MAL, SONARR, TVDB }

data class SetupUiState(
    val step: SetupStep = SetupStep.MAL,
    val malIsLoggedIn: Boolean = false,
    val malUsername: String = "",
    val sonarrUrl: String = "",
    val sonarrApiKey: String = "",
    val sonarrTesting: Boolean = false,
    val sonarrTestResult: String? = null,
    val sonarrTestSuccess: Boolean? = null,
    val tvdbApiKey: String = "",
    val tvdbValidating: Boolean = false,
    val tvdbValidateResult: String? = null,
    val tvdbValidateSuccess: Boolean? = null,
    val authUrl: String = "",
    val isGeneratingAuthUrl: Boolean = false,
)

class SetupViewModel(private val context: Context) : ViewModel() {

    private val prefs = AppPreferences(context)
    private val sonarrRepo = SonarrRepository()
    private val tvdbRepo = TvdbRepository()

    private val _uiState = MutableStateFlow(SetupUiState())
    val uiState: StateFlow<SetupUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val isLoggedIn = prefs.malIsLoggedIn.first()
            val username = prefs.malUsername.first()
            val storedSonarrUrl = prefs.sonarrUrl.first()
            val storedSonarrKey = prefs.sonarrApiKey.first()
            val storedTvdbKey = prefs.tvdbApiKey.first()
            _uiState.value = _uiState.value.copy(
                malIsLoggedIn = isLoggedIn,
                malUsername = username,
                sonarrUrl = storedSonarrUrl,
                sonarrApiKey = storedSonarrKey,
                tvdbApiKey = storedTvdbKey,
            )
        }
    }

    fun generateAuthUrl() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isGeneratingAuthUrl = true)
            val repo = com.chrisalvis.watashiwomite.data.MalRepository(context)
            val url = runCatching { repo.buildAuthUrl() }.getOrElse { "" }
            _uiState.value = _uiState.value.copy(authUrl = url, isGeneratingAuthUrl = false)
        }
    }

    fun onMalLoggedIn(username: String) {
        _uiState.value = _uiState.value.copy(malIsLoggedIn = true, malUsername = username)
    }

    fun setSonarrUrl(url: String) {
        _uiState.value = _uiState.value.copy(sonarrUrl = url, sonarrTestResult = null, sonarrTestSuccess = null)
    }

    fun setSonarrApiKey(key: String) {
        _uiState.value = _uiState.value.copy(sonarrApiKey = key, sonarrTestResult = null, sonarrTestSuccess = null)
    }

    fun testSonarr() {
        val url = _uiState.value.sonarrUrl.trim()
        val key = _uiState.value.sonarrApiKey.trim()
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(sonarrTesting = true, sonarrTestResult = null)
            val result = sonarrRepo.testConnection(url, key)
            if (result.isSuccess) {
                prefs.setSonarr(url, key)
                _uiState.value = _uiState.value.copy(
                    sonarrTesting = false,
                    sonarrTestSuccess = true,
                    sonarrTestResult = "Connected! Sonarr v${result.getOrNull()}",
                )
            } else {
                _uiState.value = _uiState.value.copy(
                    sonarrTesting = false,
                    sonarrTestSuccess = false,
                    sonarrTestResult = result.exceptionOrNull()?.message ?: "Connection failed",
                )
            }
        }
    }

    fun setTvdbApiKey(key: String) {
        _uiState.value = _uiState.value.copy(tvdbApiKey = key, tvdbValidateResult = null, tvdbValidateSuccess = null)
    }

    fun validateTvdb() {
        val key = _uiState.value.tvdbApiKey.trim()
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(tvdbValidating = true, tvdbValidateResult = null)
            val result = tvdbRepo.validateApiKey(key)
            if (result.isSuccess) {
                prefs.setTvdbApiKey(key)
                _uiState.value = _uiState.value.copy(
                    tvdbValidating = false,
                    tvdbValidateSuccess = true,
                    tvdbValidateResult = "TVDB API key validated",
                )
            } else {
                _uiState.value = _uiState.value.copy(
                    tvdbValidating = false,
                    tvdbValidateSuccess = false,
                    tvdbValidateResult = result.exceptionOrNull()?.message ?: "Validation failed",
                )
            }
        }
    }

    fun goToStep(step: SetupStep) {
        _uiState.value = _uiState.value.copy(step = step)
    }

    fun completeSetup(onDone: () -> Unit) {
        viewModelScope.launch {
            prefs.setSetupDone(true)
            onDone()
        }
    }
}
