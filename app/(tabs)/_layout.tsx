import React from 'react'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { HapticTab } from '@/components/haptic-tab'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: '#f8fafc',
        tabBarInactiveTintColor: '#7dd3fc',
        tabBarShowLabel: true,
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 14,
          height: 74,
          borderRadius: 28,
          paddingTop: 10,
          paddingBottom: 10,
          backgroundColor: '#08111f',
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: '#020617',
          shadowOpacity: 0.24,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 12 },
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Открий',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={22} name={focused ? 'compass' : 'compass-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Награди',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={22} name={focused ? 'trophy' : 'trophy-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Активност',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={22} name={focused ? 'flash' : 'flash-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профил',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={22} name={focused ? 'person' : 'person-outline'} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
