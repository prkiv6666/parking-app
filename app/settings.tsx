import React, { useState } from 'react'
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import Constants from 'expo-constants'

import { deleteMyAccount } from '../lib/parking-profile'
import { supabase } from '../supabase'

const SUPPORT_EMAIL = 'support@parkradar.app'
const APP_VERSION = Constants.expoConfig?.version || '1.0.0'

export default function SettingsScreen() {
  const [deletingAccount, setDeletingAccount] = useState(false)

  async function returnToLoginScreen() {
    await supabase.auth.signOut()
    router.replace('/(tabs)')
  }

  async function handleOpenSupportEmail() {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('ParkRadar поддръжка')}`
    const canOpen = await Linking.canOpenURL(url)

    if (!canOpen) {
      Alert.alert('Няма поддръжка', 'Не успях да отворя имейл приложение на това устройство.')
      return
    }

    await Linking.openURL(url)
  }

  function handleDeleteAccountPress() {
    Alert.alert(
      'Изтрий акаунта',
      'Това ще изтрие сигналите, наградите, поканите, паркинг профила и достъпа ти до ParkRadar. Действието не може да се върне.',
      [
        {
          text: 'Отказ',
          style: 'cancel',
        },
        {
          text: 'Продължи',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    )
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Последно потвърждение',
      'Сигурен ли си, че искаш да изтриеш акаунта си? Ще премахнем данните ти и ще прекратим достъпа ти веднага.',
      [
        {
          text: 'Назад',
          style: 'cancel',
        },
        {
          text: 'Изтрий акаунта',
          style: 'destructive',
          onPress: runDeleteAccount,
        },
      ]
    )
  }

  async function runDeleteAccount() {
    if (deletingAccount) return

    try {
      setDeletingAccount(true)

      const { error } = await deleteMyAccount()

      if (error) {
        console.log('Delete account data error:', error)
        Alert.alert(
          'Грешка',
          error.message || 'Не успяхме да изтрием акаунта в момента. Опитай пак след малко.'
        )
        return
      }

      await returnToLoginScreen()
    } finally {
      setDeletingAccount(false)
    }
  }

  async function handleSignOutPress() {
    await returnToLoginScreen()
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>Настройки</Text>
      <Text style={styles.title}>Контролен център</Text>
      <Text style={styles.subtitle}>
        Тук са събрани основните връзки за поддръжка, правилата, настройките на акаунта и информацията за приложението.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Общо</Text>
        <Text style={styles.cardBody}>
          Известията за нови места се включват от бутона с камбанка в екрана Открий. Ако не получаваш известия, провери разрешенията за notifications и location в настройките на устройството.
        </Text>

        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/(tabs)')}>
          <Ionicons name="compass-outline" size={18} color="#dbeafe" />
          <Text style={styles.linkButtonText}>Към Открий</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/about')}>
          <Ionicons name="information-circle-outline" size={18} color="#dbeafe" />
          <Text style={styles.linkButtonText}>За ParkRadar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Помощ</Text>
        <Text style={styles.cardBody}>
          Ако искаш да докладваш проблем, да предложиш идея или да поискаш съдействие, използвай екрана за помощ или отвори имейл към поддръжката.
        </Text>

        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/help')}>
          <Ionicons name="help-circle-outline" size={18} color="#dbeafe" />
          <Text style={styles.linkButtonText}>Помощ и често задавани въпроси</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={handleOpenSupportEmail}>
          <Ionicons name="mail-outline" size={18} color="#dbeafe" />
          <Text style={styles.linkButtonText}>Пиши на {SUPPORT_EMAIL}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Правни</Text>
        <Text style={styles.cardBody}>
          Прегледай какви данни използва приложението, какви са условията за ползване и как да поискаш изтриване на информацията си.
        </Text>

        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/legal/privacy')}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#dbeafe" />
          <Text style={styles.linkButtonText}>Политика за поверителност</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/legal/terms')}>
          <Ionicons name="document-text-outline" size={18} color="#dbeafe" />
          <Text style={styles.linkButtonText}>Условия за ползване</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/legal/data')}>
          <Ionicons name="trash-outline" size={18} color="#dbeafe" />
          <Text style={styles.linkButtonText}>Данни и изтриване</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Акаунт</Text>
        <Text style={styles.cardBody}>
          Управлявай профила, паркинг настройките и достъпа си до приложението от едно място.
        </Text>

        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/(tabs)/profile')}>
          <Ionicons name="person-outline" size={18} color="#dbeafe" />
          <Text style={styles.linkButtonText}>Към профила</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dangerButton, deletingAccount && styles.dangerButtonDisabled]}
          onPress={handleDeleteAccountPress}
          disabled={deletingAccount}
        >
          <Ionicons name="trash-outline" size={18} color="#fee2e2" />
          <Text style={styles.dangerButtonText}>{deletingAccount ? 'Изтриване...' : 'Изтрий акаунта'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerButton} onPress={handleSignOutPress}>
          <Ionicons name="log-out-outline" size={18} color="#fee2e2" />
          <Text style={styles.dangerButtonText}>Изход</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.versionRow}>
        <Text style={styles.versionText}>ParkRadar</Text>
        <Text style={styles.versionText}>Версия {APP_VERSION}</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#08111f',
  },
  content: {
    paddingTop: 64,
    paddingHorizontal: 18,
    paddingBottom: 42,
  },
  eyebrow: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 8,
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 16,
    marginBottom: 18,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  cardBody: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
  },
  linkButton: {
    marginTop: 12,
    backgroundColor: '#111c2f',
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  linkButtonText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  },
  dangerButton: {
    marginTop: 12,
    backgroundColor: 'rgba(127,29,29,0.45)',
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
  },
  dangerButtonDisabled: {
    opacity: 0.65,
  },
  dangerButtonText: {
    color: '#fee2e2',
    fontSize: 14,
    fontWeight: '700',
  },
  versionRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  versionText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
})