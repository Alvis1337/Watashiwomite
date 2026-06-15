package com.chrisalvis.watashiwomite.data

import com.chrisalvis.watashiwomite.data.api.NetworkClient
import com.chrisalvis.watashiwomite.data.api.SonarrAddOptions
import com.chrisalvis.watashiwomite.data.api.SonarrAddSeriesRequest
import com.chrisalvis.watashiwomite.data.api.SonarrCommandRequest
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject

data class SonarrSeries(
    val id: Int,
    val tvdbId: Int,
    val title: String,
    val titleSlug: String = "",
    val alternateTitles: List<String> = emptyList(),
    val episodeFileCount: Int = 0,
    val episodeCount: Int = 0,
    val totalEpisodeCount: Int = 0,
    val percentOfEpisodes: Double = 0.0,
    val monitored: Boolean = true,
    val sonarrStatus: String = "",
)

data class SonarrRootFolder(val id: Int, val path: String, val freeSpace: Long)

data class SonarrQualityProfile(val id: Int, val name: String)

class SonarrRepository {

    suspend fun testConnection(url: String, apiKey: String): Result<String> = runCatching {
        NetworkClient.sonarrApi(url, apiKey).getStatus().version
    }

    suspend fun getSeries(url: String, apiKey: String): Result<List<SonarrSeries>> = runCatching {
        NetworkClient.sonarrApi(url, apiKey).getSeries().map { item ->
            SonarrSeries(
                id = item.id,
                tvdbId = item.tvdbId,
                title = item.title,
                titleSlug = item.titleSlug,
                alternateTitles = item.alternateTitles.map { it.title },
                episodeFileCount = item.statistics?.episodeFileCount ?: 0,
                episodeCount = item.statistics?.episodeCount ?: 0,
                totalEpisodeCount = item.statistics?.totalEpisodeCount ?: 0,
                percentOfEpisodes = item.statistics?.percentOfEpisodes ?: 0.0,
                monitored = item.monitored,
                sonarrStatus = item.status,
            )
        }
    }

    suspend fun getRootFolders(url: String, apiKey: String): Result<List<SonarrRootFolder>> = runCatching {
        NetworkClient.sonarrApi(url, apiKey).getRootFolders().map {
            SonarrRootFolder(it.id, it.path, it.freeSpace)
        }
    }

    suspend fun getQualityProfiles(url: String, apiKey: String): Result<List<SonarrQualityProfile>> = runCatching {
        NetworkClient.sonarrApi(url, apiKey).getQualityProfiles().map {
            SonarrQualityProfile(it.id, it.name)
        }
    }

    suspend fun addSeries(
        url: String,
        apiKey: String,
        tvdbId: Int,
        title: String,
        rootFolderPath: String,
        qualityProfileId: Int,
        monitored: Boolean = true,
    ): Result<Int> = runCatching {
        val body = SonarrAddSeriesRequest(
            tvdbId = tvdbId,
            title = title,
            qualityProfileId = qualityProfileId,
            rootFolderPath = rootFolderPath,
            monitored = monitored,
            addOptions = SonarrAddOptions(searchForMissingEpisodes = false, monitor = "all"),
        )
        NetworkClient.sonarrApi(url, apiKey).addSeries(body).id
    }

    suspend fun removeSeries(
        url: String,
        apiKey: String,
        seriesId: Int,
        deleteFiles: Boolean = false,
    ): Result<Unit> = runCatching {
        NetworkClient.sonarrApi(url, apiKey).deleteSeries(seriesId, deleteFiles)
    }

    suspend fun setMonitored(
        url: String,
        apiKey: String,
        seriesId: Int,
        monitored: Boolean,
    ): Result<Unit> = runCatching {
        val service = NetworkClient.sonarrApi(url, apiKey)
        val raw = service.getSeriesJson(seriesId).jsonObject.toMutableMap()
        raw["monitored"] = JsonPrimitive(monitored)
        service.updateSeriesJson(seriesId, kotlinx.serialization.json.JsonObject(raw))
        Unit
    }

    suspend fun sendCommand(url: String, apiKey: String, name: String): Result<Unit> = runCatching {
        NetworkClient.sonarrApi(url, apiKey).sendCommand(SonarrCommandRequest(name))
    }
}
