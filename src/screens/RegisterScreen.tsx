import React, { useState } from 'react';
import { Alert, StyleSheet, View, TextInput, Button, Text, TouchableOpacity } from 'react-native';
import { supabase } from '../services/supabase';

export function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signUpWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      Alert.alert('Erro no cadastro', error.message);
    } else {
      Alert.alert('Sucesso!', 'Conta criada. Verifique seu e-mail para confirmar.');
      navigation.navigate('Login');
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nova Conta 🚵‍♀️</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          onChangeText={setEmail}
          value={email}
          placeholder="E-mail"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          onChangeText={setPassword}
          value={password}
          secureTextEntry={true}
          placeholder="Senha"
          autoCapitalize="none"
        />
      </View>

      <Button title="Criar Conta" disabled={loading} onPress={signUpWithEmail} color="#28a745" />

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkButton}>
        <Text style={styles.linkText}>Já tem uma conta? Entre aqui.</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#e8f5e9' }, 
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 40, color: '#333' },
  inputContainer: { marginBottom: 20 },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  linkButton: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#28a745', fontWeight: 'bold' } 
});