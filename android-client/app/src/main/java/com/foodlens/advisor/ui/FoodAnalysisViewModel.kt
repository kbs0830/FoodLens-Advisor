package com.foodlens.advisor.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.foodlens.advisor.data.FoodAnalysisRepository
import com.foodlens.advisor.network.AnalyzeFoodResponse
import com.foodlens.advisor.network.HealthResponse
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class AnalysisUiState {
    data object Idle : AnalysisUiState()
    data object Loading : AnalysisUiState()
    data object CheckingConnection : AnalysisUiState()
    data class Connected(val data: HealthResponse) : AnalysisUiState()
    data class Success(val data: AnalyzeFoodResponse) : AnalysisUiState()
    data class Error(val message: String) : AnalysisUiState()
}

class FoodAnalysisViewModel(
    private val repository: FoodAnalysisRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow<AnalysisUiState>(AnalysisUiState.Idle)
    val uiState: StateFlow<AnalysisUiState> = _uiState

    fun checkConnection() {
        viewModelScope.launch {
            _uiState.value = AnalysisUiState.CheckingConnection
            runCatching { repository.checkConnection() }
                .onSuccess { _uiState.value = AnalysisUiState.Connected(it) }
                .onFailure { _uiState.value = AnalysisUiState.Error(it.message ?: "Unknown error") }
        }
    }

    fun analyzeFood(base64Image: String) {
        viewModelScope.launch {
            _uiState.value = AnalysisUiState.Loading
            runCatching { repository.analyze(base64Image) }
                .onSuccess { _uiState.value = AnalysisUiState.Success(it) }
                .onFailure { _uiState.value = AnalysisUiState.Error(it.message ?: "Unknown error") }
        }
    }
}
