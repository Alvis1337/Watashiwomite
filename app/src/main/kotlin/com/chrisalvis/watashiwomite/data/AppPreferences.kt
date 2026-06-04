package com.chrisalvis.watashiwomite.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import org.json.JSONArray

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "womi_prefs")

class AppPreferences(private val context: Context) {

    companion object {
        val SETUP_DONE = booleanPreferencesKey("setup_done")

        // MAL API credentials (user-entered, override BuildConfig values)
        val MAL_CLIENT_ID_KEY = stringPreferencesKey("mal_client_id")
        val MAL_CLIENT_SECRET_KEY = stringPreferencesKey("mal_client_secret")

        // MAL auth
        val MAL_ACCESS_TOKEN = stringPreferencesKey("mal_access_token")
        val MAL_REFRESH_TOKEN = stringPreferencesKey("mal_refresh_token")
        val MAL_USERNAME = stringPreferencesKey("mal_username")
        val MAL_CODE_VERIFIER = stringPreferencesKey("mal_code_verifier")

        // Sonarr
        val SONARR_URL = stringPreferencesKey("sonarr_url")
        val SONARR_API_KEY = stringPreferencesKey("sonarr_api_key")
        val SONARR_ROOT_FOLDER = stringPreferencesKey("sonarr_root_folder")
        val SONARR_QUALITY_PROFILE_ID = stringPreferencesKey("sonarr_quality_profile_id")

        // TVDB
        val TVDB_API_KEY = stringPreferencesKey("tvdb_api_key")

        // Sync configuration — JSON array of status strings e.g. ["watching","plan_to_watch"]
        val SYNC_STATUSES = stringPreferencesKey("sync_statuses")

        // Sync result cache — JSON array of SyncEntry objects
        val SYNC_DATA_JSON = stringPreferencesKey("sync_data_json")
        val LAST_SYNC_MS = stringPreferencesKey("last_sync_ms")

        val DEFAULT_STATUSES = setOf("watching", "plan_to_watch")
    }

    // ── MAL API credentials ────────────────────────────────────────────────────

    val malClientId: Flow<String> = context.dataStore.data
        .catch { emit(emptyPreferences()) }
        .map { it[MAL_CLIENT_ID_KEY] ?: "" }

    val malClientSecret: Flow<String> = context.dataStore.data
        .catch { emit(emptyPreferences()) }
        .map { it[MAL_CLIENT_SECRET_KEY] ?: "" }

    suspend fun setMalClientCredentials(clientId: String, clientSecret: String) {
        context.dataStore.edit { prefs ->
            prefs[MAL_CLIENT_ID_KEY] = clientId.trim()
            prefs[MAL_CLIENT_SECRET_KEY] = clientSecret.trim()
        }
    }

    // ── Setup ──────────────────────────────────────────────────────────────────

    val setupDone: Flow<Boolean?> = context.dataStore.data
        .catch { emit(emptyPreferences()) }
        .map { it[SETUP_DONE] ?: false }

    suspend fun setSetupDone(done: Boolean) {
        context.dataStore.edit { it[SETUP_DONE] = done }
    }

    // ── MAL auth ───────────────────────────────────────────────────────────────

    val malAccessToken: Flow<String> = context.dataStore.data
        .catch { emit(emptyPreferences()) }
        .map { it[MAL_ACCESS_TOKEN] ?: "" }

    val malRefreshToken: Flow<String> = context.dataStore.data
        .catch { emit(emptyPreferences()) }
        .map { it[MAL_REFRESH_TOKEN] ?: "" }

    val malUsername: Flow<String> = context.dataStore.data
        .catch { emit(emptyPreferences()) }
        .map { it[MAL_USERNAME] ?: "" }

    val malCodeVerifier: Flow<String> = context.dataStore.data
        .catch { emit(emptyPreferences()) }
        .map { it[MAL_CODE_VERIFIER] ?: "" }

    val malIsLoggedIn: Flow<Boolean> = malAccessToken.map { it.isNotBlank() }

    suspend fun setMalCodeVerifier(verifier: String) {
        context.dataStore.edit { it[MAL_CODE_VERIFIER] = verifier }
    }

