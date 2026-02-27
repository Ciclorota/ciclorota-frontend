import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, SafeAreaView, ScrollView, StatusBar, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function HomeScreen({ session, navigation }: any) {
const [profile, setProfile] = useState<any>(null);
const [totalCheckpoints, setTotalCheckpoints] = useState(0); 
const [loading, setLoading] = useState(true);
const [syncing, setSyncing] = useState(false); 
const [issuing, setIssuing] = useState(false); 
const [offlineCount, setOfflineCount] = useState(0); 

const progressStats = useMemo(() => {
  const visitados = profile?.estatisticas?.total_pontos_visitados || 0;
  const porcentagem = totalCheckpoints > 0 ? Math.round((visitados / totalCheckpoints) * 100) : 0;
  
  let mensagem = "Continue pedalando! 🚴‍♂️";
  let statusColor = "#007AFF"; 

  if (porcentagem >= 100 && totalCheckpoints > 0) {
    mensagem = "Parabéns, você completou! 🎉";
    statusColor = "#34C759"; 
  } else if (porcentagem >= 80) {
    mensagem = "Quase lá! Falta pouco. 🔥";
    statusColor = "#FF9500"; 
  }

  return { visitados, porcentagem, mensagem, statusColor };
}, [profile, totalCheckpoints]);

const loadDataAndSync = async () => {
  const userId = session?.user?.id;
  if (!userId) return;
  try {
    setSyncing(true);

    const cpResponse = await fetch(`${API_URL}/checkpoints`);
    if (cpResponse.ok) {
      const cpData = await cpResponse.json();
      setTotalCheckpoints(cpData.length || 0);
    }

    const offlineData = await AsyncStorage.getItem('@ciclorota_checkins');
    if (offlineData) {
      const checkinsArray = JSON.parse(offlineData);
      setOfflineCount(checkinsArray.length);
      
      if (checkinsArray.length > 0) {
        const syncResponse = await fetch(`${API_URL}/checkins`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(checkinsArray.map((c: any) => ({ ...c, user_id: userId }))),
        });
        
        if (syncResponse.ok) {
          await AsyncStorage.removeItem('@ciclorota_checkins');
          setOfflineCount(0);
          Alert.alert('Sincronizado ☁️', 'Os check-ins salvos offline foram enviados!');
        } 
        else if (syncResponse.status === 409) {
          await AsyncStorage.removeItem('@ciclorota_checkins');
          setOfflineCount(0);
        } 
        else if (syncResponse.status >= 400) {
          await AsyncStorage.removeItem('@ciclorota_checkins');
          setOfflineCount(0);
          Alert.alert(
            'QR Code Limpo 🧹', 
            'Um código inválido que estava a travar a sincronização foi descartado da fila.'
          );
        }
      }
    }

    const response = await fetch(`${API_URL}/profiles/${userId}`);
    if (response.ok) setProfile(await response.json());

  } catch (error) {
    console.log('Erro de Conexão ou Servidor:', error);
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
        estatisticas: { ...prev.estatisticas, possui_certificado: true }
      }));
    } else {
      Alert.alert('Aviso', data.error || 'Ainda não completou a rota.');
    }
  } catch (error) {
    Alert.alert('Erro', 'Verifique sua conexão.');
  } finally {
    setIssuing(false);
  }
};

useFocusEffect(useCallback(() => { loadDataAndSync(); }, [session]));

