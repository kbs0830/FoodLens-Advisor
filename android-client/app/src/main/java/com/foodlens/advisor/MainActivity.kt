package com.foodlens.advisor

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.foodlens.advisor.network.NetworkModule
import com.foodlens.advisor.ui.FoodAnalysisScreen
import com.foodlens.advisor.ui.FoodAnalysisViewModel
import com.foodlens.advisor.ui.FoodAnalysisViewModelFactory

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val viewModel: FoodAnalysisViewModel = viewModel(
                factory = FoodAnalysisViewModelFactory(NetworkModule.repository)
            )
            val uiState by viewModel.uiState.collectAsStateWithLifecycle()

            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    FoodAnalysisScreen(
                        state = uiState,
                        onTestConnectionClick = {
                            viewModel.checkConnection()
                        }
                    )
                }
            }
        }
    }
}
