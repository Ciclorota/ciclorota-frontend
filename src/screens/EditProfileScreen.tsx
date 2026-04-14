import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppAlert } from '../components/AppAlertModal';
import { getErrorMessage } from '../lib/errors';
import { fetchCurrentUserProfile, updateCurrentUserProfile } from '../services/api/profile';
import { getCurrentUserId } from '../services/auth';
import { getUserOfflineSnapshot, updateUserOfflineSnapshot } from '../services/offlineCache';

export function EditProfileScreen({ navigation }: any) {
  const { colors, isDarkMode } = useTheme();
  const [newName, setNewName] = useState('');
  const [newPhoto, setNewPhoto] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { showAlert, alertModal } = useAppAlert();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchCurrentUserProfile();
        setNewName(data.full_name || '');
        setNewPhoto(data.avatar_url || '');
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  const handleSave = async () => {
    if (!newName.trim()) {
      setErrorMsg('O nome não pode ficar vazio.');
      return;
    }

    setSaving(true);
    setErrorMsg(''); 
    try {
      const updatedProfile = await updateCurrentUserProfile({
        full_name: newName.trim(),
        avatar_url: newPhoto.trim() ? newPhoto.trim() : null,
      });

      const userId = await getCurrentUserId();
      if (userId) {
        const cachedSnapshot = await getUserOfflineSnapshot(userId);
        await updateUserOfflineSnapshot(userId, {
          profile: cachedSnapshot?.profile
            ? {
                ...cachedSnapshot.profile,
                ...updatedProfile,
              }
            : {
                ...updatedProfile,
                estatisticas: {
                  total_pontos_visitados: 0,
                  possui_certificado: false,
                  data_certificado: null,
                },
              },
        });
      }

      showAlert({
        title: 'Atualizado!',
        message: 'O seu perfil foi guardado com sucesso.',
        variant: 'success',
        confirmText: 'Concluído',
        onConfirm: () => navigation.goBack(),
      });
    } catch (error) {
      setErrorMsg(
        getErrorMessage(
          error,
          'Não foi possível salvar as alterações. Verifique sua conexão.',
        ),
      );
    } finally {
      setSaving(false);
    }
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

      {alertModal}

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

});
