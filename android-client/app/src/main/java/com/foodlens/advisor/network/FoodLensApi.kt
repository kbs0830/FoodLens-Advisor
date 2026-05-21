package com.foodlens.advisor.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface FoodLensApi {
    @GET("health")
    suspend fun health(): HealthResponse

    @POST("api/v1/analyze-food")
    suspend fun analyzeFood(@Body request: AnalyzeFoodRequest): AnalyzeFoodResponse
}
