import React from "react"
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"

export type BarcodeScannerProps = {
  scanningMode: "camera" | "gallery" | "attachment" | "api"
  loading: boolean
  error: string | null
  onRetry: () => void
  onCancel: () => void
}

export default function BarcodeScanner({
  scanningMode,
  loading,
  error,
  onRetry,
  onCancel,
}: BarcodeScannerProps) {
  // Determine title based on mode
  const getTitle = () => {
    switch (scanningMode) {
      case "api":
        return "מעבד תמונת ברקוד"
      case "attachment":
        return "מעבד קובץ ברקוד"
      case "camera":
        return "צלם את הברקוד"
      case "gallery":
      default:
        return "בחר תמונה עם ברקוד ברור"
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{getTitle()}</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.loadingText}>מעבד את הברקוד...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>נסה שוב</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            {scanningMode === "camera"
              ? "צלם את הברקוד על המוצר"
              : "בחר תמונה שמכילה ברקוד ברור"}
          </Text>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>חזור לתפריט</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 20,
    width: "90%",
    padding: 20,
    elevation: 10,
    maxHeight: "90%",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
  },
  errorContainer: {
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#e11d48",
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#0ea5e9",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
  },
  instructionsContainer: {
    alignItems: "center",
    padding: 20,
  },
  instructionsText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  cancelButton: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#64748b",
    fontSize: 16,
  },
})
