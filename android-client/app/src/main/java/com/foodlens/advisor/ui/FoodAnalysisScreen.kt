package com.foodlens.advisor.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun FoodAnalysisScreen(state: AnalysisUiState) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        when (state) {
            AnalysisUiState.Idle -> Text("請拍攝食物開始分析")
            AnalysisUiState.Loading -> CircularProgressIndicator()
            is AnalysisUiState.Error -> Text("錯誤：${state.message}")
            is AnalysisUiState.Success -> {
                val proteinTarget = 40.0
                val progress = (state.data.macros.proteinG / proteinTarget).coerceIn(0.0, 1.0).toFloat()

                Text(
                    text = "熱量：${state.data.estimatedCaloriesKcal} kcal",
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(text = "食物：${state.data.foodItems.joinToString()}")
                Text(text = "蛋白質：${state.data.macros.proteinG} g")
                LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier.fillMaxWidth(),
                )
                Text(text = "建議：${state.data.nextMealSuggestion}")
            }
        }
    }
}
