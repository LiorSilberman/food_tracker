import { API_URL } from "@/config"
/**
 * barcodeService.ts
 * 
 * Contains functions to scan barcodes via your backend API,
 * and to fetch product details from OpenFoodFacts.
 */

/**
 * Uploads an image to your backend for barcode detection.
 * @param imageUri URI of the image to scan
 * @returns response JSON with barcodes array
 */
export async function scanBarcodeWithAPI(
    imageUri: string,
  ): Promise<{ barcodes: string[] }> {
    const formData = new FormData()
    // Derive file type
    const uriParts = imageUri.split('.')
    const ext = uriParts[uriParts.length - 1]
    const mimeType = `image/${ext}`
  
    formData.append('image', {
      uri: imageUri,
      name: `barcode.${ext}`,
      type: mimeType,
    } as any)
  
    const resp = await fetch(`${API_URL}/barcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
      body: formData,
    })
  
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      throw new Error(err.error || 'Barcode scan failed')
    }
  
    return resp.json()
  }
  
  /**
   * Fetches product data from OpenFoodFacts by barcode.
   * @param barcode Numeric or string barcode
   * @returns product object from the API
   */
  export async function fetchProductFromOpenFoodFacts(
    barcode: string
  ): Promise<any> {
    const resp = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    )
    if (!resp.ok) {
      throw new Error('Failed to fetch product from OpenFoodFacts')
    }
    const data = await resp.json()
    if (data.status !== 1) {
      throw new Error('Product not found in OpenFoodFacts')
    }
    return data.product
  }
  