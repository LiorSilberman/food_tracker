import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ImageBackground } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { useRouter } from 'expo-router';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { useOnboarding } from '../../context/OnboardingContext';

const db = getFirestore();

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { data } = useOnboarding();

  const handleSignup = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Save onboarding data to Firestore
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        onboarding: data,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      Alert.alert('הצלחה', 'משתמש חדש נוצר!');
      router.replace('/auth/login');
    } catch (error: any) {
      Alert.alert('Signup Error', error.message);
    }
  };

  return (
    <ImageBackground
      // source={require('../../assets/images/brideCover2.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <Text style={styles.heading}>צור משתמש</Text>
        <TextInput placeholder="אימייל" placeholderTextColor="#555" style={styles.input} onChangeText={setEmail} value={email} />
        <TextInput placeholder="סיסמא" placeholderTextColor="#555" style={styles.input} onChangeText={setPassword} value={password} secureTextEntry />
        <Button title="צור משתמש" onPress={handleSignup} />
        <Text style={styles.link} onPress={() => router.push('/auth/login')}>
          כבר קיים משתמש? היכנס
        </Text>
      </View>
    </ImageBackground>
  );
}

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#f4f4f4',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    width: '90%',
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.65)', // soft white overlay
    borderRadius: 12,
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  link: {
    color: '#007BFF',
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});
