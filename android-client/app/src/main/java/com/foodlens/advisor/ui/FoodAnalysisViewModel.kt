package com.foodlens.advisor.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.foodlens.advisor.data.FoodAnalysisRepository
import com.foodlens.advisor.network.AnalyzeFoodResponse
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class AnalysisUiState {
    data object Idle : AnalysisUiState()
    data object Loading : AnalysisUiState()
    data class Success(val data: AnalyzeFoodResponse) : AnalysisUiState()
    data class Error(val message: String) : AnalysisUiState()
}

class FoodAnalysisViewModel(
    private val repository: FoodAnalysisRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow<AnalysisUiState>(AnalysisUiState.Idle)
    val uiState: StateFlow<AnalysisUiState> = _uiState

    fun analyzeFood(base64Image: String) {
        viewModelScope.launch {
            _uiState.value = AnalysisUiState.Loading
            runCatching { repository.analyze(base64Image) }
                .onSuccess { _uiState.value = AnalysisUiState.Success(it) }
                .onFailure { _uiState.value = AnalysisUiState.Error(it.message ?: "Unknown error") }
        }
    }
}
