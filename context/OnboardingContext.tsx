"use client"

import type React from "react"
import { createContext, useState, useContext, type ReactNode, type Dispatch, type SetStateAction } from "react"
import type { Timestamp } from "firebase/firestore"

// Define the type for the onboarding data
type OnboardingData = {
  goal?: string
  age?: Timestamp
  gender?: string
  height?: number
  weight?: number
  activityLevel?: string

  // Additional fields from the updated onboarding flow
  activityType?: string // aerobic, anaerobic, mixed
  experienceLevel?: string // beginner, advanced (for muscle building)
  targetWeight?: number // target weight for all goals
  weeklyRate?: number // weekly rate of weight change (for weight loss/gain)
}

// Define the context type
type OnboardingContextType = {
  onboardingData: OnboardingData
  setOnboardingData: Dispatch<SetStateAction<OnboardingData>>
}

// Create the context with a default value
const OnboardingContext = createContext<OnboardingContextType>({
  onboardingData: {},
  setOnboardingData: () => {}, // Placeholder function
})

// Create a provider component
type OnboardingProviderProps = {
  children: ReactNode
}

const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({})

  return (
    <OnboardingContext.Provider value={{ onboardingData, setOnboardingData }}>{children}</OnboardingContext.Provider>
  )
}

// Create a custom hook to use the context
const useOnboarding = () => {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider")
  }
  return context
}

export { OnboardingProvider, useOnboarding }
export type { OnboardingData }
