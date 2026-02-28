import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

type AlertVariant = 'success' | 'error' | 'warning' | 'info';

type AlertAction = (() => void | Promise<void>) | undefined;

export interface AppAlertOptions {
  title: string;
  message: string;
  variant?: AlertVariant;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: AlertAction;
  onCancel?: AlertAction;
}

interface AppAlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  variant?: AlertVariant;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function AppAlertModal({
  visible,
  title,
  message,
  variant = 'info',
  confirmText = 'OK',
  cancelText,
  onConfirm,
  onCancel,
}: AppAlertModalProps) {
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);

  const iconMap = {
    success: { name: 'checkmark', color: colors.success, bg: colors.successBg },
    error: { name: 'close', color: colors.danger, bg: colors.dangerBg },
    warning: { name: 'warning', color: colors.warning, bg: colors.secondaryBg },
    info: { name: 'information', color: colors.primary, bg: colors.primaryBg },
  } as const;

  const iconConfig = iconMap[variant];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlayContainer}>
        <BlurView
          style={StyleSheet.absoluteFillObject}
          intensity={Platform.OS === 'ios' ? 35 : 50}
          tint={isDarkMode ? 'dark' : 'light'}
          experimentalBlurMethod="dimezisBlurView"
        />
        <View style={styles.backdrop} />

        <View style={styles.modalCard}>
          <View style={[styles.iconWrapper, { backgroundColor: iconConfig.bg }]}> 
            <Ionicons name={iconConfig.name} size={38} color={iconConfig.color} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {cancelText ? (
            <View style={styles.doubleButtonRow}>
              <TouchableOpacity style={[styles.button, styles.buttonHalf, styles.cancelButton]} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.buttonHalf, styles.confirmButton]} onPress={onConfirm}>
                <Text style={styles.confirmButtonText}>{confirmText}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.button, styles.confirmButton, styles.singleButton]} onPress={onConfirm}>
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

export function useAppAlert() {
  const [state, setState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant: AlertVariant;
    confirmText: string;
    cancelText?: string;
    onConfirm?: AlertAction;
    onCancel?: AlertAction;
  }>({
    visible: false,
    title: '',
    message: '',
    variant: 'info',
    confirmText: 'OK',
  });

  const showAlert = (options: AppAlertOptions) => {
    setState({
      visible: true,
      title: options.title,
      message: options.message,
      variant: options.variant || 'info',
      confirmText: options.confirmText || 'OK',
      cancelText: options.cancelText,
      onConfirm: options.onConfirm,
      onCancel: options.onCancel,
    });
  };

  const closeAlert = () => {
    setState((prev) => ({ ...prev, visible: false }));
  };

  const handleConfirm = async () => {
    const confirmAction = state.onConfirm;
    closeAlert();
    if (confirmAction) await confirmAction();
  };

  const handleCancel = async () => {
    const cancelAction = state.onCancel;
    closeAlert();
    if (cancelAction) await cancelAction();
  };

  const alertModal = (
    <AppAlertModal
      visible={state.visible}
      title={state.title}
      message={state.message}
      variant={state.variant}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { showAlert, closeAlert, alertModal };
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  overlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    opacity: isDarkMode ? 0.45 : 0.35,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  doubleButtonRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    minHeight: 50,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonHalf: {
    flex: 1,
  },
  singleButton: {
    width: '100%',
    flex: 0,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  cancelButton: {
    backgroundColor: colors.secondaryBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
});