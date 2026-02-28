import AsyncStorage from '@react-native-async-storage/async-storage';

const GLOBAL_SNAPSHOT_KEY = '@ciclorota_global_snapshot_v1';

export interface UserOfflineSnapshot {
  profile?: any;
  checkpoints?: any[];
  progressHistory?: any[];
  savedAt?: string;
}

type SnapshotMap = Record<string, UserOfflineSnapshot>;

async function readSnapshotMap(): Promise<SnapshotMap> {
  try {
    const raw = await AsyncStorage.getItem(GLOBAL_SNAPSHOT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function getUserOfflineSnapshot(userId: string): Promise<UserOfflineSnapshot | null> {
  if (!userId) return null;
  const map = await readSnapshotMap();
  return map[userId] || null;
}

export async function updateUserOfflineSnapshot(
  userId: string,
  patch: Partial<UserOfflineSnapshot>
): Promise<UserOfflineSnapshot | null> {
  if (!userId) return null;

  const map = await readSnapshotMap();
  const current = map[userId] || {};
  const next: UserOfflineSnapshot = {
    ...current,
    ...patch,
    savedAt: new Date().toISOString(),
  };

  map[userId] = next;
  await AsyncStorage.setItem(GLOBAL_SNAPSHOT_KEY, JSON.stringify(map));
  return next;
}
