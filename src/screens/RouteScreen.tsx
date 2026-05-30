import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView, TouchableOpacity, Platform, Linking, Modal, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteMap } from '../components/RouteMap';
import { getUserOfflineSnapshot, updateUserOfflineSnapshot } from '../services/offlineCache';
import { fetchCheckpoints } from '../services/api/passport';
import { fetchCurrentUserProgress } from '../services/api/profile';
import { getCurrentSession } from '../services/auth';
import { getPendingCheckins } from '../storage/checkins';
import { Checkpoint, RouteCheckpoint } from '../types/passport';

const ROUTE_CACHE_KEY = '@ciclorota_route_cache';

type RouteMapSource = Checkpoint & {
  map_url?: string | null;
  maps_url?: string | null;
  google_maps_url?: string | null;
};

function getRouteCacheKey(userId: string) {
  return `${ROUTE_CACHE_KEY}:${userId}`;
}

export function RouteScreen() {
  const { colors, isDarkMode } = useTheme();
  const [routeData, setRouteData] = useState<RouteCheckpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState<RouteCheckpoint | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const resolveMapUrl = (point: RouteMapSource): string => {
    const directUrl = point?.map || point?.map_url || point?.maps_url || point?.google_maps_url;
    if (typeof directUrl === 'string' && directUrl.trim().length > 0) {
      return directUrl.trim();
    }

    if (point?.latitude != null && point?.longitude != null) {
      return `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`;
    }

    return '';
  };

  useFocusEffect(
    useCallback(() => {
      async function fetchRouteProgress() {
        setLoading(true);
        try {
          const session = await getCurrentSession();
          const userId = session?.user?.id;
          if (!userId) {
            setLoading(false);
            return;
          }
          const routeCacheKey = getRouteCacheKey(userId);
          const pendingCheckins = await getPendingCheckins(userId);
          const pendingIds = new Set(
            pendingCheckins.map((checkin) => checkin.checkpoint_id),
          );

          const cachedSnapshot = await getUserOfflineSnapshot(userId);
          if (cachedSnapshot?.checkpoints && cachedSnapshot?.progressHistory) {
            const visitedFromSnapshot = new Set(
              (cachedSnapshot.progressHistory || [])
                .map((checkin) => checkin?.checkpoints?.id)
                .filter(Boolean),
            );

            const mergedFromSnapshot = (cachedSnapshot.checkpoints || []).map((cp) => ({
              ...cp,
              map: resolveMapUrl(cp),
              isVisited: visitedFromSnapshot.has(cp.id) || pendingIds.has(cp.id),
            }));

            setRouteData(mergedFromSnapshot);
            setLoading(false);
          }

          const cachedRoute =
            (await AsyncStorage.getItem(routeCacheKey)) ||
            (await AsyncStorage.getItem(ROUTE_CACHE_KEY));
          if (cachedRoute) {
            const parsedCache = JSON.parse(cachedRoute);
            if (Array.isArray(parsedCache)) {
              setRouteData(parsedCache);
              setLoading(false);
            }
          }

          const [allCheckpoints, progressData] = await Promise.all([
            fetchCheckpoints(),
            fetchCurrentUserProgress(),
          ]);
          const latestProgressHistory = progressData.historico || [];
          const visitedIdsBackend = new Set(
            latestProgressHistory
              .map((checkin) => checkin.checkpoints?.id)
              .filter(Boolean),
          );

          const mergedData = allCheckpoints.map((cp) => ({
            ...cp,
            map: resolveMapUrl(cp),
            isVisited: visitedIdsBackend.has(cp.id) || pendingIds.has(cp.id),
          }));

          setRouteData(mergedData);
          await AsyncStorage.setItem(routeCacheKey, JSON.stringify(mergedData));
          await updateUserOfflineSnapshot(userId, {
            checkpoints: allCheckpoints,
            progressHistory: latestProgressHistory,
          });
        } catch (error) {
          console.error('Erro ao carregar rota:', error);
        } finally {
          setLoading(false);
        }
      }

      fetchRouteProgress();
    }, [])
  );

  const styles = getStyles(colors, isDarkMode);

  if (loading && routeData.length === 0) {
    return (
      <View style={[styles.safeArea, styles.centerContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isRouteCompleted = routeData.length > 0 && routeData.every(point => point.isVisited);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerContainer}>
          <Text style={styles.largeTitle}>A Rota</Text>
          
          <Text style={[styles.subtitle, isRouteCompleted && { color: colors.success, fontWeight: '500' }]}>
            {isRouteCompleted 
              ? "Parabéns! Você completou toda a rota da Mata Atlântica. O seu certificado já está disponível!" 
              : "Explore os pontos da Mata Atlântica. Visite todos para desbloquear o seu certificado!"}
          </Text>

          <View style={styles.mapContainer}>
            <RouteMap colors={colors} routeData={routeData} />
          </View>

          <Text style={styles.sectionTitle}>CHECKPOINTS</Text>
        </View>

        <View style={styles.listWrapper}>
          <View style={styles.listContainer}>
            {routeData.map((item, index) => {
              const isLast = index === routeData.length - 1;

              return (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.listItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedPoint(item);
                    setModalVisible(true);
                  }}
                >
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
                      <Ionicons name="checkmark-circle" size={28} color={colors.success} /> 
                    ) : (
                      <Ionicons name="navigate-circle-outline" size={28} color={colors.primary} /> 
                    )}
                  </View>

                  {!isLast && <View style={styles.divider} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

      </ScrollView>

      {selectedPoint && (
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalBackground}>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              
              <Text style={styles.modalTitle}>{selectedPoint.name}</Text>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carouselContainer}>
                <View style={[styles.imagePlaceholder, { backgroundColor: colors.borderLight }]} />
                <View style={[styles.imagePlaceholder, { backgroundColor: colors.borderLight }]} />
                <View style={[styles.imagePlaceholder, { backgroundColor: colors.borderLight }]} />
              </ScrollView>

              <ScrollView style={styles.modalDescriptionContainer}>
                <Text style={styles.modalDescription}>{selectedPoint.description}</Text>
              </ScrollView>

              <View style={styles.modalButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.routeButton]} 
                  onPress={() => {
                    const mapUrl = resolveMapUrl(selectedPoint);
                    if (mapUrl) {
                      Linking.openURL(mapUrl).catch((err) => console.error('Erro ao abrir o link do mapa:', err));
                    } else {
                      console.log('Nenhum link de mapa disponível para esta rota.');
                    }
                  }}
                >
                  <Ionicons name="map" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.modalButtonText}>Traçar Rota</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.modalButton, 
                    styles.wikilocButton, 
                    !selectedPoint.info && styles.buttonDisabled
                  ]} 
                  disabled={!selectedPoint.info}
                  onPress={() => {
                    if (selectedPoint.info) {
                      Linking.openURL(selectedPoint.info).catch((err) => console.error('Erro ao abrir o link do Wikiloc:', err));
                    }
                  }}
                >
                  <Ionicons name="compass-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.modalButtonText}>Ver no Wikiloc</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background, paddingTop: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 40 },
  headerContainer: { paddingHorizontal: 20, paddingTop: 20 },
  largeTitle: { fontSize: 34, fontWeight: 'bold', color: colors.text, letterSpacing: 0.3 },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginTop: 8, lineHeight: 20, marginBottom: 20 },
  
  mapContainer: {
    height: 200, width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 24,
    shadowColor: colors.text, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
    backgroundColor: colors.borderLight,
  },

  sectionTitle: { fontSize: 13, color: colors.textSecondary, textTransform: 'uppercase', fontWeight: '500', marginBottom: 8 },
  listWrapper: { paddingHorizontal: 20 },
  listContainer: { backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden', shadowColor: colors.text, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, position: 'relative' },
  sequenceContainer: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sequencePending: { backgroundColor: isDarkMode ? colors.primaryBg : '#E5F1FF' },
  sequenceVisited: { backgroundColor: isDarkMode ? colors.successBg : '#E5FEE9' },
  sequenceText: { fontSize: 14, fontWeight: 'bold' },
  sequencePendingText: { color: colors.primary },
  sequenceVisitedText: { color: colors.success },
  itemTextContainer: { flex: 1, paddingRight: 16 },
  itemName: { fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 4 },
  itemDescription: { fontSize: 15, color: colors.textSecondary },
  iconContainer: { justifyContent: 'center', alignItems: 'center', width: 32 },
  divider: { position: 'absolute', bottom: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  
  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, height: '85%' },
  closeButton: { alignSelf: 'flex-end', padding: 8 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
  carouselContainer: { flexDirection: 'row', marginBottom: 20, maxHeight: 220 },
  imagePlaceholder: { width: 320, height: 220, borderRadius: 12, marginRight: 12 },
  modalDescriptionContainer: { flex: 1, marginBottom: 24 },
  modalDescription: { fontSize: 16, color: colors.textSecondary, lineHeight: 24 },
  modalButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    height: 52,
  },
  routeButton: {
    backgroundColor: colors.primary,
  },
  wikilocButton: {
    backgroundColor: colors.success,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  }
});
