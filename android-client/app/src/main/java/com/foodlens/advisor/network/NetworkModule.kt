package com.foodlens.advisor.network

import com.foodlens.advisor.data.FoodAnalysisRepository
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object NetworkModule {
    // For Android emulator use 10.0.2.2. For real phone replace with your server IP/domain.
    private const val BASE_URL = "http://10.0.2.2:8080/"

    private val okHttpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    private val retrofit: Retrofit by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    val api: FoodLensApi by lazy {
        retrofit.create(FoodLensApi::class.java)
    }

    val repository: FoodAnalysisRepository by lazy {
        FoodAnalysisRepository(api)
    }
}
