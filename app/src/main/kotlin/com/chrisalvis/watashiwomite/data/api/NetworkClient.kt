package com.chrisalvis.watashiwomite.data.api

import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit

object NetworkClient {

    val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        encodeDefaults = true
        explicitNulls = false
    }

    private val baseClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private fun converterFactory() =
        json.asConverterFactory("application/json; charset=UTF-8".toMediaType())

    private fun OkHttpClient.withHeader(name: String, value: String) = newBuilder()
        .addInterceptor { chain ->
            chain.proceed(chain.request().newBuilder().header(name, value).build())
        }
        .build()

    fun malAuthApi(): MalAuthApiService = Retrofit.Builder()
        .baseUrl("https://myanimelist.net/")
        .client(baseClient)
        .addConverterFactory(converterFactory())
        .build()
        .create(MalAuthApiService::class.java)

    fun malApi(token: String): MalApiService = Retrofit.Builder()
        .baseUrl("https://api.myanimelist.net/")
        .client(baseClient.withHeader("Authorization", "Bearer $token"))
        .addConverterFactory(converterFactory())
        .build()
        .create(MalApiService::class.java)

    fun sonarrApi(baseUrl: String, apiKey: String): SonarrApiService {
        val client = baseClient.newBuilder()
            .addInterceptor { chain ->
                chain.proceed(
                    chain.request().newBuilder()
                        .header("X-Api-Key", apiKey)
                        .header("Accept", "application/json")
                        .build()
                )
            }
            .build()
        return Retrofit.Builder()
            .baseUrl(baseUrl.trimEnd('/') + "/")
            .client(client)
            .addConverterFactory(converterFactory())
            .build()
            .create(SonarrApiService::class.java)
    }

    fun tvdbLoginApi(): TvdbLoginApiService = Retrofit.Builder()
        .baseUrl("https://api4.thetvdb.com/")
        .client(baseClient)
        .addConverterFactory(converterFactory())
        .build()
        .create(TvdbLoginApiService::class.java)

    fun tvdbApi(token: String): TvdbApiService = Retrofit.Builder()
        .baseUrl("https://api4.thetvdb.com/")
        .client(baseClient.withHeader("Authorization", "Bearer $token"))
        .addConverterFactory(converterFactory())
        .build()
        .create(TvdbApiService::class.java)
}
