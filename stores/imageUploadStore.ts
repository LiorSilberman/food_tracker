import { create } from 'zustand';

type ImageUploadState = {
  imageUri: string | null;
  imageBase64: string | null;
  componentId: string | null;
  result: any | null; // ✅ add result
  setImageData: (uri: string, base64: string) => void;
  clearImage: () => void;
  reset: () => void;
  setResult: (res: any) => void; // ✅ setter
};

export const useImageUploadStore = create<ImageUploadState>((set) => ({
  imageUri: null,
  imageBase64: null,
  componentId: null,
  result: null,
  setImageData: (uri, base64) =>
    set({
      imageUri: uri,
      imageBase64: base64,
      componentId: Date.now().toString(),
      result: null, // ✅ reset result
    }),
  clearImage: () => set({ imageUri: null, imageBase64: null, componentId: null, result: null }),
  reset: () => set({ imageUri: null, imageBase64: null, componentId: null, result: null }),
  setResult: (res) => set({ result: res }),
}));