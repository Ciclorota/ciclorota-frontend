import { useCallback, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';

import { fetchAuthMe } from '../services/api/auth';
import { getUserOfflineSnapshot } from '../services/offlineCache';

// O "gate" decide se o usuário autenticado pode entrar na MainTabs ou se
// precisa preencher o nome completo primeiro. Idle/loading durante a
// avaliação; needs_name quando não há nome; ready quando OK; error
// quando não conseguimos descobrir (sem conexão e sem snapshot).
export type ProfileGateStatus = 'idle' | 'loading' | 'needs_name' | 'ready' | 'error';

function hasName(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function useProfileGate(session: Session | null) {
  const [status, setStatus] = useState<ProfileGateStatus>('idle');

  const evaluate = useCallback(async () => {
    if (!session?.user?.id) {
      setStatus('idle');
      return;
    }

    setStatus('loading');

    // 1) Tenta /auth/me — é a fonte de verdade.
    try {
      const me = await fetchAuthMe();
      setStatus(hasName(me.profile?.full_name) ? 'ready' : 'needs_name');
      return;
    } catch {
      // segue para fallback offline
    }

    // 2) Fallback: snapshot offline.
    try {
      const snapshot = await getUserOfflineSnapshot(session.user.id);
      if (snapshot?.profile && hasName(snapshot.profile.full_name)) {
        setStatus('ready');
        return;
      }
    } catch {
      // ignora — vai para error
    }

    setStatus('error');
  }, [session?.user?.id]);

  useEffect(() => {
    void evaluate();
  }, [evaluate]);

  return { status, refresh: evaluate };
}
