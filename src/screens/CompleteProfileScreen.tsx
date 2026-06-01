import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';
import { getErrorMessage } from '../lib/errors';
import { updateCurrentUserProfile } from '../services/api/profile';
import { getCurrentUserId, signOut } from '../services/auth';
import { getUserOfflineSnapshot, updateUserOfflineSnapshot } from '../services/offlineCache';

type CompleteProfileScreenProps = {
  /**
   * Chamado após o nome ser salvo com sucesso. Espera-se que o caller
   * reavalie o estado do gate (refetch /auth/me) para liberar o app.
   */
  onCompleted: () => void;
};

export function CompleteProfileScreen({ onCompleted }: CompleteProfileScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  const styles = getStyles(colors, isDarkMode);

  const handleSubmit = async () => {
    const trimmed = name.trim();

    if (trimmed.length < 2) {
      setErrorMsg('Digite seu nome completo para continuar.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const updated = await updateCurrentUserProfile({
        full_name: trimmed,
        avatar_url: null,
      });

      // Atualiza o cache offline na hora para refletir o nome novo.
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          const snapshot = await getUserOfflineSnapshot(userId);
          await updateUserOfflineSnapshot(userId, {
            profile: snapshot?.profile
              ? { ...snapshot.profile, ...updated }
              : {
                  ...updated,
                  estatisticas: {
                    total_pontos_visitados: 0,
                    possui_certificado: false,
                    data_certificado: null,
                  },
                },
          });
        }
      } catch {
        // cache offline é best-effort; segue mesmo se falhar.
      }

      onCompleted();
    } catch (error) {
      setErrorMsg(
        getErrorMessage(error, 'Não foi possível salvar o nome. Verifique sua conexão.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      setSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="person" size={36} color={colors.primary} />
          </View>
          <Text style={styles.kicker}>BEM-VINDO À CICLOROTA</Text>
          <Text style={styles.title}>Como podemos te chamar?</Text>
          <Text style={styles.subtitle}>
            Para começar a explorar a rota e emitir seu certificado, precisamos do seu nome completo.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>NOME COMPLETO</Text>

          {errorMsg !== '' && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Ionicons
              name="person-outline"
              size={20}
              color={colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: João Silva"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!saving}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Continuar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSignOut}
            disabled={signingOut || saving}
          >
            <Text style={styles.secondaryButtonText}>
              {signingOut ? 'Saindo...' : 'Sair da conta'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: Platform.OS === 'android' ? 40 : 0,
    },
    container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
    header: { alignItems: 'center', marginBottom: 32 },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: isDarkMode ? colors.primaryBg : '#E5F1FF',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 18,
    },
    kicker: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
      letterSpacing: 1.2,
      marginBottom: 8,
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 21,
      paddingHorizontal: 8,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 22,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      letterSpacing: 1,
      marginBottom: 14,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#4A1A1A' : '#FFEBEB',
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDarkMode ? '#6A1A1A' : '#FFD1D1',
      marginBottom: 14,
    },
    errorText: {
      color: colors.danger,
      marginLeft: 8,
      fontSize: 13,
      fontWeight: '500',
      flex: 1,
    },
    inputGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.borderLight,
      marginBottom: 18,
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, height: 50, fontSize: 16, color: colors.text },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      height: 52,
      justifyContent: 'center',
      alignItems: 'center',
    },
    primaryButtonDisabled: { opacity: 0.6 },
    primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    secondaryButton: {
      marginTop: 14,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    secondaryButtonText: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  });
