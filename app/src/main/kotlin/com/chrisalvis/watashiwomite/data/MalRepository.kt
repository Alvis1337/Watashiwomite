package com.chrisalvis.watashiwomite.data

import android.content.Context
import android.net.Uri
import android.util.Base64
import com.chrisalvis.watashiwomite.BuildConfig
import com.chrisalvis.watashiwomite.data.api.NetworkClient
import kotlinx.coroutines.flow.first
import retrofit2.HttpException
import java.security.SecureRandom

data class MalAnimeEntry(
    val malId: Int,
    val title: String,
    val status: String,
    val imageUrl: String,
    val mediaType: String = "tv",
    val score: Int = 0,
    val numEpisodes: Int = 0,
)

class MalRepository(private val context: Context) {

    private val prefs = AppPreferences(context)

    companion object {
        const val REDIRECT_URI = "watashiwomite://callback"
        @Volatile private var pendingVerifier: String = ""
    }

    private fun generateCodeVerifier(): String {
        val bytes = ByteArray(64)
        SecureRandom().nextBytes(bytes)
        return Base64.encodeToString(bytes, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
    }

    suspend fun buildAuthUrl(): String {
        val verifier = generateCodeVerifier()
        pendingVerifier = verifier
        prefs.setMalCodeVerifier(verifier)
        return Uri.Builder()
            .scheme("https")
            .authority("myanimelist.net")
            .path("/v1/oauth2/authorize")
            .appendQueryParameter("response_type", "code")
            .appendQueryParameter("client_id", BuildConfig.MAL_CLIENT_ID)
            .appendQueryParameter("redirect_uri", REDIRECT_URI)
            .appendQueryParameter("code_challenge", verifier)
            .appendQueryParameter("code_challenge_method", "plain")
            .build()
            .toString()
    }

    suspend fun exchangeCode(code: String): Result<Unit> = runCatching {
        val verifier = pendingVerifier.ifBlank { prefs.malCodeVerifier.first() }
        check(verifier.isNotBlank()) { "No code verifier — tap Login to start a new session" }
        pendingVerifier = ""

        val resp = NetworkClient.malAuthApi().exchangeCode(
            clientId = BuildConfig.MAL_CLIENT_ID,
            clientSecret = BuildConfig.MAL_CLIENT_SECRET.takeIf { it.isNotBlank() },
            code = code,
            redirectUri = REDIRECT_URI,
            codeVerifier = verifier,
        )
        val username = runCatching { NetworkClient.malApi(resp.accessToken).getMe().name }.getOrDefault("")
        prefs.setMalAuthAndClearVerifier(resp.accessToken, resp.refreshToken, username)
    }

    suspend fun refreshAccessToken(): Result<String> = runCatching {
        val refreshToken = prefs.malRefreshToken.first()
        check(refreshToken.isNotBlank()) { "No refresh token stored" }
        val resp = NetworkClient.malAuthApi().refreshToken(
            clientId = BuildConfig.MAL_CLIENT_ID,
            clientSecret = BuildConfig.MAL_CLIENT_SECRET.takeIf { it.isNotBlank() },
            refreshToken = refreshToken,
        )
        prefs.setMalTokens(resp.accessToken, resp.refreshToken)
        resp.accessToken
    }

    suspend fun fetchAnimeList(statuses: Set<String>): Result<List<MalAnimeEntry>> = runCatching {
        var token = prefs.malAccessToken.first()
        check(token.isNotBlank()) { "Not authenticated with MAL" }
        try {
            fetchWithToken(token, statuses)
        } catch (e: HttpException) {
            if (e.code() == 401) {
                token = refreshAccessToken().getOrThrow()
                fetchWithToken(token, statuses)
            } else throw e
        }
    }

    private suspend fun fetchWithToken(token: String, statuses: Set<String>): List<MalAnimeEntry> {
        val service = NetworkClient.malApi(token)
        val entries = mutableListOf<MalAnimeEntry>()
        val fields = "list_status,main_picture,num_episodes,media_type"

        for (status in statuses) {
            var response = service.getAnimeList(status = status, fields = fields)
            while (true) {
                response.data.forEach { item ->
                    val node = item.node
                    val imageUrl = node.mainPicture?.large?.takeIf { it.isNotBlank() }
                        ?: node.mainPicture?.medium?.takeIf { it.isNotBlank() }
                        ?: ""
                    entries.add(MalAnimeEntry(
                        malId = node.id,
                        title = node.title,
                        status = item.listStatus.status.ifBlank { status },
                        imageUrl = imageUrl,
                        mediaType = node.mediaType,
                        score = item.listStatus.score,
                        numEpisodes = node.numEpisodes,
                    ))
                }
                val nextUrl = response.paging.next ?: break
                response = service.getAnimeListByUrl(nextUrl)
            }
        }
        return entries.distinctBy { it.malId }
    }

    suspend fun updateListStatus(malId: Int, status: String): Result<Unit> = runCatching {
        var token = prefs.malAccessToken.first()
        check(token.isNotBlank()) { "Not authenticated with MAL" }
        try {
            NetworkClient.malApi(token).updateListStatus(malId, status)
        } catch (e: HttpException) {
            if (e.code() == 401) {
                token = refreshAccessToken().getOrThrow()
                NetworkClient.malApi(token).updateListStatus(malId, status)
            } else throw e
        }
        Unit
    }
}
