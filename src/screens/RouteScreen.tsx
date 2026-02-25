import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

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

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isLast = index === routeData.length - 1;

    return (
      <View style={styles.listItem}>
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
      <View style={styles.header}>
        <Text style={styles.largeTitle}>A Rota 🗺️</Text>
        <Text style={styles.subtitle}>
          Explore os pontos da Mata Atlântica. Visite todos para desbloquear o seu certificado!
        </Text>
      </View>

      <View style={styles.listWrapper}>
        <FlatList
          data={routeData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F2F7', paddingTop: 40, },
  centerContainer: { justifyContent: 'center', alignItems: 'center' },
  
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  largeTitle: { fontSize: 34, fontWeight: 'bold', color: '#000', letterSpacing: 0.3 },
  subtitle: { fontSize: 15, color: '#8E8E93', marginTop: 8, lineHeight: 20 },

  listWrapper: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  listContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    paddingBottom: 0, 
  },
  
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    position: 'relative',
  },
  itemTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 15,
    color: '#8E8E93',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
  },
  divider: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#C6C6C8',
  },
});