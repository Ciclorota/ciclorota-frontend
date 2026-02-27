import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function ProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (session?.user?.created_at) {
        setUserCreatedAt(session.user.created_at);
      }

      if (!userId) return;

      const profileRes = await fetch(`${API_URL}/profiles/${userId}`);
      if (profileRes.ok) {
        setProfile(await profileRes.json());
      }

      const progressRes = await fetch(`${API_URL}/progress/${userId}`);
      if (progressRes.ok) {
        const progressData = await progressRes.json();
        const sortedHistory = (progressData.historico || []).sort((a: any, b: any) => {
          return new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime();
        });
        setHistory(sortedHistory);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfileAndHistory();
    }, [])
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  const formatMemberSince = (dateString: string | null) => {
    if (!dateString) return 'Membro da Ciclorota';
    const date = new Date(dateString);
    const month = date.toLocaleString('pt-BR', { month: 'long' });
    const year = date.getFullYear();
    return `Membro desde ${month.charAt(0).toUpperCase() + month.slice(1)} de ${year}`;
  };

  if (loading) {
    return (
      <View style={[styles.safeArea, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <View style={styles.profileHeader}>
          <View style={styles.avatarPlaceholder}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'C'}
              </Text>
            )}
          </View>
          <Text style={styles.userName}>{profile?.full_name || 'Ciclista Explorador'}</Text>
          <Text style={styles.userEmail}>{formatMemberSince(userCreatedAt)}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{history.length}</Text>
            <Text style={styles.statLabel}>{history.length === 1 ? "Ponto" : "Pontos"}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Ionicons 
              name={profile?.estatisticas?.possui_certificado ? "medal" : "medal-outline"} 
              size={24} 
              color={profile?.estatisticas?.possui_certificado ? "#FF9500" : "#C6C6C8"} 
            />
            <Text style={styles.statLabel}>Certificado</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>HISTÓRICO DE CHECK-INS</Text>
        
        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Ainda não visitou nenhum ponto.</Text>
            <Text style={styles.emptyStateSub}>Vá até à aba Início e leia o seu primeiro QR Code!</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {history.map((item, index) => {
              const isLast = index === history.length - 1;
              return (
                <View key={item.id} style={styles.listItemHistory}>
                  {!isLast && <View style={styles.timelineLine} />}
                  <View style={styles.iconContainerGreen}>
                    <Ionicons name="location" size={20} color="#34C759" />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <Text style={styles.itemName}>{item.checkpoints?.name}</Text>
                    <Text style={styles.itemDate}>{formatDate(item.scanned_at)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitle}>MINHA CONTA</Text>
        <View style={styles.listContainer}>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('EditProfile')}>
            <View style={[styles.menuIconBg, { backgroundColor: '#E5F1FF' }]}>
              <Ionicons name="person-outline" size={20} color="#007AFF" />
            </View>
            <Text style={styles.menuItemText}>Meu perfil</Text>
            <Ionicons name="chevron-forward" size={20} color="#C6C6C8" />
          </TouchableOpacity>
          
          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Em breve', 'Configurações estarão disponíveis na próxima versão.')}>
            <View style={[styles.menuIconBg, { backgroundColor: '#F2F2F7' }]}>
              <Ionicons name="settings-outline" size={20} color="#8E8E93" />
            </View>
            <Text style={styles.menuItemText}>Configurações</Text>
            <Ionicons name="chevron-forward" size={20} color="#C6C6C8" />
          </TouchableOpacity>
          
          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Em breve', 'Central de ajuda estará disponível na próxima versão.')}>
            <View style={[styles.menuIconBg, { backgroundColor: '#FFF0F0' }]}>
              <Ionicons name="help-circle-outline" size={20} color="#FF3B30" />
            </View>
            <Text style={styles.menuItemText}>Ajuda e Suporte</Text>
            <Ionicons name="chevron-forward" size={20} color="#C6C6C8" />
          </TouchableOpacity>

        </View>

        <TouchableOpacity 
          style={styles.destructiveButton}
          onPress={() => supabase.auth.signOut()}
        >
          <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
          <Text style={styles.destructiveButtonText}>Sair da Conta</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F2F7', paddingTop: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40 },
  
  profileHeader: { alignItems: 'center', marginBottom: 24 },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginBottom: 12, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 36, color: '#FFF', fontWeight: 'bold' },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#000', marginBottom: 2 },
  userEmail: { fontSize: 15, color: '#8E8E93', marginBottom: 10 },

  statsContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 14, paddingVertical: 16, marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  statBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#000', marginBottom: 4 },
  statLabel: { fontSize: 13, color: '#8E8E93', textTransform: 'uppercase', fontWeight: '500' },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: '#C6C6C8' },

  sectionTitle: { fontSize: 13, color: '#8E8E93', textTransform: 'uppercase', fontWeight: '500', marginLeft: 16, marginBottom: 8, marginTop: 10 },
  listContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, marginBottom: 30 },
  
  listItemHistory: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 16, paddingHorizontal: 16, position: 'relative' },
  iconContainerGreen: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5FEE9', justifyContent: 'center', alignItems: 'center', marginRight: 12, zIndex: 2 },
  timelineLine: { position: 'absolute', top: 58, bottom: -10, left: 33, width: 2, backgroundColor: '#E5E5EA', zIndex: 1 },
  itemTextContainer: { flex: 1, justifyContent: 'center', height: 36 },
  itemName: { fontSize: 17, fontWeight: '600', color: '#000', marginBottom: 2 },
  itemDate: { fontSize: 14, color: '#8E8E93' },

  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  menuIconBg: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuItemText: { flex: 1, fontSize: 17, color: '#000', fontWeight: '400' },
  menuDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#C6C6C8' }, 

  emptyState: { backgroundColor: '#FFF', padding: 30, borderRadius: 12, alignItems: 'center', marginBottom: 40 },
  emptyStateText: { fontSize: 17, fontWeight: '600', color: '#000', marginBottom: 8 },
  emptyStateSub: { fontSize: 15, color: '#8E8E93', textAlign: 'center' },

  destructiveButton: { backgroundColor: '#FFF', paddingVertical: 16, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  destructiveButtonText: { color: '#FF3B30', fontSize: 17, fontWeight: '600', marginLeft: 8 },
});