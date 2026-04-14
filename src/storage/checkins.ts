import AsyncStorage from '@react-native-async-storage/async-storage';

import { PendingCheckin } from '../types/passport';

const STORAGE_KEY = '@ciclorota_checkins';

function belongsToUser(checkin: PendingCheckin, userId: string) {
  return checkin.user_id === userId || checkin.user_id === undefined;
}

async function readPendingCheckins(): Promise<PendingCheckin[]> {
  const rawValue = await AsyncStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

async function writePendingCheckins(checkins: PendingCheckin[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(checkins));
}

export async function getPendingCheckins(
  userId?: string,
): Promise<PendingCheckin[]> {
  const pendingCheckins = await readPendingCheckins();

  if (!userId) {
    return pendingCheckins;
  }

  return pendingCheckins.filter((checkin) => belongsToUser(checkin, userId));
}

export async function getPendingCheckinsCount(
  userId?: string,
): Promise<number> {
  const pendingCheckins = await getPendingCheckins(userId);
  return pendingCheckins.length;
}

export async function addPendingCheckin(
  checkin: PendingCheckin,
): Promise<void> {
  const currentCheckins = await readPendingCheckins();
  currentCheckins.push(checkin);
  await writePendingCheckins(currentCheckins);
}

export async function clearPendingCheckins(userId?: string): Promise<void> {
  if (!userId) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }

  const currentCheckins = await readPendingCheckins();
  const remainingCheckins = currentCheckins.filter(
    (checkin) => !belongsToUser(checkin, userId),
  );

  if (remainingCheckins.length === 0) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }

  await writePendingCheckins(remainingCheckins);
}
