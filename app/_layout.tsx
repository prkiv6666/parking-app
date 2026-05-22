import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, Pressable, Text } from 'react-native';
import * as Notifications from 'expo-notifications';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { BrandColors, BrandTheme } from '@/constants/brand';
import { isExpoGo } from '../lib/runtime';

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export const unstable_settings = {
  anchor: '(tabs)',
};

const stackedScreenOptions = {
  headerBackVisible: false,
  headerLeft: () => (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }

        router.replace('/(tabs)/profile');
      }}
      hitSlop={10}
      style={{ paddingVertical: 6, paddingRight: 10 }}>
      <Text style={{ color: BrandTheme.primary, fontSize: 16, fontWeight: '700' }}>Назад</Text>
    </Pressable>
  ),
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (Platform.OS === 'android' && !isExpoGo) {
      Notifications.setNotificationChannelAsync('nearby-spots', {
        name: 'Nearby spots',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: BrandColors.signalYellow,
      }).catch((error) => {
        console.log('Notification channel setup error:', error);
      });
    }
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: 'Настройки', ...stackedScreenOptions }} />
        <Stack.Screen name="help" options={{ title: 'Помощ', ...stackedScreenOptions }} />
        <Stack.Screen name="about" options={{ title: 'За приложението', ...stackedScreenOptions }} />
        <Stack.Screen name="legal/privacy" options={{ title: 'Поверителност', ...stackedScreenOptions }} />
        <Stack.Screen name="legal/terms" options={{ title: 'Условия', ...stackedScreenOptions }} />
        <Stack.Screen name="legal/data" options={{ title: 'Данни и изтриване', ...stackedScreenOptions }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
