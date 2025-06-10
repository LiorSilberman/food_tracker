import React, { useState } from 'react';
import { View, Image, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import MealAnalysisCard from '../components/meal/MealAnalysisCard';
import { API_URL } from '@/config';

export default function ImageResultScreen() {
  const { imageUri, base64 } = useLocalSearchParams<{ imageUri: string; base64: string }>();
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<null | {
    calories: number;
    carbs_g: number;
    protein_g: number;
    fat_g: number;
  }>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: decodeURIComponent(base64!),
          description,
        }),
      });
      const data = await response.json();
      setResult(data.result.totals); // or `data.result` if needed
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {!result && (
        <>
          <Image source={{ uri: decodeURIComponent(imageUri!) }} style={styles.image} />

          <TextInput
            placeholder="הוסף תיאור"
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.6 }]}
            disabled={loading}
            onPress={analyze}
          >
            <Text style={styles.buttonText}>
              {loading ? 'טוען...' : 'נתח את התמונה'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {result && (
        <MealAnalysisCard
          image={decodeURIComponent(imageUri!)}
          result={result}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  image: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    marginBottom: 20,
    resizeMode: 'cover',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#66BB6A',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
