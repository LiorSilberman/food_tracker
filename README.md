# 🥗 Food Tracker App

A smart and interactive nutrition tracking app built with **React Native** and **Expo**, backed by **Firebase** and powered by **AI**.

This app allows users to:
- Take or upload photos of their meals
- Get AI-based nutrition analysis (calories, protein, fats, carbs)
- Edit and refine results for more accurate tracking
- Track daily progress and goals
- Go through a personalized onboarding to set weight/fitness goals
- Sync data with Firebase Auth & Firestore

## 📸 Key Features

- 📷 **Image Recognition**: Upload a meal photo, get instant breakdown of ingredients & nutrition via Gemini Vision API.
- 🧠 **AI-Powered Estimates**: Automatically extract calories and macros.
- 📝 **Editable Results**: Users can tweak portion sizes for accurate tracking.
- 📈 **Daily Summary**: Progress bar, status card, and calorie visualization.
- 🎯 **Personal Goals**: Set goals like fat loss or muscle gain and get smart recommendations.
- 🔐 **Authentication**: Firebase Auth with secure onboarding.
- ☁️ **Cloud Sync**: Firestore integration to store and retrieve user data.

## 🛠 Built With

- **React Native + Expo**
- **Firebase Auth & Firestore**
- **Gemini AI Vision API (Google)**
- **Zustand** for state management
- **React Native Reanimated** for animations
- **Typescript** for type safety

## 📦 Project Structure

```bash
.
├── app/                      # Expo Router structure
├── components/              # Reusable UI components
├── assets/                  # Fonts and images
├── config.ts                # Central config (API URL)
├── firebase.js              # Firebase setup
├── stores/                  # Zustand stores
├── utils/                   # Utility functions
├── types/                   # Shared TypeScript types
├── .env                     # Environment variables (not committed)
├── app.config.ts            # Expo + environment config
├── babel.config.js
├── package.json
```

## Running Locally

This project now works in **Expo Go**. After installing dependencies, simply run:

```bash
npm start
```

If you later add native modules that are not included in Expo Go, you'll need a
custom development build using EAS.

## Testing and Linting

Before running the project's tests or lint checks, make sure all dependencies
are installed:

```bash
npm install
```

Both `npm test` and `npm run lint` rely on **Jest** and the **Expo CLI**. These
tools are included with the project's dev dependencies, so installing them is
required for the commands to work correctly.
