package com.foodlens.advisor.network

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AnalyzeFoodRequest(
    @SerialName("image_base64") val imageBase64: String,
    val locale: String = "zh-TW"
)

@Serializable
data class MacroNutrients(
    @SerialName("protein_g") val proteinG: Double,
    @SerialName("carbs_g") val carbsG: Double,
    @SerialName("fat_g") val fatG: Double,
)

@Serializable
data class DietaryRuleCheck(
    @SerialName("high_protein") val highProtein: Boolean,
    @SerialName("zero_starch") val zeroStarch: Boolean,
    @SerialName("zero_alcohol") val zeroAlcohol: Boolean,
    @SerialName("mild_not_spicy") val mildNotSpicy: Boolean,
)

@Serializable
data class AnalyzeFoodResponse(
    @SerialName("food_items") val foodItems: List<String>,
    @SerialName("estimated_calories_kcal") val estimatedCaloriesKcal: Double,
    val macros: MacroNutrients,
    @SerialName("rule_check") val ruleCheck: DietaryRuleCheck,
    @SerialName("next_meal_suggestion") val nextMealSuggestion: String,
)
