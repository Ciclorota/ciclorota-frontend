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

  const payload = pendingCheckins.map(({ checkpoint_id, scanned_at }) => ({
    checkpoint_id,
    scanned_at,
  }));

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
    if (error instanceof ApiError && error.status === 409) {
      await clearPendingCheckins(userId);

      return {
        status: 'conflict',
        syncedCount: payload.length,
      };
    }

    if (error instanceof ApiError && error.status === 400) {
      await clearPendingCheckins(userId);

      return {
        status: 'discarded',
        syncedCount: payload.length,
      };
    }

    throw error;
  }
}

export function issueCertificate() {
  return apiRequest<IssueCertificateResponse>('/me/certificates', {
    method: 'POST',
  });
}
