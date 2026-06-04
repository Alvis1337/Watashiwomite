package com.chrisalvis.watashiwomite.data

import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.FileProvider
import com.chrisalvis.watashiwomite.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File

data class UpdateInfo(
    val versionCode: Int,
    val versionName: String,
    val releaseNotes: String,
    val downloadUrl: String,
    val tagName: String,
)

sealed class UpdateCheckResult {
    data object UpToDate : UpdateCheckResult()
    data class UpdateAvailable(val info: UpdateInfo) : UpdateCheckResult()
    data class Error(val message: String) : UpdateCheckResult()
}

sealed class DownloadState {
    data object Idle : DownloadState()
    data class Progress(val percent: Int) : DownloadState()
    data object Installing : DownloadState()
    data class Failed(val message: String) : DownloadState()
}

object UpdateRepository {
    private const val RELEASES_URL =
        "https://api.github.com/repos/Alvis1337/Watashiwomite/releases/latest"
    private const val TAG = "UpdateRepository"

    private val http = OkHttpClient()

    suspend fun checkForUpdate(): UpdateCheckResult = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url(RELEASES_URL)
                .header("Accept", "application/vnd.github+json")
                .build()

            val body = http.newCall(request).execute().use { resp ->
                if (!resp.isSuccessful) return@withContext UpdateCheckResult.Error("HTTP ${resp.code}")
                resp.body?.string() ?: return@withContext UpdateCheckResult.Error("Empty response")
            }

            val json = JSONObject(body)
            val tagName = json.optString("tag_name", "")
            val releaseNotes = json.optString("body", "").trim()

            val remoteVersionCode = tagName.trimStart('v').substringAfterLast('.').toIntOrNull()
                ?: return@withContext UpdateCheckResult.Error("Unrecognised tag: $tagName")

            val versionName = tagName.trimStart('v')

            val assets = json.optJSONArray("assets") ?: return@withContext UpdateCheckResult.Error("No assets")
            var downloadUrl: String? = null
            for (i in 0 until assets.length()) {
                val asset = assets.getJSONObject(i)
                val name = asset.optString("name", "")
                if (name.endsWith(".apk")) {
                    downloadUrl = asset.optString("browser_download_url")
                    break
                }
            }
            downloadUrl ?: return@withContext UpdateCheckResult.Error("No APK asset in release")

            if (remoteVersionCode <= BuildConfig.VERSION_CODE) {
                return@withContext UpdateCheckResult.UpToDate
            }

            UpdateCheckResult.UpdateAvailable(
                UpdateInfo(
                    versionCode = remoteVersionCode,
                    versionName = versionName,
                    releaseNotes = releaseNotes,
                    downloadUrl = downloadUrl,
                    tagName = tagName,
                )
            )
        } catch (e: Exception) {
            Log.e(TAG, "Update check failed", e)
            UpdateCheckResult.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun downloadAndInstall(
        context: Context,
        info: UpdateInfo,
        onProgress: (DownloadState) -> Unit,
    ) = withContext(Dispatchers.IO) {
        try {
            val destFile = File(context.getExternalFilesDir(null), "watashiwomite-update.apk")
            if (destFile.exists()) destFile.delete()

            val request = Request.Builder().url(info.downloadUrl).build()
            http.newCall(request).execute().use { resp ->
                if (!resp.isSuccessful) {
                    onProgress(DownloadState.Failed("HTTP ${resp.code}"))
                    return@withContext
                }
                val body = resp.body ?: run {
                    onProgress(DownloadState.Failed("Empty response"))
                    return@withContext
                }
                val total = body.contentLength()
                var downloaded = 0L
                destFile.outputStream().use { out ->
                    body.byteStream().use { input ->
                        val buf = ByteArray(8 * 1024)
                        var read: Int
                        while (input.read(buf).also { read = it } != -1) {
                            out.write(buf, 0, read)
                            downloaded += read
                            if (total > 0) {
                                val pct = (downloaded * 100 / total).toInt()
                                onProgress(DownloadState.Progress(pct))
                            }
                        }
                    }
                }
            }

            onProgress(DownloadState.Installing)

            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                destFile,
            )
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Download failed", e)
            onProgress(DownloadState.Failed(e.message ?: "Download failed"))
        }
    }
}