    suspend fun setMalAuthAndClearVerifier(accessToken: String, refreshToken: String, username: String) {
        context.dataStore.edit { prefs ->
            prefs[MAL_ACCESS_TOKEN] = accessToken
            prefs[MAL_REFRESH_TOKEN] = refreshToken
            prefs[MAL_USERNAME] = username
            prefs.remove(MAL_CODE_VERIFIER)
        }
    }

    suspend fun setMalTokens(accessToken: String, refreshToken: String) {
        context.dataStore.edit { prefs ->
            prefs[MAL_ACCESS_TOKEN] = accessToken
            prefs[MAL_REFRESH_TOKEN] = refreshToken
        }
    }

    suspend fun clearMalAuth() {
        context.dataStore.edit { prefs ->
            prefs.remove(MAL_ACCESS_TOKEN)
            prefs.remove(MAL_REFRESH_TOKEN)
            prefs.remove(MAL_USERNAME)
            prefs.remove(MAL_CODE_VERIFIER)
        }
    }

    // ── Sonarr ─────────────────────────────────────────────────────────────────

    val sonarrUrl: Flow<String> = context.dataStore.data
        .catch { emit(emptyPreferences()) }
        .map { it[SONARR_URL] ?: "" }

    val sonarrApiKey: Flow<String> = context.dataStore.data
        .catch { emit(emptyPreferences()) }
        .map { it[SONARR_API_KEY] ?: "" }

    val sonarrRootFolder: Flow<String> = context.dataStore.data
        .catch { emit(emptyPreferences()) }
        .map { it[SONARR_ROOT_FOLDER] ?: "" }

    val sonarrQualityProfileId: Flow<String> = context.dataStore.data
        .catch { emit(emptyPreferences()) }
        .map { it[SONARR_QUALITY_PROFILE_ID] ?: "1" }

    suspend fun setSonarr(url: String, apiKey: String) {
        context.dataStore.edit { prefs ->
            prefs[SONARR_URL] = url.trimEnd('/')
            prefs[SONARR_API_KEY] = apiKey
        }
    }

    suspend fun setSonarrRootFolder(path: String) {
        context.dataStore.edit { it[SONARR_ROOT_FOLDER] = path }
    }

    suspend fun setSonarrQualityProfileId(id: String) {
        context.dataStore.edit { it[SONARR_QUALITY_PROFILE_ID] = id }
    }

    // ── TVDB ───────────────────────────────────────────────────────────────────

    val tvdbApiKey: Flow<String> = context.dataStore.data
        .catch { emit(emptyPreferences()) }
        .map { it[TVDB_API_KEY] ?: "" }

    suspend fun setTvdbApiKey(key: String) {
        context.dataStore.edit { it[TVDB_API_KEY] = key }
    }

    // ── Sync config ────────────────────────────────────────────────────────────

    val syncStatuses: Flow<Set<String>> = context.dataStore.data
        .catch { emit(emptyPreferences()) }
        .map { prefs ->
            val json = prefs[SYNC_STATUSES] ?: return@map DEFAULT_STATUSES
            runCatching {
                val arr = JSONArray(json)
                List(arr.length()) { arr.getString(it) }.toSet()
            }.getOrDefault(DEFAULT_STATUSES)
        }

    suspend fun setSyncStatuses(statuses: Set<String>) {
        context.dataStore.edit { it[SYNC_STATUSES] = JSONArray(statuses.toList()).toString() }
    }

    // ── Sync data cache ────────────────────────────────────────────────────────

    val syncDataJson: Flow<String> = context.dataStore.data
        .catch { emit(emptyPreferences()) }
        .map { it[SYNC_DATA_JSON] ?: "[]" }

    val lastSyncMs: Flow<String> = context.dataStore.data
        .catch { emit(emptyPreferences()) }
        .map { it[LAST_SYNC_MS] ?: "" }

    suspend fun setSyncData(json: String, timestampMs: Long) {
        context.dataStore.edit { prefs ->
            prefs[SYNC_DATA_JSON] = json
            prefs[LAST_SYNC_MS] = timestampMs.toString()
        }
    }
}
