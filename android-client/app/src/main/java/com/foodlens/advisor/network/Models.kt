package com.foodlens.advisor.network

import com.google.gson.annotations.SerializedName

data class HealthResponse(
    val status: String,
)

data class AnalyzeFoodRequest(
    @SerializedName("image_base64") val imageBase64: String,
    val locale: String = "zh-TW"
)

data class MacroNutrients(
    @SerializedName("protein_g") val proteinG: Double,
    @SerializedName("carbs_g") val carbsG: Double,
    @SerializedName("fat_g") val fatG: Double,
)

data class DietaryRuleCheck(
    @SerializedName("high_protein") val highProtein: Boolean,
    @SerializedName("zero_starch") val zeroStarch: Boolean,
    @SerializedName("zero_alcohol") val zeroAlcohol: Boolean,
    @SerializedName("mild_not_spicy") val mildNotSpicy: Boolean,
)

data class AnalyzeFoodResponse(
    @SerializedName("food_items") val foodItems: List<String>,
    @SerializedName("estimated_calories_kcal") val estimatedCaloriesKcal: Double,
    val macros: MacroNutrients,
    @SerializedName("rule_check") val ruleCheck: DietaryRuleCheck,
    @SerializedName("next_meal_suggestion") val nextMealSuggestion: String,
)
