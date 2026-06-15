package com.chrisalvis.watashiwomite.data.api

import retrofit2.http.*

interface MalAuthApiService {
    @FormUrlEncoded
    @POST("v1/oauth2/token")
    suspend fun exchangeCode(
        @Field("client_id") clientId: String,
        @Field("client_secret") clientSecret: String?,
        @Field("grant_type") grantType: String = "authorization_code",
        @Field("code") code: String,
        @Field("redirect_uri") redirectUri: String,
        @Field("code_verifier") codeVerifier: String,
    ): MalTokenResponse

    @FormUrlEncoded
    @POST("v1/oauth2/token")
    suspend fun refreshToken(
        @Field("client_id") clientId: String,
        @Field("client_secret") clientSecret: String?,
        @Field("grant_type") grantType: String = "refresh_token",
        @Field("refresh_token") refreshToken: String,
    ): MalTokenResponse
}

interface MalApiService {
    @GET("v2/users/@me")
    suspend fun getMe(): MalUserResponse

    @GET("v2/users/@me/animelist")
    suspend fun getAnimeList(
        @Query("status") status: String,
        @Query("fields") fields: String,
        @Query("limit") limit: Int = 500,
    ): MalAnimeListResponse

    @GET(".")
    suspend fun getAnimeListByUrl(@Url url: String): MalAnimeListResponse

    @FormUrlEncoded
    @PATCH("v2/anime/{id}/my_list_status")
    suspend fun updateListStatus(
        @Path("id") malId: Int,
        @Field("status") status: String,
    ): MalUpdateStatusResponse
}
