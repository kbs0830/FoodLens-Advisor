package com.foodlens.advisor.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun FoodAnalysisScreenV2(
    state: AnalysisUiState,
    onTestConnectionClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Header
        Text(
            text = "FoodLens Advisor",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary,
        )

        Text(
            text = "AI 飲食分析助手",
            fontSize = 14.sp,
            color = Color.Gray,
        )

        // Test Button
        Button(
            onClick = onTestConnectionClick,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.primary,
            ),
        ) {
            Text(
                text = when (state) {
                    is AnalysisUiState.CheckingConnection -> "連線中..."
                    is AnalysisUiState.Loading -> "分析中..."
                    else -> "測試 BFF 連線"
                },
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
            )
        }

        // Status Display
        when (state) {
            AnalysisUiState.Idle -> {
                StatusCard(
                    icon = null,
                    title = "準備就緒",
                    message = "點擊按鈕測試與 BFF 的連線",
                    color = Color.Gray,
                )
            }

            AnalysisUiState.CheckingConnection, AnalysisUiState.Loading -> {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.Center,
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(48.dp),
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }

            is AnalysisUiState.Connected -> {
                StatusCard(
                    icon = Icons.Default.Check,
                    title = "連線成功！",
                    message = "BFF 狀態：${state.data.status}",
                    color = Color(0xFF4CAF50),
                )
            }

            is AnalysisUiState.Error -> {
                StatusCard(
                    icon = Icons.Default.ErrorOutline,
                    title = "連線失敗",
                    message = state.message,
                    color = Color(0xFFE74C3C),
                )
            }

            is AnalysisUiState.Success -> {
                AnalysisResultCard(state.data)
            }
        }

        // Tips
        Text(
            text = "提示：確保 BFF 已啟動在 http://127.0.0.1:8080",
            fontSize = 12.sp,
            color = Color.Gray,
            modifier = Modifier.padding(top = 16.dp),
        )
    }
}

@Composable
fun StatusCard(
    icon: androidx.compose.material.icons.Icons.Filled? = null,
    title: String,
    message: String,
    color: Color,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(color.copy(alpha = 0.1f), shape = MaterialTheme.shapes.medium)
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (icon != null) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(32.dp),
            )
        }
        Text(
            text = title,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = color,
            modifier = Modifier.padding(top = 8.dp),
        )
        Text(
            text = message,
            fontSize = 14.sp,
            color = Color.Gray,
            modifier = Modifier.padding(top = 8.dp),
        )
    }
}

@Composable
fun AnalysisResultCard(data: com.foodlens.advisor.network.AnalyzeFoodResponse) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFFF5F5F5), shape = MaterialTheme.shapes.medium)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = "分析結果",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
        )

        // Food Items
        Text(text = "🍽️ 食物：${data.foodItems.joinToString(", ")}", fontSize = 14.sp)

        // Calories
        Text(
            text = "🔥 熱量：${data.estimatedCaloriesKcal} kcal",
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
        )

        // Macros
        Text(text = "💪 蛋白質：${data.macros.proteinG}g", fontSize = 14.sp)
        Text(text = "🥘 碳水：${data.macros.carbsG}g", fontSize = 14.sp)
        Text(text = "🧈 脂肪：${data.macros.fatG}g", fontSize = 14.sp)

        // Protein Progress
        val proteinTarget = 40.0
        val progress =
            (data.macros.proteinG / proteinTarget).coerceIn(0.0, 1.0).toFloat()
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(text = "蛋白質達成率", fontSize = 12.sp, modifier = Modifier.weight(1f))
            Text(text = "${(progress * 100).toInt()}%", fontSize = 12.sp)
        }
        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier.fillMaxWidth(),
        )

        // Rules Check
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.White, shape = MaterialTheme.shapes.small)
                .padding(8.dp),
        ) {
            Text(text = "營養標準檢查", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            RuleCheckItem("高蛋白", data.ruleCheck.highProtein)
            RuleCheckItem("零澱粉", data.ruleCheck.zeroStarch)
            RuleCheckItem("零酒精", data.ruleCheck.zeroAlcohol)
            RuleCheckItem("清淡不辣", data.ruleCheck.mildNotSpicy)
        }

        // Suggestion
        Text(
            text = "🎯 建議：${data.nextMealSuggestion}",
            fontSize = 13.sp,
            color = Color(0xFF2196F3),
        )
    }
}

@Composable
fun RuleCheckItem(label: String, passed: Boolean) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = if (passed) Icons.Default.Check else Icons.Default.ErrorOutline,
            contentDescription = null,
            tint = if (passed) Color(0xFF4CAF50) else Color(0xFFE74C3C),
            modifier = Modifier.size(16.dp),
        )
        Text(
            text = label,
            fontSize = 12.sp,
            modifier = Modifier.padding(start = 8.dp),
        )
    }
}
