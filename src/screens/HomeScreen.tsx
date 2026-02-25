import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, SafeAreaView, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { supabase } from '../services/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function HomeScreen({ session, navigation }: any) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false); 
  const [issuing, setIssuing] = useState(false); 
  const [offlineCount, setOfflineCount] = useState(0); 

  const loadDataAndSync = async () => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      setSyncing(true);
      const offlineData = await AsyncStorage.getItem('@ciclorota_checkins');
      
      if (offlineData) {
        const checkinsArray = JSON.parse(offlineData);
        setOfflineCount(checkinsArray.length);

        if (checkinsArray.length > 0) {
          const payload = checkinsArray.map((checkin: any) => ({
            ...checkin,
            user_id: userId,
          }));

          const syncResponse = await fetch(`${API_URL}/checkins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (syncResponse.ok) {
            await AsyncStorage.removeItem('@ciclorota_checkins');
            setOfflineCount(0);
            Alert.alert('Sincronizado! ☁️', 'Os seus check-ins offline foram enviados para o servidor.');
          } else if (syncResponse.status === 409) {
             await AsyncStorage.removeItem('@ciclorota_checkins');
             setOfflineCount(0);
             Alert.alert('Aviso', 'Alguns pontos lidos offline já haviam sido visitados antes.');
          } else {
             const errorData = await syncResponse.json();
             Alert.alert('Erro do Servidor', errorData.error || 'Falha ao sincronizar.');
          }
        }
      }

      const response = await fetch(`${API_URL}/profiles/${userId}`);
      const data = await response.json();

      if (response.ok) {
        setProfile(data);
      }
      
    } catch (error: any) {
      Alert.alert('Erro de Ligação', error.message || 'Não foi possível conectar ao servidor.');
      console.log('Modo offline ativado ou erro no servidor:', error);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  const handleIssueCertificate = async () => {
    const userId = session?.user?.id;
    if (!userId) return;

    setIssuing(true);
    try {
      const response = await fetch(`${API_URL}/certificates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Parabéns! 🏆', data.mensagem);
        setProfile((prev: any) => ({
          ...prev,
          estatisticas: {
            ...prev.estatisticas,
            possui_certificado: true
          }
        }));
      } else {
        Alert.alert('Ainda não...', data.error);
      }
    } catch (error) {
      Alert.alert('Erro de Ligação', 'Verifique a sua internet e tente novamente.');
    } finally {
      setIssuing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDataAndSync();
    }, [session])
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>A carregar passaporte...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.header}>
          <Text style={styles.greeting}>Olá, {profile?.full_name || 'Ciclista'}</Text>
          <Text style={styles.largeTitle}>Passaporte</Text>
        </View>

        {offlineCount > 0 && !syncing && (
          <View style={styles.offlineWarning}>
            <Text style={styles.offlineText}>
              ⚠️ Tem {offlineCount} check-in(s) a aguardar ligação.
            </Text>
            
            <TouchableOpacity 
              style={{ marginTop: 10, backgroundColor: '#dc3545', padding: 8, borderRadius: 5, alignItems: 'center' }}
              onPress={async () => {
                await AsyncStorage.removeItem('@ciclorota_checkins');
                setOfflineCount(0);
                Alert.alert('Memória Limpa', 'Os check-ins travados foram apagados.');
              }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Apagar Check-ins Travados</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.cardGroup}>
          <Text style={styles.sectionTitle}>O SEU PROGRESSO</Text>
          <View style={styles.card}>
            
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>📍 Pontos Visitados</Text>
              <Text style={styles.cardValue}>
                {profile?.estatisticas?.total_pontos_visitados || 0}
              </Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>🏆 Certificado</Text>
              <Text style={[
                styles.cardValue, 
                profile?.estatisticas?.possui_certificado ? styles.successText : styles.pendingText
              ]}>
                {profile?.estatisticas?.possui_certificado ? 'Emitido' : 'Pendente'}
              </Text>
            </View>

          </View>
        </View>

        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Camera')}
          activeOpacity={0.8}
          disabled={syncing}
        >
          <Text style={styles.primaryButtonText}>
            {syncing ? 'A sincronizar...' : 'Ler QR Code do Ponto'}
          </Text>
        </TouchableOpacity>

        {!profile?.estatisticas?.possui_certificado ? (
          <TouchableOpacity 
            style={styles.successButton}
            onPress={handleIssueCertificate}
            activeOpacity={0.8}
            disabled={issuing || syncing}
          >
            <Text style={styles.successButtonText}>
              {issuing ? 'A verificar...' : '🏆 Emitir Certificado'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.certificateAcquired}>
            <Text style={styles.certificateAcquiredText}>🎉 Certificado Conquistado!</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F2F7', paddingTop: 40, },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  centerContainer: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#8E8E93', fontWeight: '500' },
  header: { marginBottom: 30 },
  greeting: { fontSize: 15, color: '#8E8E93', textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
  largeTitle: { fontSize: 34, fontWeight: 'bold', color: '#000', letterSpacing: 0.3 },
  sectionTitle: { fontSize: 13, color: '#8E8E93', textTransform: 'uppercase', fontWeight: '500', marginLeft: 16, marginBottom: 8 },
  cardGroup: { marginBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16 },
  cardLabel: { fontSize: 17, color: '#000', fontWeight: '400' },
  cardValue: { fontSize: 17, color: '#8E8E93', fontWeight: '400' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#C6C6C8', marginLeft: 16 },
  successText: { color: '#34C759', fontWeight: '600' },
  pendingText: { color: '#FF9500', fontWeight: '600' },
  
  offlineWarning: { backgroundColor: '#FFF3CD', padding: 12, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#FFEEBA' },
  offlineText: { color: '#856404', fontSize: 14, fontWeight: '500', textAlign: 'center' },

  primaryButton: { backgroundColor: '#007AFF', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 16, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
  
  successButton: { backgroundColor: '#34C759', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 16, shadowColor: '#34C759', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  successButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
  certificateAcquired: { backgroundColor: '#E5FEE9', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#34C759' },
  certificateAcquiredText: { color: '#248A3D', fontSize: 17, fontWeight: '600' },

  destructiveButton: { paddingVertical: 16, alignItems: 'center', marginTop: 'auto' },
  destructiveButtonText: { color: '#FF3B30', fontSize: 17, fontWeight: '500' },
});