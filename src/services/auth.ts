import { Session } from '@supabase/supabase-js';

import { AppRole } from '../types/passport';
import { supabase } from './supabase';

function normalizeRole(value: unknown): AppRole {
  if (value === 'admin' || value === 'superadmin' || value === 'user') {
    return value;
  }

  return 'user';
}

export async function getCurrentSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.user?.id ?? null;
}

export function getSessionUserRole(session: Session | null): AppRole {
  return normalizeRole(
    session?.user?.app_metadata?.role ?? session?.user?.user_metadata?.role,
  );
}

export async function signOut() {
  return supabase.auth.signOut();
}
