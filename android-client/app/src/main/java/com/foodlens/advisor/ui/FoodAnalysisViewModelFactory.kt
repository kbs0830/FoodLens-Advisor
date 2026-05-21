package com.foodlens.advisor.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.foodlens.advisor.data.FoodAnalysisRepository

class FoodAnalysisViewModelFactory(
    private val repository: FoodAnalysisRepository,
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(FoodAnalysisViewModel::class.java)) {
            return FoodAnalysisViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
    }
}
