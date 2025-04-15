import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PurchaseScreen() {
  const router = useRouter();

  const handlePurchase = () => {
    Alert.alert('✅ הרכישה הצליחה!', 'כעת תוכל להמשיך ולהירשם לאפליקציה', [
      {
        text: 'המשך',
        onPress: () => router.replace('/auth/signup'),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* ❌ Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={() => router.replace('/home')}>
        <Ionicons name="close" size={28} color="#444" />
      </TouchableOpacity>

      <Text style={styles.title}>🎉 קבל גישה מלאה</Text>
      <Text style={styles.subtitle}>
        ניתוח תזונתי אישי, המלצות מותאמות אישית, ועוד הרבה כלים לשיפור התזונה שלך.
      </Text>

      <View style={styles.card}>
        <Text style={styles.price}>₪14.90 / חודשי</Text>
        <Text style={styles.features}>
          ✓ מעקב חכם{'\n'}✓ ניתוח תמונות{'\n'}✓ תמיכה אישית
        </Text>
        <TouchableOpacity style={styles.button} onPress={handlePurchase}>
          <Text style={styles.buttonText}>התחל עכשיו</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#4FC3F7',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#E1F5FE',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: '#0288D1',
    marginBottom: 10,
  },
  features: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#4FC3F7',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
