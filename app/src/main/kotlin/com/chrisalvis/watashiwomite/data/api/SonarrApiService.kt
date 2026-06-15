package com.chrisalvis.watashiwomite.data.api

import kotlinx.serialization.json.JsonElement
import retrofit2.http.*

interface SonarrApiService {
    @GET("api/v3/system/status")
    suspend fun getStatus(): SonarrStatusResponse

    @GET("api/v3/series")
    suspend fun getSeries(): List<SonarrSeriesListItem>

    @GET("api/v3/series/{id}")
    suspend fun getSeriesJson(@Path("id") id: Int): JsonElement

    @Headers("Content-Type: application/json")
    @PUT("api/v3/series/{id}")
    suspend fun updateSeriesJson(@Path("id") id: Int, @Body series: JsonElement): JsonElement

    @POST("api/v3/series")
    suspend fun addSeries(@Body body: SonarrAddSeriesRequest): SonarrAddSeriesResponse

    @DELETE("api/v3/series/{id}")
    suspend fun deleteSeries(
        @Path("id") id: Int,
        @Query("deleteFiles") deleteFiles: Boolean = false,
    )

    @GET("api/v3/rootfolder")
    suspend fun getRootFolders(): List<SonarrRootFolderResponse>

    @GET("api/v3/qualityprofile")
    suspend fun getQualityProfiles(): List<SonarrQualityProfileResponse>

    @POST("api/v3/command")
    suspend fun sendCommand(@Body body: SonarrCommandRequest)
}
