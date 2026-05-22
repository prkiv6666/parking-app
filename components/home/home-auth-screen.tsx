import React from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { type AuthFieldErrors, type AuthMode } from '../../lib/home-screen'
import { ParkRadarLogo } from './home-brand'

type HomeAuthScreenProps = {
  authMode: AuthMode
  authErrors: AuthFieldErrors
  authSuccessMessage: string
  authSubmitting: boolean
  email: string
  password: string
  confirmPassword: string
  displayName: string
  onSwitchMode: (nextMode: AuthMode) => void
  onDisplayNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onSubmit: () => void
}

export function HomeAuthScreen({
  authMode,
  authErrors,
  authSuccessMessage,
  authSubmitting,
  email,
  password,
  confirmPassword,
  displayName,
  onSwitchMode,
  onDisplayNameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: HomeAuthScreenProps) {
  return (
    <KeyboardAvoidingView
      style={styles.authScreen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
    >
      <View style={styles.authGlow} />
      <ScrollView
        contentContainerStyle={styles.authScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.authIntroBlock}>
          <Text style={styles.authEyebrow}>Паркирай по-спокойно</Text>
          <Text style={styles.authHeroTitle}>Влез в ParkRadar и действай по-бързо в града</Text>
          <View style={styles.authFeatureRow}>
            <View style={styles.authFeatureChip}>
              <Ionicons name="map-outline" size={14} color="#dbeafe" />
              <Text style={styles.authFeatureChipText}>Карта</Text>
            </View>
            <View style={styles.authFeatureChip}>
              <Ionicons name="flash-outline" size={14} color="#dbeafe" />
              <Text style={styles.authFeatureChipText}>Сигнали</Text>
            </View>
            <View style={styles.authFeatureChip}>
              <Ionicons name="trophy-outline" size={14} color="#dbeafe" />
              <Text style={styles.authFeatureChipText}>Награди</Text>
            </View>
          </View>
        </View>

        <View style={styles.authCard}>
          <ParkRadarLogo size={84} wordmarkSize="large" />

          {authMode !== 'reset_password' ? (
            <View style={styles.authModeSwitchRow}>
              <TouchableOpacity
                style={[styles.authModeChip, authMode === 'login' && styles.authModeChipActive]}
                onPress={() => onSwitchMode('login')}
              >
                <Text style={[styles.authModeChipText, authMode === 'login' && styles.authModeChipTextActive]}>
                  Вход
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.authModeChip, authMode === 'register' && styles.authModeChipActive]}
                onPress={() => onSwitchMode('register')}
              >
                <Text style={[styles.authModeChipText, authMode === 'register' && styles.authModeChipTextActive]}>
                  Регистрация
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <Text style={styles.authTitle}>
            {authMode === 'login'
              ? 'Влез в акаунта си'
              : authMode === 'register'
              ? 'Създай акаунт'
              : authMode === 'forgot_password'
              ? 'Забравена парола'
              : 'Задай нова парола'}
          </Text>
          <Text style={styles.authSubtitle}>
            {authMode === 'login'
              ? 'Влез, за да виждаш и маркираш свободни места'
              : authMode === 'register'
              ? 'Регистрирай се, за да ползваш приложението'
              : authMode === 'forgot_password'
              ? 'Въведи имейла си и ще ти изпратим линк за смяна на паролата'
              : 'Въведи новата си парола, за да завършиш възстановяването'}
          </Text>

          {authSuccessMessage ? (
            <View style={styles.authSuccessBanner}>
              <Ionicons name="checkmark-circle" size={16} color="#86efac" />
              <Text style={styles.authSuccessBannerText}>{authSuccessMessage}</Text>
            </View>
          ) : null}

          {authMode === 'register' && (
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.input, authErrors.displayName ? styles.inputError : null]}
                placeholder="Име"
                value={displayName}
                onChangeText={onDisplayNameChange}
                placeholderTextColor="#94a3b8"
              />
              {authErrors.displayName ? <Text style={styles.inputErrorText}>{authErrors.displayName}</Text> : null}
            </View>
          )}

          {authMode !== 'reset_password' ? (
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.input, authErrors.email ? styles.inputError : null]}
                placeholder="Имейл"
                value={email}
                onChangeText={onEmailChange}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#94a3b8"
              />
              {authErrors.email ? <Text style={styles.inputErrorText}>{authErrors.email}</Text> : null}
            </View>
          ) : null}

          {authMode !== 'forgot_password' ? (
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.input, authErrors.password ? styles.inputError : null]}
                placeholder={authMode === 'reset_password' ? 'Нова парола' : 'Парола'}
                value={password}
                onChangeText={onPasswordChange}
                secureTextEntry
                placeholderTextColor="#94a3b8"
              />
              {authErrors.password ? <Text style={styles.inputErrorText}>{authErrors.password}</Text> : null}
            </View>
          ) : null}

          {authMode === 'reset_password' ? (
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.input, authErrors.confirmPassword ? styles.inputError : null]}
                placeholder="Повтори новата парола"
                value={confirmPassword}
                onChangeText={onConfirmPasswordChange}
                secureTextEntry
                placeholderTextColor="#94a3b8"
              />
              {authErrors.confirmPassword ? <Text style={styles.inputErrorText}>{authErrors.confirmPassword}</Text> : null}
            </View>
          ) : null}

          {authMode === 'forgot_password' ? (
            <Text style={styles.helperAuthText}>Линкът ще отвори приложението и ще ти позволи да зададеш нова парола.</Text>
          ) : null}

          <TouchableOpacity style={styles.authButton} onPress={onSubmit} disabled={authSubmitting}>
            <Text style={styles.authButtonText}>
              {authSubmitting
                ? 'Изчакване...'
                : authMode === 'login'
                ? 'Влез'
                : authMode === 'register'
                ? 'Регистрация'
                : authMode === 'forgot_password'
                ? 'Изпрати линк'
                : 'Запази новата парола'}
            </Text>
          </TouchableOpacity>

          {authMode === 'login' ? (
            <>
              <TouchableOpacity onPress={() => onSwitchMode('forgot_password')}>
                <Text style={styles.secondaryAuthText}>Забравена парола?</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => onSwitchMode('register')}>
                <Text style={styles.switchAuthText}>Нямаш акаунт? Регистрирай се</Text>
              </TouchableOpacity>
            </>
          ) : authMode === 'register' ? (
            <TouchableOpacity onPress={() => onSwitchMode('login')}>
              <Text style={styles.switchAuthText}>Имаш акаунт? Влез</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => onSwitchMode('login')}>
              <Text style={styles.switchAuthText}>Назад към вход</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  authScreen: {
    flex: 1,
    backgroundColor: '#08111f',
  },
  authScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  authIntroBlock: {
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  authEyebrow: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  authHeroTitle: {
    color: '#f8fafc',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    marginTop: 8,
    maxWidth: 320,
  },
  authFeatureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  authFeatureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15,23,42,0.86)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  authFeatureChipText: {
    color: '#dbeafe',
    fontSize: 12,
    fontWeight: '800',
  },
  authGlow: {
    position: 'absolute',
    top: 120,
    left: 40,
    right: 40,
    height: 220,
    backgroundColor: 'rgba(37,99,235,0.18)',
    borderRadius: 999,
  },
  authCard: {
    backgroundColor: 'rgba(15,23,42,0.96)',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  authModeSwitchRow: {
    flexDirection: 'row',
    backgroundColor: '#0b1324',
    borderRadius: 18,
    padding: 4,
    marginBottom: 18,
    gap: 6,
  },
  authModeChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
  },
  authModeChipActive: {
    backgroundColor: '#2563eb',
  },
  authModeChipText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '800',
  },
  authModeChipTextActive: {
    color: '#fff',
  },
  authTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  authSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#111c2f',
    color: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputErrorText: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    marginLeft: 4,
  },
  authButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  authSuccessBanner: {
    marginBottom: 14,
    backgroundColor: 'rgba(20,83,45,0.38)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(134,239,172,0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authSuccessBannerText: {
    color: '#dcfce7',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    flex: 1,
  },
  helperAuthText: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 4,
  },
  secondaryAuthText: {
    marginTop: 14,
    color: '#dbeafe',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
  switchAuthText: {
    marginTop: 16,
    color: '#93c5fd',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
})