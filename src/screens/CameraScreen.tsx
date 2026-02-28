import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useAppAlert } from '../components/AppAlertModal';

export function CameraScreen({ navigation }: any) {
  const { colors, isDarkMode } = useTheme();
  const { showAlert, alertModal } = useAppAlert();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const styles = getStyles(colors, isDarkMode);

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
    
    try {
      const existingCheckins = await AsyncStorage.getItem('@ciclorota_checkins');
      let checkinsArray = existingCheckins ? JSON.parse(existingCheckins) : [];

      const newCheckin = {
        checkpoint_id: data, 
        scanned_at: new Date().toISOString(),
      };
      
      checkinsArray.push(newCheckin);

      await AsyncStorage.setItem('@ciclorota_checkins', JSON.stringify(checkinsArray));

      showAlert({
        title: 'Ponto Registrado! 📍',
        message: 'Seu check-in foi salvo no passaporte. Ele será sincronizado quando houver internet.',
        variant: 'success',
        onConfirm: () => navigation.goBack(),
      });

    } catch (error) {
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
  cancelButtonText: { color: colors.primary, fontSize: 17, fontWeight: '600' }
});