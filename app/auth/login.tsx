import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/home');
    } catch (error: any) {
      Alert.alert('שגיאה', error.message);
    }
  };

  const handleResetPassword = async () => {
    if (!email) return Alert.alert('אנא הזן כתובת אימייל');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('נשלחה הודעת איפוס סיסמה!');
    } catch (err: any) {
      Alert.alert('שגיאה', err.message);
    }
  };

  return (
    <LinearGradient colors={['#fbffff', '#dceaf8']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Back Arrow */}
        <TouchableOpacity onPress={() => router.replace('/auth/visitor-home')} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.title}>התחברות</Text>

          <TextInput
            placeholder="אימייל"
            placeholderTextColor="#777"
            style={styles.input}
            onChangeText={setEmail}
            value={email}
          />
          <TextInput
            placeholder="סיסמה"
            placeholderTextColor="#777"
            style={styles.input}
            onChangeText={setPassword}
            value={password}
            secureTextEntry
          />

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>היכנס</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleResetPassword}>
            <Text style={styles.secondaryLink}>שכחת סיסמה?</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backIcon: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 2,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
    fontSize: 16,
    textAlign: 'right',
  },
  loginButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    
  },
  secondaryLink: {
    textAlign: 'center',
    color: '#4FC3F7',
    marginTop: 10,
    fontSize: 15,
  },
});
