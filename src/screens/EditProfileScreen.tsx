import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '../contexts/ThemeContext';
import { useAppAlert } from '../components/AppAlertModal';
import { getErrorMessage } from '../lib/errors';
import {
  fetchCurrentUserProfile,
  updateCurrentUserProfile,
  uploadCurrentUserAvatar,
} from '../services/api/profile';
import { getCurrentUserId } from '../services/auth';
import { getUserOfflineSnapshot, updateUserOfflineSnapshot } from '../services/offlineCache';

type PendingAvatar = { uri: string; mimeType: string };

export function EditProfileScreen({ navigation }: any) {
  const { colors, isDarkMode } = useTheme();
  const [newName, setNewName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  // Quando o usuário escolhe uma nova foto da galeria, guarda em memória.
  // Só sobe para o servidor quando ele clicar em "Salvar".
  const [pendingAvatar, setPendingAvatar] = useState<PendingAvatar | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);

  const { showAlert, alertModal } = useAppAlert();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchCurrentUserProfile();
        setNewName(data.full_name || '');
        setAvatarUrl(data.avatar_url || null);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  const handlePickImage = async () => {
    if (pickingImage || saving) return;

    setErrorMsg('');
    setPickingImage(true);
    try {
      // Pede permissão de leitura da galeria.
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlert({
          title: 'Permissão necessária',
          message: 'Para escolher uma foto, libere o acesso à galeria nas configurações.',
          variant: 'warning',
        });
        return;
      }

      // allowsEditing + aspect [1,1] aciona o editor nativo do iOS/Android:
      // o usuário pode arrastar e dar zoom para enquadrar o quadrado.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? guessMimeFromUri(asset.uri);
      setPendingAvatar({ uri: asset.uri, mimeType });
    } catch (error) {
      setErrorMsg(getErrorMessage(error, 'Não foi possível abrir a galeria.'));
    } finally {
      setPickingImage(false);
    }
  };

  const handleRemovePending = () => {
    setPendingAvatar(null);
  };

  const handleSave = async () => {
    if (!newName.trim()) {
      setErrorMsg('O nome não pode ficar vazio.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      let updatedAvatarUrl = avatarUrl;

      // Se selecionou uma foto nova, envia o arquivo antes de salvar o nome.
      if (pendingAvatar) {
        const uploaded = await uploadCurrentUserAvatar(pendingAvatar.uri, pendingAvatar.mimeType);
        updatedAvatarUrl = uploaded.avatar_url;
      }

      const updatedProfile = await updateCurrentUserProfile({
        full_name: newName.trim(),
        avatar_url: updatedAvatarUrl,
      });

      const userId = await getCurrentUserId();
      if (userId) {
        const cachedSnapshot = await getUserOfflineSnapshot(userId);
        await updateUserOfflineSnapshot(userId, {
          profile: cachedSnapshot?.profile
            ? { ...cachedSnapshot.profile, ...updatedProfile }
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
        getErrorMessage(error, 'Não foi possível salvar as alterações. Verifique sua conexão.'),
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

  // O preview prioriza a foto escolhida na sessão, depois a do servidor.
  const previewUri = pendingAvatar?.uri ?? avatarUrl ?? null;
  const initials = (newName || '').trim().charAt(0).toUpperCase() || 'C';

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton} disabled={saving}>
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

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
          {errorMsg !== '' && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning" size={20} color={colors.danger} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarCircle}
              onPress={handlePickImage}
              activeOpacity={0.85}
              disabled={pickingImage || saving}
            >
              {previewUri ? (
                <Image source={{ uri: previewUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitials}>{initials}</Text>
              )}

              <View style={styles.avatarCameraBadge}>
                {pickingImage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={18} color="#fff" />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarChangeButton}
              onPress={handlePickImage}
              disabled={pickingImage || saving}
            >
              <Text style={styles.avatarChangeButtonText}>
                {previewUri ? 'Trocar foto' : 'Escolher foto'}
              </Text>
            </TouchableOpacity>

            {pendingAvatar ? (
              <TouchableOpacity onPress={handleRemovePending} style={styles.avatarUndoButton}>
                <Text style={styles.avatarUndoText}>Desfazer alteração</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={styles.avatarHint}>
              Toque para escolher uma imagem da sua galeria. Você poderá enquadrar e dar zoom antes de confirmar.
            </Text>
          </View>

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
                  editable={!saving}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {alertModal}
    </SafeAreaView>
  );
}

function guessMimeFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

const getStyles = (colors: any, isDarkMode: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: Platform.OS === 'android' ? 40 : 0,
    },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 15,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    headerButton: { minWidth: 70, justifyContent: 'center' },
    cancelText: { fontSize: 17, color: colors.primary, textAlign: 'left' },
    saveText: { fontSize: 17, fontWeight: '700', color: colors.primary, textAlign: 'right' },

    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#4A1A1A' : '#FFEBEB',
      padding: 12,
      marginHorizontal: 20,
      marginTop: 20,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDarkMode ? '#6A1A1A' : '#FFD1D1',
    },
    errorText: { color: colors.danger, marginLeft: 8, fontSize: 14, fontWeight: '500', flex: 1 },

    avatarSection: {
      alignItems: 'center',
      paddingTop: 28,
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    avatarCircle: {
      width: 128,
      height: 128,
      borderRadius: 64,
      backgroundColor: isDarkMode ? colors.primaryBg : '#E5F1FF',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      borderWidth: 3,
      borderColor: colors.card,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 6,
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarInitials: {
      fontSize: 48,
      fontWeight: '700',
      color: colors.primary,
    },
    avatarCameraBadge: {
      position: 'absolute',
      right: 4,
      bottom: 4,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: colors.background,
    },
    avatarChangeButton: {
      marginTop: 16,
      paddingHorizontal: 22,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    avatarChangeButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    avatarUndoButton: { marginTop: 10 },
    avatarUndoText: { color: colors.textSecondary, fontSize: 13, textDecorationLine: 'underline' },
    avatarHint: {
      marginTop: 14,
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 18,
      lineHeight: 18,
    },

    formContainer: { paddingHorizontal: 20, paddingTop: 20 },
    inputGroup: { marginBottom: 25 },
    label: {
      fontSize: 13,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      fontWeight: '500',
      marginLeft: 16,
      marginBottom: 8,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 16,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, height: 50, fontSize: 17, color: colors.text },
  });
