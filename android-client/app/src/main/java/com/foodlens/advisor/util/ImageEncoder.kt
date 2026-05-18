package com.foodlens.advisor.util

import android.util.Base64
import android.graphics.Bitmap
import java.io.ByteArrayOutputStream

object ImageEncoder {
    fun bitmapToBase64(bitmap: Bitmap, quality: Int = 80): String {
        val output = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, quality, output)
        return Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP)
    }
}
