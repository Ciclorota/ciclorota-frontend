import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';

import { useTheme } from '../contexts/ThemeContext';
import { useAppAlert } from '../components/AppAlertModal';
import { getCurrentUserId } from '../services/auth';
import { addPendingCheckin } from '../storage/checkins';

export function CameraScreen({ navigation }: any) {
  const { colors, isDarkMode } = useTheme();
  const { showAlert, alertModal } = useAppAlert();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loadingGPS, setLoadingGPS] = useState(false);

  const styles = getStyles(colors, isDarkMode);

  useEffect(() => {
    (async () => {
      try {
        await Location.requestForegroundPermissionsAsync();
      } catch (err) {
        console.warn('Erro ao solicitar permissão de localização:', err);
      }
    })();
  }, []);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Permissão de Câmera</Text>
          <Text style={styles.permissionText}>
            O Passaporte da Ciclorota precisa de acesso à sua câmera para escanear os pontos da trilha.
          </Text>
          <TouchableOpacity style={styles.iosButton} onPress={requestPermission}>
            <Text style={styles.iosButtonText}>Permitir Acesso</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iosButtonSecondary} onPress={() => navigation.goBack()}>
            <Text style={styles.iosButtonSecondaryText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);
    setLoadingGPS(true);
    
    let lat: number | null = null;
    let lon: number | null = null;

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = location.coords.latitude;
        lon = location.coords.longitude;
      }
    } catch (locationError) {
      console.warn('Não foi possível obter a geolocalização do aparelho:', locationError);
    }

    try {
      const userId = await getCurrentUserId();

      await addPendingCheckin({
        checkpoint_id: data, 
        scanned_at: new Date().toISOString(),
        user_id: userId ?? undefined,
        latitude_scanned: lat,
        longitude_scanned: lon,
      });

      setLoadingGPS(false);

      showAlert({
        title: 'Ponto Registrado! 📍',
        message: lat && lon 
          ? 'Seu check-in e sua localização GPS foram salvos offline com sucesso!' 
          : 'Seu check-in foi salvo, mas não conseguimos obter o GPS local. Ele será validado ao sincronizar.',
        variant: 'success',
        onConfirm: () => navigation.goBack(),
      });

    } catch (error) {
      setLoadingGPS(false);
      showAlert({
        title: 'Erro',
        message: 'Não foi possível salvar o check-in.',
        variant: 'error',
      });
      setScanned(false);
    }
  };

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      
      <View style={styles.overlay}>
        <View style={styles.scanArea} />
        <Text style={styles.scanText}>Aponte para o QR Code do Ponto</Text>
      </View>

      <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelButtonText}>Cancelar</Text>
      </TouchableOpacity>

      {loadingGPS && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingGPSText}>Obtendo localização GPS...</Text>
        </View>
      )}

      {alertModal}
    </View>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', backgroundColor: colors.background, padding: 20 },
  permissionCard: {
    backgroundColor: colors.card, padding: 30, borderRadius: 14,
    shadowColor: colors.text, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, alignItems: 'center'
  },
  permissionTitle: { fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: 10 },
  permissionText: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  iosButton: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, width: '100%', alignItems: 'center', marginBottom: 12 },
  iosButtonText: { color: colors.white, fontSize: 17, fontWeight: '600' },
  iosButtonSecondary: { backgroundColor: colors.borderLight, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, width: '100%', alignItems: 'center' },
  iosButtonSecondaryText: { color: colors.primary, fontSize: 17, fontWeight: '600' },

  cameraContainer: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  scanArea: { width: 250, height: 250, borderWidth: 2, borderColor: colors.primary, borderRadius: 20, backgroundColor: 'transparent', marginBottom: 30 },
  scanText: { color: '#FFF', fontSize: 17, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, overflow: 'hidden' },
  cancelButton: { position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: colors.card, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 30 },
  cancelButtonText: { color: colors.primary, fontSize: 17, fontWeight: '600' },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingGPSText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
  }
});
