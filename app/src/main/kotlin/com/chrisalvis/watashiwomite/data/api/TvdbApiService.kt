package com.chrisalvis.watashiwomite.data.api

import retrofit2.http.*

interface TvdbLoginApiService {
    @POST("v4/login")
    suspend fun login(@Body body: TvdbLoginRequest): TvdbLoginResponse
}

interface TvdbApiService {
    @GET("v4/search")
    suspend fun search(
        @Query("query") query: String,
        @Query("type") type: String = "series",
        @Query("limit") limit: Int = 5,
    ): TvdbSearchResponse

    @GET("v4/search")
    suspend fun searchAll(
        @Query("query") query: String,
        @Query("type") type: String = "series",
        @Query("limit") limit: Int = 10,
    ): TvdbSearchResponse
}
