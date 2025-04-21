import * as ImagePicker from 'expo-image-picker'
import { Alert } from 'react-native'

/**
 * Requests camera and media library permissions.
 * @returns true if both permissions are granted, false otherwise.
 */
export async function requestPermissions(): Promise<boolean> {
  const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync()
  const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync()

  if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
    Alert.alert('הרשאה נדרשת', 'אנא אפשר גישה למצלמה ולגלריה כדי להמשיך')
    return false
  }

  return true
}

/**
 * Launches the camera to take a photo and returns the result or null if cancelled.
 */
export async function launchCamera(options?: Parameters<typeof ImagePicker.launchCameraAsync>[0]) {
  return await ImagePicker.launchCameraAsync({
    base64: true,
    quality: 0.7,
    ...options,
  })
}

/**
 * Opens the media library to pick an image and returns the result or null if cancelled.
 */
export async function launchGallery(options?: Parameters<typeof ImagePicker.launchImageLibraryAsync>[0]) {
  return await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    base64: true,
    quality: 0.7,
    ...options,
  })
}
