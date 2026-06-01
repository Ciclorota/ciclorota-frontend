import {
  clearPendingCheckins,
  getPendingCheckins,
} from '../../storage/checkins';
import {
  Checkpoint,
  IssueCertificateResponse,
  SyncCheckinsResult,
} from '../../types/passport';
import { apiRequest, ApiError } from './client';

export function fetchCheckpoints() {
  return apiRequest<Checkpoint[]>('/checkpoints', { auth: false });
}

export async function syncPendingCheckins(
  userId: string,
): Promise<SyncCheckinsResult> {
  const pendingCheckins = await getPendingCheckins(userId);

  if (pendingCheckins.length === 0) {
    return { status: 'idle', syncedCount: 0 };
  }

  const payload = pendingCheckins.map(
    ({
      checkpoint_id,
      scanned_at,
      latitude_scanned,
      longitude_scanned,
    }) => ({
      checkpoint_id,
      scanned_at,
      latitude_scanned,
      longitude_scanned,
    }),
  );

  try {
    await apiRequest('/checkins', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    await clearPendingCheckins(userId);

    return {
      status: 'success',
      syncedCount: payload.length,
    };
  } catch (error) {
    // Regra: qualquer resposta 4xx do servidor é definitiva (QR inválido,
    // geofence, duplicidade, etc.) — limpamos a fila local. Só 5xx ou
    // falhas de rede (sem internet) mantêm a fila para tentar de novo.
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
      await clearPendingCheckins(userId);

      if (error.status === 409) {
        return {
          status: 'conflict',
          syncedCount: payload.length,
        };
      }

      const message = (error.message || '').toLowerCase();
      const isGeofence =
        message.includes('localiza') || message.includes('longe') || message.includes('limite permitido');

      return {
        status: isGeofence ? 'rejected' : 'discarded',
        syncedCount: payload.length,
        reason: error.message,
      };
    }

    // Sem internet ou 5xx — fila continua pendente para retry futuro.
    throw error;
  }
}

export function issueCertificate() {
  return apiRequest<IssueCertificateResponse>('/me/certificates', {
    method: 'POST',
  });
}
