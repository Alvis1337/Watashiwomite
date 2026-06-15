package com.chrisalvis.watashiwomite.data.api

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ── MAL ───────────────────────────────────────────────────────────────────────

@Serializable
data class MalTokenResponse(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
)

@Serializable
data class MalUserResponse(val name: String)

@Serializable
data class MalAnimeListResponse(
    val data: List<MalAnimeListItem> = emptyList(),
    val paging: MalPaging = MalPaging(),
)

@Serializable
data class MalAnimeListItem(
    val node: MalAnimeNode,
    @SerialName("list_status") val listStatus: MalListStatus = MalListStatus(),
)

@Serializable
data class MalAnimeNode(
    val id: Int,
    val title: String,
    @SerialName("main_picture") val mainPicture: MalPicture? = null,
    @SerialName("media_type") val mediaType: String = "tv",
    @SerialName("num_episodes") val numEpisodes: Int = 0,
)

@Serializable
data class MalPicture(
    val large: String? = null,
    val medium: String? = null,
)

@Serializable
data class MalListStatus(
    val status: String = "",
    val score: Int = 0,
)

@Serializable
data class MalPaging(val next: String? = null)

@Serializable
data class MalUpdateStatusResponse(
    val status: String = "",
    val score: Int = 0,
)

// ── Sonarr ────────────────────────────────────────────────────────────────────

@Serializable
data class SonarrStatusResponse(val version: String = "")

@Serializable
data class SonarrSeasonItem(
    val seasonNumber: Int = 0,
    val monitored: Boolean = false,
    val statistics: SonarrStatisticsResponse? = null,
)

@Serializable
data class SonarrSeriesListItem(
    val id: Int = 0,
    val tvdbId: Int = -1,
    val title: String = "",
    val titleSlug: String = "",
    val alternateTitles: List<SonarrAltTitle> = emptyList(),
    val seasons: List<SonarrSeasonItem> = emptyList(),
    val statistics: SonarrStatisticsResponse? = null,
    val monitored: Boolean = true,
    val status: String = "",
)

@Serializable
data class SonarrAltTitle(val title: String = "")

@Serializable
data class SonarrStatisticsResponse(
    val episodeFileCount: Int = 0,
    val episodeCount: Int = 0,
    val totalEpisodeCount: Int = 0,
    val percentOfEpisodes: Double = 0.0,
)

@Serializable
data class SonarrRootFolderResponse(
    val id: Int = 0,
    val path: String = "",
    val freeSpace: Long = 0,
)

@Serializable
data class SonarrQualityProfileResponse(
    val id: Int = 0,
    val name: String = "",
)

@Serializable
data class SonarrAddSeriesRequest(
    val tvdbId: Int,
    val title: String,
    val qualityProfileId: Int,
    val rootFolderPath: String,
    val monitored: Boolean,
    val seasonFolder: Boolean = true,
    val addOptions: SonarrAddOptions,
)

@Serializable
data class SonarrAddOptions(
    val searchForMissingEpisodes: Boolean = false,
    val monitor: String = "all",
)

@Serializable
data class SonarrAddSeriesResponse(
    val id: Int = 0,
    val tvdbId: Int = -1,
    val title: String = "",
)

@Serializable
data class SonarrCommandRequest(val name: String)

// ── TVDB ──────────────────────────────────────────────────────────────────────

@Serializable
data class TvdbLoginRequest(val apikey: String)

@Serializable
data class TvdbLoginResponse(val data: TvdbTokenData)

@Serializable
data class TvdbTokenData(val token: String)

@Serializable
data class TvdbSearchResponse(
    val data: List<TvdbSearchItem>? = null,
)

@Serializable
data class TvdbSearchItem(
    @SerialName("tvdb_id") val tvdbId: String? = null,
    val name: String? = null,
    val overview: String? = null,
    val year: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    val genres: List<String>? = null,
    val aliases: List<String>? = null,
)
