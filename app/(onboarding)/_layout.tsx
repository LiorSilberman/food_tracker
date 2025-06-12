"use client";
import React from "react";
import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack
      initialRouteName="genderNAge"
      screenOptions={{ headerShown: false }}
    />
  );
}