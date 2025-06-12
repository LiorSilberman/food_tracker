import { Tabs } from 'expo-router';
import React from 'react';
import TabBar from '../../components/TabBar';


export default function TabLayout() {
  
  return (
    <Tabs
      tabBar={(props: any) => <TabBar {...props} />}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'ראשי',
          headerShown: false,
        }}
      />
      
      <Tabs.Screen
        name="progress"
        options={{
          title: 'תהליך',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="addImage"
        options={{
          title: '',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="dailySummary"
        options={{
          title: 'סיכום',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'הגדרות',
          headerShown: false,
        }}
        />
      
    </Tabs>
  );
}
