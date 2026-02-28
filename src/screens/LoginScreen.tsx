import React, { useState } from 'react';
import { StyleSheet, View, TextInput, Button, Text, TouchableOpacity } from 'react-native';
import { supabase } from '../services/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { useAppAlert } from '../components/AppAlertModal';

export function LoginScreen({ navigation }: any) {
  const { colors, isDarkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showAlert, alertModal } = useAppAlert();

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showAlert({
        title: 'Erro ao entrar',
        message: error.message,
        variant: 'error',
      });
    }
    setLoading(false);
  }

  const styles = getStyles(colors, isDarkMode);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Passaporte da Ciclorota 🚴‍♂️</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          onChangeText={setEmail}
          value={email}
          placeholder="E-mail"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
        />
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

      <Button title="Entrar" disabled={loading} onPress={signInWithEmail} />

      <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkButton}>
        <Text style={styles.linkText}>Não possui uma conta ainda? Crie aqui.</Text>
      </TouchableOpacity>

      {alertModal}
    </View>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 40, color: colors.text },
  inputContainer: { marginBottom: 20 },
  input: { backgroundColor: colors.card, padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: colors.border, color: colors.text },
  linkButton: { marginTop: 20, alignItems: 'center' },
  linkText: { color: colors.primary, fontWeight: 'bold' }
});