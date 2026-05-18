package com.foodlens.advisor.data

import com.foodlens.advisor.network.AnalyzeFoodRequest
import com.foodlens.advisor.network.AnalyzeFoodResponse
import com.foodlens.advisor.network.FoodLensApi

class FoodAnalysisRepository(
    private val api: FoodLensApi,
) {
    suspend fun analyze(base64Image: String): AnalyzeFoodResponse {
        return api.analyzeFood(AnalyzeFoodRequest(imageBase64 = base64Image))
    }
}
