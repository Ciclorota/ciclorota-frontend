import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, SafeAreaView, ScrollView, StatusBar, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '../services/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { useAppAlert } from '../components/AppAlertModal';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function HomeScreen({ session, navigation }: any) {
  const { colors, isDarkMode } = useTheme();
  const { showAlert, alertModal } = useAppAlert();
  const [profile, setProfile] = useState<any>(null);
  const [totalCheckpoints, setTotalCheckpoints] = useState(0); 
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false); 
  const [issuing, setIssuing] = useState(false); 
  
  const [offlineCount, setOfflineCount] = useState(0); 
  // NOVO: Estado para contar APENAS os pontos offline que são verdadeiros e inéditos
  const [validOfflineCount, setValidOfflineCount] = useState(0); 

  const progressStats = useMemo(() => {
    const visitadosServidor = profile?.estatisticas?.total_pontos_visitados || 0;
    // CÁLCULO BLINDADO: Soma apenas os pontos válidos e inéditos da fila offline
    const visitados = visitadosServidor + validOfflineCount; 
    const porcentagem = totalCheckpoints > 0 ? Math.round((visitados / totalCheckpoints) * 100) : 0;
    
    let mensagem = "Continue pedalando! 🚴‍♂️";
    let statusColor = colors.primary; 

    if (porcentagem >= 100 && totalCheckpoints > 0) {
      mensagem = "Parabéns, você completou! 🎉";
      statusColor = colors.success; 
    } else if (porcentagem >= 80) {
      mensagem = "Quase lá! Falta pouco. 🔥";
      statusColor = colors.warning; 
    }

    return { visitados, porcentagem, mensagem, statusColor };
  }, [profile, totalCheckpoints, validOfflineCount, colors]);

  const loadDataAndSync = async () => {
    const userId = session?.user?.id;
    if (!userId) return;
    
    try {
      setSyncing(true);

      // 1. LÊ AS LISTAS SECRETAS (CACHE LOCAL) ANTES DE TUDO
      const validIdsStr = await AsyncStorage.getItem('@ciclorota_valid_ids');
      const visitedIdsStr = await AsyncStorage.getItem('@ciclorota_visited_ids');
      const validIds = validIdsStr ? JSON.parse(validIdsStr) : [];
      const visitedIds = visitedIdsStr ? JSON.parse(visitedIdsStr) : [];

      // 2. LÊ A FILA OFFLINE
      const offlineData = await AsyncStorage.getItem('@ciclorota_checkins');
      let checkinsArray = [];
      if (offlineData) {
        checkinsArray = JSON.parse(offlineData);
        setOfflineCount(checkinsArray.length); // Mostra o aviso amarelo na tela (mesmo sendo código lixo)

        // O FILTRO DETETIVE: Só soma na barra de progresso se o ID existir na trilha e ainda não tiver sido visitado!
        if (validIds.length > 0) {
          const uniqueValidOffline = [...new Set(checkinsArray.map((c: any) => c.checkpoint_id))]
            .filter((id: any) => validIds.includes(id) && !visitedIds.includes(id));
          setValidOfflineCount(uniqueValidOffline.length);
        } else {
          setValidOfflineCount(0);
        }
      } else {
        setOfflineCount(0);
        setValidOfflineCount(0);
      }

      // 3. TENTA SINCRONIZAR COM O SERVIDOR
      if (checkinsArray.length > 0) {
        const syncResponse = await fetch(`${API_URL}/checkins`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(checkinsArray.map((c: any) => ({ ...c, user_id: userId }))),
        });
        
        if (syncResponse.ok) {
          await AsyncStorage.removeItem('@ciclorota_checkins');
          setOfflineCount(0);
          setValidOfflineCount(0);
          showAlert({
            title: 'Sincronizado ☁️',
            message: 'Os check-ins salvos offline foram enviados!',
            variant: 'success',
          });
        } 
        else if (syncResponse.status === 409) {
          await AsyncStorage.removeItem('@ciclorota_checkins');
          setOfflineCount(0);
          setValidOfflineCount(0);
        } 
        else if (syncResponse.status >= 400) {
          await AsyncStorage.removeItem('@ciclorota_checkins');
          setOfflineCount(0);
          setValidOfflineCount(0);
          showAlert({
            title: 'QR Code Limpo 🧹',
            message: 'Um código inválido que estava a travar a sincronização foi descartado da fila.',
            variant: 'warning',
          });
        }
      }

      // 4. RENOVA OS DADOS DO SERVIDOR E GUARDA AS LISTAS SECRETAS PARA A PRÓXIMA VEZ OFFLINE
      const cpResponse = await fetch(`${API_URL}/checkpoints`);
      if (cpResponse.ok) {
        const cpData = await cpResponse.json();
        setTotalCheckpoints(cpData.length || 0);
        // Guarda todos os IDs de checkpoints válidos no aparelho
        await AsyncStorage.setItem('@ciclorota_valid_ids', JSON.stringify(cpData.map((c: any) => c.id)));
      }

      const response = await fetch(`${API_URL}/profiles/${userId}`);
      if (response.ok) {
        setProfile(await response.json());
      }

      const progressRes = await fetch(`${API_URL}/progress/${userId}`);
      if (progressRes.ok) {
        const progressData = await progressRes.json();
        const visitedIdsBackend = progressData.historico?.map((checkin: any) => checkin.checkpoints.id) || [];
        // Guarda todos os IDs que o utilizador já visitou no aparelho
        await AsyncStorage.setItem('@ciclorota_visited_ids', JSON.stringify(visitedIdsBackend));
      }

    } catch (error) {
      console.log('Modo Offline: Sem conexão. A matemática blindada segurou os erros!');
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
        showAlert({
          title: 'Parabéns! 🏆',
          message: data.mensagem,
          variant: 'success',
        });
        setProfile((prev: any) => ({
          ...prev,
          estatisticas: { ...prev.estatisticas, possui_certificado: true }
        }));
      } else {
        showAlert({
          title: 'Aviso',
          message: data.error || 'Ainda não completou a rota.',
          variant: 'warning',
        });
      }
    } catch (error) {
      showAlert({
        title: 'Erro',
        message: 'Verifique sua conexão.',
        variant: 'error',
      });
    } finally {
      setIssuing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadDataAndSync(); }, [session]));

  const styles = getStyles(colors, isDarkMode);

  if (loading && !profile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
      >
        
        <View style={styles.header}>
          <Text style={styles.greeting}>Olá, {profile?.full_name?.split(' ')[0] || 'Ciclista'}</Text>
          <Text style={styles.largeTitle}>Seu Passaporte</Text>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressRingContainer}>
            <Svg width="80" height="80" viewBox="0 0 80 80">
              <Circle
                cx="40"
                cy="40"
                r="34"
                stroke={colors.borderLight}
                strokeWidth="8"
                fill="transparent"
              />
              <Circle
                cx="40"
                cy="40"
                r="34"
                stroke={progressStats.porcentagem > 0 ? progressStats.statusColor : 'transparent'}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={2 * Math.PI * 34 - (2 * Math.PI * 34 * progressStats.porcentagem) / 100}
                strokeLinecap="round"
                transform="rotate(-90 40 40)"
              />
            </Svg>
            <View style={styles.innerCircleAbsolute}>
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

        {offlineCount > 0 && (
          <View style={styles.offlineWarning}>
            <Text style={styles.offlineText}>⚠️ Sincronização pendente: {offlineCount} ponto(s) salvos no aparelho.</Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Camera')}
          activeOpacity={0.8}
        >
          <Ionicons name="qr-code-outline" size={26} color={colors.white} />
          <Text style={styles.primaryButtonText}>Escanear Checkpoint</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Recompensas</Text>
        <View style={styles.rewardCard}>
          <View style={styles.rewardRow}>
            <View style={[styles.rewardIconContainer, profile?.estatisticas?.possui_certificado ? styles.iconActive : styles.iconLocked]}>
              <Ionicons 
                name={profile?.estatisticas?.possui_certificado ? "ribbon" : "lock-closed"} 
                size={24} 
                color={profile?.estatisticas?.possui_certificado ? colors.warning : colors.textSecondary} 
              />
            </View>
            <View style={styles.rewardTextContent}>
              <Text style={styles.rewardName}>Certificado de Conclusão</Text>
              <Text style={styles.rewardStatus}>
                {profile?.estatisticas?.possui_certificado 
                  ? "Sua conquista está disponível!" 
                  : progressStats.porcentagem >= 100
                    ? "Parabéns! Clique no botão abaixo para resgatar."
                    : `Visite mais ${totalCheckpoints > 0 ? totalCheckpoints - progressStats.visitados : '...'} ${(totalCheckpoints - progressStats.visitados) === 1 ? 'parada' : 'paradas'} para resgatar.`
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
            <Text style={[styles.actionButtonText, profile?.estatisticas?.possui_certificado && { color: colors.success }]}>
              {issuing ? 'Processando...' : (profile?.estatisticas?.possui_certificado ? "✓ Resgatado" : "Resgatar Certificado")}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {alertModal}
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 45 : 0 },
  scrollContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { marginBottom: 30, marginTop: 10 },
  greeting: { fontSize: 14, color: colors.textSecondary, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 1 },
  largeTitle: { fontSize: 36, fontWeight: '800', color: colors.text, marginTop: 4 },
  progressCard: { backgroundColor: colors.card, borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 20, shadowColor: colors.text, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  progressRingContainer: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  innerCircleAbsolute: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  percentageText: { fontSize: 18, fontWeight: '800' },
  progressInfo: { flex: 1, marginLeft: 20 },
  progressTitle: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
  progressSub: { fontSize: 20, fontWeight: '700', color: colors.text, marginVertical: 2 },
  motivationText: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  primaryButton: { 
    backgroundColor: colors.primary, 
    height: 65, 
    borderRadius: 20, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 10, 
    marginBottom: 35, 
    shadowColor: colors.primary, 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 10, 
    elevation: 6 
  },
  primaryButtonText: { color: colors.white, fontSize: 18, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 15, marginLeft: 5 },
  rewardCard: { backgroundColor: colors.card, borderRadius: 24, padding: 20, shadowColor: colors.text, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  rewardIconContainer: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  iconActive: { backgroundColor: isDarkMode ? '#332A00' : '#FFF9E5' },
  iconLocked: { backgroundColor: colors.secondaryBg },
  rewardTextContent: { flex: 1, marginLeft: 15 },
  rewardName: { fontSize: 17, fontWeight: '700', color: colors.text },
  rewardStatus: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  actionButton: { height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  btnActive: { backgroundColor: colors.success },
  btnDisabled: { backgroundColor: colors.borderLight },
  btnClaimed: { backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.success },
  actionButtonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  offlineWarning: { backgroundColor: isDarkMode ? '#4D3800' : '#FFF3CD', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: isDarkMode ? '#664D00' : '#FFEEBA', marginBottom: 25 },
  offlineText: { color: isDarkMode ? '#FFD633' : '#856404', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});