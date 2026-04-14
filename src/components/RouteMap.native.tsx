import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { RouteCheckpoint } from '../types/passport';

type RouteMapProps = {
  colors: any;
  routeData: RouteCheckpoint[];
};

export function RouteMap({ colors, routeData }: RouteMapProps) {
  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={styles.map}
      initialRegion={{
        latitude: -23.822679513450304,
        longitude: -46.47649313140532,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      }}
    >
      {routeData.length > 1 && (
        <Polyline
          coordinates={routeData
            .filter((point) => point.latitude != null && point.longitude != null)
            .map((point) => ({
              latitude: Number(point.latitude),
              longitude: Number(point.longitude),
            }))}
          strokeColor={colors.danger}
          strokeWidth={4}
          lineDashPattern={[10, 10]}
        />
      )}

      {routeData.map((point) => {
        if (point.latitude == null || point.longitude == null) {
          return null;
        }

        return (
          <Marker
            key={`${point.id}-${point.isVisited}`}
            coordinate={{
              latitude: Number(point.latitude),
              longitude: Number(point.longitude),
            }}
            title={point.name}
            description={point.isVisited ? '✅ Visitado!' : '🔒 Ponto Pendente'}
            pinColor={point.isVisited ? colors.success : colors.primary}
          />
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
