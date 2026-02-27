import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { supabase } from '../services/supabase';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function EditProfileScreen({ navigation }: any) {
  const { colors, isDarkMode } = useTheme();
  const [newName, setNewName] = useState('');
  const [newPhoto, setNewPhoto] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        
        const res = await fetch(`${API_URL}/profiles/${session.user.id}`);
        if (res.ok) {
          const data = await res.json();
          setNewName(data.full_name || '');
          setNewPhoto(data.avatar_url || '');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async () => {
    if (!newName.trim()) {
      setErrorMsg('O nome não pode ficar vazio.');
      return;
    }

    setSaving(true);
    setErrorMsg(''); 
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/profiles/${session?.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: newName, avatar_url: newPhoto }),
      });

      if (response.ok) {
        setShowSuccess(true);
      } else {
        throw new Error('Falha ao salvar no banco');
      }
    } catch (error) {
      setErrorMsg('Não foi possível salvar as alterações. Verifique sua conexão.');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    navigation.goBack();
  };

  const styles = getStyles(colors, isDarkMode);

  if (loading) {
    return (
      <View style={[styles.safeArea, styles.centerContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Editar Perfil</Text>
          
          <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.headerButton}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.saveText}>Salvar</Text>
            )}
          </TouchableOpacity>
        </View>

        {errorMsg !== '' && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={20} color={colors.danger} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>NOME COMPLETO</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                value={newName} 
                onChangeText={setNewName} 
                placeholder="Ex: João Silva"
                placeholderTextColor={colors.border}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>FOTO DE PERFIL (LINK URL)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="link-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                value={newPhoto} 
                onChangeText={setNewPhoto} 
                placeholder="https://exemplo.com/foto.jpg"
                placeholderTextColor={colors.border}
                autoCapitalize="none"
              />
            </View>
            <Text style={styles.hintText}>Cole um link válido de uma imagem para atualizar a sua foto de avatar.</Text>
          </View>
        </View>

      </KeyboardAvoidingView>

      <Modal
        visible={showSuccess}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBg}>
              <Ionicons name="checkmark" size={40} color={colors.white} />
            </View>
            <Text style={styles.modalTitle}>Atualizado!</Text>
            <Text style={styles.modalMessage}>O seu perfil foi guardado com sucesso.</Text>
            
            <TouchableOpacity style={styles.modalButton} onPress={handleCloseSuccess}>
              <Text style={styles.modalButtonText}>Concluído</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 40 : 0 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, backgroundColor: colors.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  headerButton: { minWidth: 70, justifyContent: 'center' },
  cancelText: { fontSize: 17, color: colors.primary, textAlign: 'left' },
  saveText: { fontSize: 17, fontWeight: '700', color: colors.primary, textAlign: 'right' },

  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? '#4A1A1A' : '#FFEBEB', padding: 12, marginHorizontal: 20, marginTop: 20, borderRadius: 10, borderWidth: 1, borderColor: isDarkMode ? '#6A1A1A' : '#FFD1D1' },
  errorText: { color: colors.danger, marginLeft: 8, fontSize: 14, fontWeight: '500', flex: 1 },

  formContainer: { paddingHorizontal: 20, paddingTop: 30 },
  inputGroup: { marginBottom: 25 },
  label: { fontSize: 13, color: colors.textSecondary, textTransform: 'uppercase', fontWeight: '500', marginLeft: 16, marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 16, shadowColor: colors.text, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 50, fontSize: 17, color: colors.text },
  hintText: { fontSize: 13, color: colors.textSecondary, marginTop: 8, marginLeft: 16, lineHeight: 18 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: colors.text, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10
  },
  modalIconBg: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.success, 
    justifyContent: 'center', alignItems: 'center', marginBottom: 16
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 8 },
  modalMessage: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalButton: {
    backgroundColor: colors.primary, width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center'
  },
  modalButtonText: { color: colors.white, fontSize: 17, fontWeight: '700' }
});