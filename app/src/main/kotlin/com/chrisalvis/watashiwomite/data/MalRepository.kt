package com.chrisalvis.watashiwomite.data

import android.content.Context
import android.net.Uri
import android.util.Base64
import com.chrisalvis.watashiwomite.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import okhttp3.FormBody
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.IOException
import java.security.MessageDigest
import java.security.SecureRandom

data class MalAnimeEntry(
    val malId: Int,
    val title: String,
    val status: String,
    val imageUrl: String,
)

class MalRepository(private val context: Context) {

    private val prefs = AppPreferences(context)
    private val http = OkHttpClient()

    companion object {
        const val REDIRECT_URI = "watashiwomite://callback"
    }

    private fun generateCodeVerifier(): String {
        val bytes = ByteArray(64)
        SecureRandom().nextBytes(bytes)
        return Base64.encodeToString(bytes, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
    }

    private fun generateCodeChallenge(verifier: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(verifier.toByteArray(Charsets.US_ASCII))
        return Base64.encodeToString(digest, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
    }

    suspend fun buildAuthUrl(): String {
        val verifier = generateCodeVerifier()
        prefs.setMalCodeVerifier(verifier)
        return Uri.Builder()
            .scheme("https")
            .authority("myanimelist.net")
            .path("/v1/oauth2/authorize")
            .appendQueryParameter("response_type", "code")
            .appendQueryParameter("client_id", BuildConfig.MAL_CLIENT_ID)
            .appendQueryParameter("redirect_uri", REDIRECT_URI)
            .appendQueryParameter("code_challenge", generateCodeChallenge(verifier))
            .appendQueryParameter("code_challenge_method", "S256")
            .build()
            .toString()
    }

    suspend fun exchangeCode(code: String): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val verifier = prefs.malCodeVerifier.first()
            check(verifier.isNotBlank()) { "No code verifier stored — please restart the login flow" }

            val bodyBuilder = FormBody.Builder()
                .add("client_id", BuildConfig.MAL_CLIENT_ID)
                .add("grant_type", "authorization_code")
                .add("code", code)
                .add("redirect_uri", REDIRECT_URI)
                .add("code_verifier", verifier)
            if (BuildConfig.MAL_CLIENT_SECRET.isNotBlank()) {
                bodyBuilder.add("client_secret", BuildConfig.MAL_CLIENT_SECRET)
            }

            val req = Request.Builder()
                .url("https://myanimelist.net/v1/oauth2/token")
                .post(bodyBuilder.build())
                .build()

            http.newCall(req).execute().use { resp ->
                val body = resp.body?.string() ?: ""
                if (!resp.isSuccessful) {
                    val hint = when {
                        resp.code == 401 || body.contains("invalid_client") ->
                            "MAL rejected the request (invalid_client).\n\n" +
                            "Make sure \"$REDIRECT_URI\" is registered in your MAL app at myanimelist.net/apiconfig."
                        body.contains("invalid_grant") ->
                            "Authorization code expired or already used — tap Login again."
                        else -> "Token exchange failed (${resp.code}): $body"
                    }
                    error(hint)
                }
                val json = JSONObject(body)
                val accessToken = json.getString("access_token")
                val refreshToken = json.getString("refresh_token")
                val username = runCatching { fetchUsername(accessToken) }.getOrDefault("")
                prefs.setMalAuthAndClearVerifier(accessToken, refreshToken, username)
            }
        }
    }

    private fun fetchUsername(token: String): String {
        val req = Request.Builder()
            .url("https://api.myanimelist.net/v2/users/@me")
            .header("Authorization", "Bearer $token")
            .build()
        http.newCall(req).execute().use { resp ->
            check(resp.isSuccessful) { "Failed to fetch user: ${resp.code}" }
            return JSONObject(resp.body?.string() ?: throw IOException("Empty user response")).getString("name")
        }
    }

    suspend fun refreshAccessToken(): Result<String> = withContext(Dispatchers.IO) {
        runCatching {
            val refreshToken = prefs.malRefreshToken.first()
            check(refreshToken.isNotBlank()) { "No refresh token stored" }

            val bodyBuilder = FormBody.Builder()
                .add("grant_type", "refresh_token")
                .add("refresh_token", refreshToken)
                .add("client_id", BuildConfig.MAL_CLIENT_ID)
            if (BuildConfig.MAL_CLIENT_SECRET.isNotBlank()) {
                bodyBuilder.add("client_secret", BuildConfig.MAL_CLIENT_SECRET)
            }

            val req = Request.Builder()
                .url("https://myanimelist.net/v1/oauth2/token")
                .post(bodyBuilder.build())
                .build()

            http.newCall(req).execute().use { resp ->
                check(resp.isSuccessful) { "Refresh failed: ${resp.code}" }
                val json = JSONObject(resp.body?.string() ?: throw IOException("Empty refresh response"))
                val newAccess = json.getString("access_token")
                val newRefresh = json.getString("refresh_token")
                prefs.setMalTokens(newAccess, newRefresh)
                newAccess
            }
        }
    }

    /** Fetches anime list for the given statuses. Retries once after token refresh on 401. */
    suspend fun fetchAnimeList(statuses: Set<String>): Result<List<MalAnimeEntry>> = withContext(Dispatchers.IO) {
        runCatching {
            var token = prefs.malAccessToken.first()
            check(token.isNotBlank()) { "Not authenticated with MAL" }

            val result = fetchWithToken(token, statuses)
            if (result.isFailure && result.exceptionOrNull()?.message == "TOKEN_EXPIRED") {
                token = refreshAccessToken().getOrThrow()
                fetchWithToken(token, statuses).getOrThrow()
            } else {
                result.getOrThrow()
            }
        }
    }

    private fun fetchWithToken(token: String, statuses: Set<String>): Result<List<MalAnimeEntry>> = runCatching {
        val entries = mutableListOf<MalAnimeEntry>()
        for (status in statuses) {
            var url: String? = "https://api.myanimelist.net/v2/users/@me/animelist" +
                "?status=$status&fields=list_status,main_picture&limit=500"
            while (url != null) {
                val req = Request.Builder()
                    .url(url)
                    .header("Authorization", "Bearer $token")
                    .build()
                http.newCall(req).execute().use { resp ->
                    if (resp.code == 401) throw Exception("TOKEN_EXPIRED")
                    check(resp.isSuccessful) { "MAL list fetch failed: ${resp.code}" }
                    val json = JSONObject(resp.body?.string() ?: throw IOException("Empty response"))
                    val data = json.getJSONArray("data")
                    for (i in 0 until data.length()) {
                        val item = data.getJSONObject(i)
                        val node = item.getJSONObject("node")
                        val malId = node.getInt("id")
                        val title = node.getString("title")
                        val imageUrl = node.optJSONObject("main_picture")
                            ?.optString("medium") ?: ""
                        val listStatus = item.optJSONObject("list_status")
                            ?.optString("status") ?: status
                        entries.add(MalAnimeEntry(malId, title, listStatus, imageUrl))
                    }
                    url = json.optJSONObject("paging")?.optString("next")?.takeIf { it.isNotBlank() }
                }
            }
        }
        entries.distinctBy { it.malId }
    }
}
