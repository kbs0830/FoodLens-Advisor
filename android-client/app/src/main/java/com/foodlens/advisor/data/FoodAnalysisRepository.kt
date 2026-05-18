package com.foodlens.advisor.data

import com.foodlens.advisor.network.AnalyzeFoodRequest
import com.foodlens.advisor.network.AnalyzeFoodResponse
import com.foodlens.advisor.network.FoodLensApi
import com.foodlens.advisor.network.HealthResponse

class FoodAnalysisRepository(
    private val api: FoodLensApi,
) {
    suspend fun checkConnection(): HealthResponse {
        return api.health()
    }

    suspend fun analyze(base64Image: String): AnalyzeFoodResponse {
        return api.analyzeFood(AnalyzeFoodRequest(imageBase64 = base64Image))
    }
}
