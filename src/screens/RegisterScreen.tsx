import React, { useState } from 'react';
import { StyleSheet, View, TextInput, Text, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { useAppAlert } from '../components/AppAlertModal';

export function RegisterScreen({ navigation }: any) {
  const { colors, isDarkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { showAlert, alertModal } = useAppAlert();

  async function signUpWithEmail() {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Preencha e-mail e senha para criar a conta.');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      showAlert({
        title: 'Erro no cadastro',
        message: error.message,
        variant: 'error',
      });
    } else {
      showAlert({
        title: 'Sucesso!',
        message: 'Conta criada. Verifique seu e-mail para confirmar.',
        variant: 'success',
        onConfirm: () => navigation.navigate('Login'),
      });
    }

    setLoading(false);
  }

  const styles = getStyles(colors, isDarkMode);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.kicker}>PASSAPORTE DA CICLOROTA</Text>
          <Text style={styles.title}>Crie sua conta</Text>
          <Text style={styles.subtitle}>Cadastre-se para registrar checkpoints e desbloquear seu certificado.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>NOVO CADASTRO</Text>

          {errorMsg !== '' && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              onChangeText={setEmail}
              value={email}
              placeholder="E-mail"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              onChangeText={setPassword}
              value={password}
              secureTextEntry={true}
              placeholder="Senha"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} disabled={loading} onPress={signUpWithEmail}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Criar Conta</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkButton}>
          <Text style={styles.linkLabel}>Já tem uma conta?</Text>
          <Text style={styles.linkText}>Entrar aqui</Text>
        </TouchableOpacity>

        {alertModal}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 40 : 0 },
  container: { flex: 1, paddingHorizontal: 20, paddingBottom: 24, justifyContent: 'center' },

  header: { marginBottom: 28 },
  kicker: { fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 34, fontWeight: '800', color: colors.text, marginTop: 6 },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginTop: 8, lineHeight: 21 },

  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: { fontSize: 13, color: colors.textSecondary, textTransform: 'uppercase', fontWeight: '500', marginLeft: 6, marginBottom: 10 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? colors.dangerBg : '#FFEBEB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  errorText: { color: colors.danger, marginLeft: 8, fontSize: 14, fontWeight: '500', flex: 1 },

  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 50, fontSize: 17, color: colors.text },

  primaryButton: {
    marginTop: 6,
    backgroundColor: colors.success,
    minHeight: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: colors.white, fontSize: 17, fontWeight: '700' },

  linkButton: { marginTop: 20, alignItems: 'center' },
  linkLabel: { color: colors.textSecondary, fontSize: 14, marginBottom: 2 },
  linkText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
});
