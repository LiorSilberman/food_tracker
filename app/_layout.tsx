// app/_layout.tsx
import React, { useEffect } from "react"
import { StyleSheet } from "react-native"
import { Stack } from "expo-router"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { OnboardingProvider } from "../context/OnboardingContext"
import UploadPickerModal from "../components/uploadPickerModal"
import { useImageUploadStore } from "../stores/imageUploadStore"
import { useBarcodeScanStore } from '@/stores/barcodeScanStore'
import { initDatabase,logAllOnboardingData } from "@/dbInit"

export default function RootLayout() {
  useEffect(() => {
    initDatabase()
    logAllOnboardingData()
  }, [])

  const showUploadModal = useImageUploadStore((s) => s.showUploadModal)
  const setShowUploadModal = useImageUploadStore((s) => s.setShowUploadModal)
  const resetUpload = useImageUploadStore((s) => s.reset)
  const setImageData = useImageUploadStore((s) => s.setImageData)
  const clearImage = useImageUploadStore((s) => s.clearImage)
  const setScannedBarcodeData = useBarcodeScanStore((s) => s.setScannedBarcodeData)
  const clearScannedData = useBarcodeScanStore((s) => s.clearScannedData)
  
  const handleImageSelected = (uri: string, base64: string) => {
    clearScannedData()          
    resetUpload()              
    setImageData(uri, base64)
    setShowUploadModal(false)
  }
  
  return (
    <GestureHandlerRootView style={styles.container}>
      <OnboardingProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <UploadPickerModal
          isVisible={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onImageSelected={handleImageSelected}
          onBarcodeScanned={(meal, ingredients) => {
            clearImage()                     
            resetUpload()
            setScannedBarcodeData(meal, ingredients) 
            setShowUploadModal(false)
          }}
        />
      </OnboardingProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})
