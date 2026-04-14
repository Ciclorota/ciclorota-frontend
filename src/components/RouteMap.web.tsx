import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';

import { RouteCheckpoint } from '../types/passport';

type RouteMapProps = {
  colors: any;
  routeData: RouteCheckpoint[];
};

export function RouteMap({ colors, routeData }: RouteMapProps) {
  const visitedCount = routeData.filter((point) => point.isVisited).length;

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.primaryBg }]}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: colors.card, borderColor: colors.borderLight },
        ]}
      >
        <Ionicons name="map-outline" size={26} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>
        Visualização de mapa no navegador
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {visitedCount} de {routeData.length} checkpoints carregados. A lista
        abaixo continua disponível para abrir a rota de cada ponto.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