if (loading) {
  return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

return (
  <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="dark-content" />
    <ScrollView 
    contentContainerStyle={styles.scrollContainer} 
      showsVerticalScrollIndicator={false}
    >
      
      <View style={styles.header}>
        <Text style={styles.greeting}>Olá, {profile?.full_name?.split(' ')[0] || 'Ciclista'}</Text>
        <Text style={styles.largeTitle}>Passaporte</Text>
      </View>

      <View style={styles.progressCard}>
        <View style={[styles.progressRing, { borderColor: '#E5E5EA' }]}>
            
          <View style={[
              styles.progressFill, 
              { 
                borderTopColor: progressStats.porcentagem > 0 ? progressStats.statusColor : 'transparent',
                borderRightColor: progressStats.porcentagem > 25 ? progressStats.statusColor : 'transparent',
                borderBottomColor: progressStats.porcentagem > 50 ? progressStats.statusColor : 'transparent',
                borderLeftColor: progressStats.porcentagem > 75 ? progressStats.statusColor : 'transparent',
              }
            ]} 
          />
          
          <View style={styles.innerCircle}>
            <Text style={[styles.percentageText, { color: progressStats.statusColor }]}>
              {progressStats.porcentagem}%
            </Text>
          </View>
        </View>

        <View style={styles.progressInfo}>
          <Text style={styles.progressTitle}>Progresso do percurso</Text>
          <Text style={styles.progressSub}>
            {progressStats.visitados} de {totalCheckpoints} checkpoints
          </Text>
          <Text style={[styles.motivationText, { color: progressStats.statusColor }]}>
            {progressStats.mensagem}
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.primaryButton}
        onPress={() => navigation.navigate('Camera')}
        activeOpacity={0.8}
        >
        <Ionicons name="qr-code-outline" size={26} color="white" />
        <Text style={styles.primaryButtonText}>Ler QR Code do Ponto</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Recompensas</Text>
      <View style={styles.rewardCard}>
        <View style={styles.rewardRow}>
          <View style={[styles.rewardIconContainer, profile?.estatisticas?.possui_certificado ? styles.iconActive : styles.iconLocked]}>
            <Ionicons 
              name={profile?.estatisticas?.possui_certificado ? "ribbon" : "lock-closed"} 
              size={24} 
              color={profile?.estatisticas?.possui_certificado ? "#FF9500" : "#8E8E93"} 
            />
          </View>
          <View style={styles.rewardTextContent}>
            <Text style={styles.rewardName}>Certificado de Conclusão</Text>
            <Text style={styles.rewardStatus}>
              {profile?.estatisticas?.possui_certificado 
                ? "Sua conquista está disponível!" 
                : progressStats.porcentagem >= 100
                  ? "Parabéns! Clique no botão abaixo para resgatar."
                  : `Visite mais ${totalCheckpoints > 0 ? totalCheckpoints - progressStats.visitados : '...'} paradas para resgatar.`
              }
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[
              styles.actionButton, 
              profile?.estatisticas?.possui_certificado ? styles.btnClaimed : (progressStats.porcentagem < 100 ? styles.btnDisabled : styles.btnActive)
          ]}
          disabled={progressStats.porcentagem < 100 || profile?.estatisticas?.possui_certificado || issuing}
          onPress={handleIssueCertificate}
        >
          <Text style={[styles.actionButtonText, profile?.estatisticas?.possui_certificado && { color: '#248A3D' }]}>
            {issuing ? 'Processando...' : (profile?.estatisticas?.possui_certificado ? "✓ Resgatado" : "Resgatar Certificado")}
          </Text>
        </TouchableOpacity>
      </View>

      {offlineCount > 0 && (
        <View style={styles.offlineWarning}>
          <Text style={styles.offlineText}>⚠️ Sincronização pendente: {offlineCount}</Text>
        </View>
      )}

    </ScrollView>
  </SafeAreaView>
);
}

const styles = StyleSheet.create({
safeArea: { flex: 1, backgroundColor: '#F2F2F7', paddingTop: Platform.OS === 'android' ? 45 : 0 },
scrollContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' },
header: { marginBottom: 30, marginTop: 10 },
greeting: { fontSize: 14, color: '#8E8E93', textTransform: 'uppercase', fontWeight: '700', letterSpacing: 1 },
largeTitle: { fontSize: 36, fontWeight: '800', color: '#000', marginTop: 4 },
progressCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
progressRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 8, justifyContent: 'center', alignItems: 'center', position: 'relative', transform: [{ rotate: '45deg' }] },
progressFill: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 8, borderTopColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: 'transparent' },
innerCircle: { transform: [{ rotate: '-45deg' }], justifyContent: 'center', alignItems: 'center' },
percentageText: { fontSize: 18, fontWeight: '800' },
progressInfo: { flex: 1, marginLeft: 20 },
progressTitle: { fontSize: 13, color: '#8E8E93', fontWeight: '600', textTransform: 'uppercase' },
progressSub: { fontSize: 20, fontWeight: '700', color: '#000', marginVertical: 2 },
motivationText: { fontSize: 13, fontWeight: '600', marginTop: 4 },
primaryButton: { 
  backgroundColor: '#007AFF', 
  height: 65, 
  borderRadius: 20, 
  flexDirection: 'row', 
  justifyContent: 'center', 
  alignItems: 'center', 
  gap: 10, 
  marginBottom: 35, 
  shadowColor: '#007AFF', 
  shadowOffset: { width: 0, height: 6 }, 
  shadowOpacity: 0.3, 
  shadowRadius: 10, 
  elevation: 6 
},
primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
sectionTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 15, marginLeft: 5 },
rewardCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
rewardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
rewardIconContainer: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
iconActive: { backgroundColor: '#FFF9E5' },
iconLocked: { backgroundColor: '#F2F2F7' },
rewardTextContent: { flex: 1, marginLeft: 15 },
rewardName: { fontSize: 17, fontWeight: '700', color: '#000' },
rewardStatus: { fontSize: 14, color: '#8E8E93', marginTop: 2 },
actionButton: { height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
btnActive: { backgroundColor: '#34C759' },
btnDisabled: { backgroundColor: '#E5E5EA' },
btnClaimed: { backgroundColor: '#E5FEE9', borderWidth: 1, borderColor: '#34C759' },
actionButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
offlineWarning: { backgroundColor: '#FFF3CD', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FFEEBA', marginTop: 20 },
offlineText: { color: '#856404', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});