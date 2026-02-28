import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Switch, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { useAppAlert } from '../components/AppAlertModal';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function SettingsScreen({ navigation }: any) {
  const { isDarkMode, toggleTheme, colors } = useTheme();
  const { showAlert, alertModal } = useAppAlert();
  const [syncing, setSyncing] = useState(false);
  
  const styles = getStyles(colors, isDarkMode);

  const handleForceSync = async () => {
    try {
      setSyncing(true);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const offlineData = await AsyncStorage.getItem('@ciclorota_checkins');
      if (!offlineData) {
        showAlert({
          title: 'Tudo Atualizado ✅',
          message: 'Não há check-ins pendentes para sincronizar.',
          variant: 'info',
        });
        return;
      }

      const checkinsArray = JSON.parse(offlineData);
      if (checkinsArray.length === 0) {
        showAlert({
          title: 'Tudo Atualizado ✅',
          message: 'Não há check-ins pendentes para sincronizar.',
          variant: 'info',
        });
        return;
      }

      const syncResponse = await fetch(`${API_URL}/checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkinsArray.map((c: any) => ({ ...c, user_id: userId }))),
      });

      if (syncResponse.ok) {
        await AsyncStorage.removeItem('@ciclorota_checkins');
        showAlert({
          title: 'Sincronizado ☁️',
          message: 'Todos os seus pontos foram enviados com sucesso!',
          variant: 'success',
        });
      } else if (syncResponse.status === 409) {
        await AsyncStorage.removeItem('@ciclorota_checkins');
        showAlert({
          title: 'Aviso',
          message: 'Os pontos pendentes já tinham sido visitados.',
          variant: 'warning',
        });
      } else if (syncResponse.status >= 400) {
        await AsyncStorage.removeItem('@ciclorota_checkins');
        showAlert({
          title: 'Fila Limpa 🧹',
          message: 'Foram encontrados dados inválidos que estavam a travar o envio. A fila foi limpa.',
          variant: 'warning',
        });
      }
    } catch (error) {
      showAlert({
        title: 'Erro de Conexão',
        message: 'Não foi possível ligar ao servidor. Tente novamente mais tarde.',
        variant: 'error',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleClearData = () => {
    showAlert({
      title: 'Limpar Dados Locais',
      message: 'Tem certeza de que deseja apagar o cache e os check-ins pendentes? Esta ação não pode ser desfeita.',
      variant: 'warning',
      cancelText: 'Cancelar',
      confirmText: 'Limpar',
      onConfirm: async () => {
        await AsyncStorage.removeItem('@ciclorota_checkins');
        showAlert({
          title: 'Pronto!',
          message: 'Os dados locais foram apagados.',
          variant: 'success',
        });
      },
    });
  };

  // 3. EXCLUIR MINHA CONTA
  const handleDeleteAccount = () => {
    showAlert({
      title: '🚨 Excluir Minha Conta',
      message: 'Tem certeza absoluta? Todos os seus check-ins, certificados e progresso na Mata Atlântica serão apagados permanentemente.',
      variant: 'error',
      cancelText: 'Cancelar',
      confirmText: 'Sim, excluir tudo',
      onConfirm: async () => {
        try {
          await AsyncStorage.removeItem('@ciclorota_checkins');
          await supabase.auth.signOut();
        } catch (error) {
          showAlert({
            title: 'Erro',
            message: 'Não foi possível excluir a conta neste momento.',
            variant: 'error',
          });
        }
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* CABEÇALHO */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={styles.cancelText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurações</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.container}>
        
        <Text style={styles.sectionTitle}>APARÊNCIA</Text>
        <View style={styles.listContainer}>
          <View style={styles.menuItem}>
            <View style={[styles.menuIconBg, { backgroundColor: isDarkMode ? colors.primaryBg : '#E5F1FF' }]}>
              <Ionicons name={isDarkMode ? "moon" : "sunny"} size={20} color={colors.primary} />
            </View>
            <Text style={styles.menuItemText}>Modo Escuro</Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 25 }]}>ARMAZENAMENTO</Text>
        <View style={styles.listContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={handleForceSync} disabled={syncing}>
            <View style={[styles.menuIconBg, { backgroundColor: isDarkMode ? '#1E3A8A' : '#E5F1FF' }]}>
              {syncing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
              )}
            </View>
            <Text style={styles.menuItemText}>Forçar Sincronização</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.border} />
          </TouchableOpacity>
          
          <View style={styles.menuDivider} />
          
          <TouchableOpacity style={styles.menuItem} onPress={handleClearData}>
            <View style={[styles.menuIconBg, { backgroundColor: isDarkMode ? '#4A1A1A' : '#FFF0F0' }]}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </View>
            <Text style={styles.menuItemText}>Limpar Dados Locais</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.border} />
          </TouchableOpacity>
        </View>

        {/* BLOCO 3: CONTA */}
        <Text style={[styles.sectionTitle, { marginTop: 25 }]}>CONTA</Text>
        <View style={styles.listContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount}>
            <View style={[styles.menuIconBg, { backgroundColor: isDarkMode ? '#4A1A1A' : '#FFF0F0' }]}>
              <Ionicons name="warning-outline" size={20} color={colors.danger} />
            </View>
            <Text style={[styles.menuItemText, { color: colors.danger, fontWeight: '500' }]}>Excluir Minha Conta</Text>
          </TouchableOpacity>
        </View>

      </View>

      {alertModal}
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 40 : 0 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, backgroundColor: colors.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  headerButton: { minWidth: 70, justifyContent: 'center' },
  cancelText: { fontSize: 17, color: colors.primary, textAlign: 'left' },
  
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 30 },
  sectionTitle: { fontSize: 13, color: colors.textSecondary, textTransform: 'uppercase', fontWeight: '500', marginLeft: 16, marginBottom: 8 },
  listContainer: { backgroundColor: colors.card, borderRadius: 12, overflow: 'hidden', shadowColor: colors.text, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  menuIconBg: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuItemText: { flex: 1, fontSize: 17, fontWeight: '400', color: colors.text },
  
  menuDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 64 },
});