import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ImageBackground } from 'react-native';
import { createUserWithEmailAndPassword, deleteUser, UserCredential } from 'firebase/auth';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { auth } from '../../firebase';
import { db as sqliteDb } from '@/dbInit'
import { useOnboarding } from '../../context/OnboardingContext';
import { saveOnboardingData } from '@/onboardingDB';

const firestore = getFirestore();

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { onboardingData } = useOnboarding();

  async function handleSignup() {
    let userCredential: UserCredential | null = null
    try {
      // 1) Create the Auth user
      userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      )
      const uid = userCredential.user.uid
  
      // Prepare the timestamp
      const now = new Date().toISOString()
  
      // 2) Save to SQLite
      await saveOnboardingData(uid, onboardingData, now)
  
      // 3) Save to Firestore
      await setDoc(
        doc(firestore, 'users', uid),
        { onboarding: onboardingData, createdAt: now },
        { merge: true }
      )
  
      Alert.alert('הצלחה', 'משתמש חדש נוצר!')
      router.replace('/(tabs)/home')
    } catch (error: any) {
      console.error('Signup failed at step:', error)
  
      // If we got as far as writing to SQLite, remove that row
      if (userCredential) {
        try {
          await sqliteDb.runAsync(
            `DELETE FROM onboarding WHERE user_id = ?;`,
            [userCredential.user.uid]
          )
        } catch (e) {
          console.warn('Failed to rollback SQLite onboarding row:', e)
        }
      }
  
      // If we created the Auth user, delete it
      if (userCredential) {
        try {
          // Must be signed in as that user, which you are right after signup
          await deleteUser(userCredential.user)
        } catch (e) {
          console.warn('Failed to delete Firebase Auth user:', e)
        }
      }
  
      Alert.alert('Signup Error', error.message || String(error))
    }
  }

  return (
    <ImageBackground
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <Text style={styles.heading}>צור משתמש</Text>
        <TextInput
          placeholder="אימייל"
          placeholderTextColor="#555"
          style={styles.input}
          onChangeText={setEmail}
          value={email}
        />
        <TextInput
          placeholder="סיסמא"
          placeholderTextColor="#555"
          style={styles.input}
          onChangeText={setPassword}
          value={password}
          secureTextEntry
        />
        <Button title="צור משתמש" onPress={handleSignup} />
        <Text style={styles.link} onPress={() => router.push('/auth/login')}>
          כבר קיים משתמש? היכנס
        </Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(255,255,255,0.65)',
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
