import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhoto, setNewPhoto] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProfileAndHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const profileRes = await fetch(`${API_URL}/profiles/${userId}`);
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
        setNewName(data.full_name || '');
        setNewPhoto(data.avatar_url || '');
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

  const handleSave = async () => {
    if (!newName.trim()) {
      Alert.alert('Erro', 'O nome não pode estar vazio.');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/profiles/${session?.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newName,
          avatar_url: newPhoto
        }),
      });

      if (response.ok) {
        Alert.alert('Sucesso ✅', 'Perfil atualizado com sucesso!');
        setIsEditing(false);
        fetchProfileAndHistory();
      } else {
        throw new Error('Falha ao salvar');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
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

          {isEditing ? (
            <View style={styles.editForm}>
              <TextInput 
                style={styles.input} 
                value={newName} 
                onChangeText={setNewName} 
                placeholder="Nome completo"
                placeholderTextColor="#8E8E93"
              />
              <TextInput 
                style={styles.input} 
                value={newPhoto} 
                onChangeText={setNewPhoto} 
                placeholder="Link da foto (URL)"
                placeholderTextColor="#8E8E93"
              />
              <View style={styles.editActions}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.confirmButton]} 
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.actionButtonText}>Salvar</Text>}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.cancelButton]} 
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={styles.actionButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.userName}>{profile?.full_name || 'Ciclista Explorador'}</Text>
              <Text style={styles.userEmail}>{profile?.email || 'Membro da Ciclorota'}</Text>
              <TouchableOpacity style={styles.editToggleButton} onPress={() => setIsEditing(true)}>
                <Ionicons name="pencil" size={14} color="#007AFF" />
                <Text style={styles.editToggleButtonText}>Editar Perfil</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ESTATÍSTICAS */}
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

        {/* HISTÓRICO */}
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
                <View key={item.id} style={styles.listItem}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="location" size={24} color="#007AFF" />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <Text style={styles.itemName}>{item.checkpoints?.name}</Text>
                    <Text style={styles.itemDate}>{formatDate(item.scanned_at)}</Text>
                  </View>
                  {!isLast && <View style={styles.divider} />}
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity 
          style={styles.destructiveButton}
          onPress={() => supabase.auth.signOut()}
        >
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
  
  editToggleButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E5F1FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  editToggleButtonText: { color: '#007AFF', fontSize: 14, fontWeight: '600', marginLeft: 4 },

  editForm: { width: '100%', alignItems: 'center' },
  input: { width: '100%', backgroundColor: '#FFF', padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#C6C6C8', fontSize: 16 },
  editActions: { flexDirection: 'row', gap: 10 },
  actionButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, minWidth: 100, alignItems: 'center' },
  confirmButton: { backgroundColor: '#34C759' },
  cancelButton: { backgroundColor: '#FF3B30' },
  actionButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },

  statsContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 14, paddingVertical: 16, marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  statBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#000', marginBottom: 4 },
  statLabel: { fontSize: 13, color: '#8E8E93', textTransform: 'uppercase', fontWeight: '500' },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: '#C6C6C8' },

  sectionTitle: { fontSize: 13, color: '#8E8E93', textTransform: 'uppercase', fontWeight: '500', marginLeft: 16, marginBottom: 8 },
  listContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, marginBottom: 40 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, position: 'relative' },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5F1FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemTextContainer: { flex: 1, paddingVertical: 4 },
  itemName: { fontSize: 17, fontWeight: '600', color: '#000', marginBottom: 4 },
  itemDate: { fontSize: 14, color: '#8E8E93' },
  divider: { position: 'absolute', bottom: 0, left: 68, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: '#C6C6C8' },

  emptyState: { backgroundColor: '#FFF', padding: 30, borderRadius: 12, alignItems: 'center', marginBottom: 40 },
  emptyStateText: { fontSize: 17, fontWeight: '600', color: '#000', marginBottom: 8 },
  emptyStateSub: { fontSize: 15, color: '#8E8E93', textAlign: 'center' },

  destructiveButton: { backgroundColor: '#FFF', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 'auto' },
  destructiveButtonText: { color: '#FF3B30', fontSize: 17, fontWeight: '600' },
});