import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'; 

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function RouteScreen() {
  const [routeData, setRouteData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function fetchRouteProgress() {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const userId = session?.user?.id;
          if (!userId) return;

          const checkpointsRes = await fetch(`${API_URL}/checkpoints`);
          const allCheckpoints = await checkpointsRes.json();

          const progressRes = await fetch(`${API_URL}/progress/${userId}`);
          const progressData = await progressRes.json();
          
          const visitedIds = progressData.historico?.map((checkin: any) => checkin.checkpoints.id) || [];

          const mergedData = allCheckpoints.map((cp: any) => ({
            ...cp,
            isVisited: visitedIds.includes(cp.id)
          }));

          setRouteData(mergedData);
        } catch (error) {
          console.error('Erro ao carregar rota:', error);
        } finally {
          setLoading(false);
        }
      }

      fetchRouteProgress();
    }, [])
  );

  if (loading) {
    return (
      <View style={[styles.safeArea, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerContainer}>
          <Text style={styles.largeTitle}>A Rota</Text>
          <Text style={styles.subtitle}>
            Explore os pontos da Mata Atlântica. Visite todos para desbloquear o seu certificado!
          </Text>

          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE} 
              style={styles.map}
              initialRegion={{
                latitude: -23.6236, 
                longitude: -45.4242,
                latitudeDelta: 0.5, 
                longitudeDelta: 0.5,
              }}
            >
              {routeData.map((point) => {
                if (point.latitude != null && point.longitude != null) {
                  return (
                    <Marker
                      key={point.id}
                      coordinate={{
                        latitude: Number(point.latitude),
                        longitude: Number(point.longitude),
                      }}
                      title={point.name}
                      description={point.isVisited ? "✅ Visitado!" : "🔒 Ponto Pendente"}
                      pinColor={point.isVisited ? '#34C759' : '#007AFF'} 
                    />
                  );
                }
                return null;
              })}
            </MapView>
          </View>

          <Text style={styles.sectionTitle}>CHECKPOINTS</Text>
        </View>

        <View style={styles.listWrapper}>
          <View style={styles.listContainer}>
            {routeData.map((item, index) => {
              const isLast = index === routeData.length - 1;

              return (
                <View key={item.id} style={styles.listItem}>
                  <View style={[styles.sequenceContainer, item.isVisited ? styles.sequenceVisited : styles.sequencePending]}>
                    <Text style={[styles.sequenceText, item.isVisited ? styles.sequenceVisitedText : styles.sequencePendingText]}>
                      {index + 1}
                    </Text>
                  </View>

                  <View style={styles.itemTextContainer}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </View>
                  
                  <View style={styles.iconContainer}>
                    {item.isVisited ? (
                      <Ionicons name="checkmark-circle" size={28} color="#34C759" /> 
                    ) : (
                      <Ionicons name="lock-closed" size={24} color="#C6C6C8" /> 
                    )}
                  </View>

                  {!isLast && <View style={styles.divider} />}
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F2F7', paddingTop: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 40 },
  headerContainer: { paddingHorizontal: 20, paddingTop: 20 },
  largeTitle: { fontSize: 34, fontWeight: 'bold', color: '#000', letterSpacing: 0.3 },
  subtitle: { fontSize: 15, color: '#8E8E93', marginTop: 8, lineHeight: 20, marginBottom: 20 },
  
  mapContainer: {
    height: 200, width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
    backgroundColor: '#E5E5EA',
  },
  map: { ...StyleSheet.absoluteFillObject },

  sectionTitle: { fontSize: 13, color: '#8E8E93', textTransform: 'uppercase', fontWeight: '500', marginBottom: 8 },
  listWrapper: { paddingHorizontal: 20 },
  listContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, position: 'relative' },
  sequenceContainer: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sequencePending: { backgroundColor: '#E5F1FF' },
  sequenceVisited: { backgroundColor: '#E5FEE9' },
  sequenceText: { fontSize: 14, fontWeight: 'bold' },
  sequencePendingText: { color: '#007AFF' },
  sequenceVisitedText: { color: '#34C759' },
  itemTextContainer: { flex: 1, paddingRight: 16 },
  itemName: { fontSize: 17, fontWeight: '600', color: '#000', marginBottom: 4 },
  itemDescription: { fontSize: 15, color: '#8E8E93' },
  iconContainer: { justifyContent: 'center', alignItems: 'center', width: 32 },
  divider: { position: 'absolute', bottom: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: '#C6C6C8' },
});