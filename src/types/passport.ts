export type AppRole = 'user' | 'admin' | 'superadmin';
export type EntityId = string;

export interface ProfileStats {
  total_pontos_visitados: number;
  possui_certificado: boolean;
  data_certificado: string | null;
}

export interface UserProfile {
  id: EntityId;
  email?: string | null;
  full_name: string | null;
  avatar_url: string | null;
  estatisticas: ProfileStats;
}

export interface CheckpointImage {
  id: EntityId;
  url: string;
  position: number;
  width: number | null;
  height: number | null;
}

export interface Checkpoint {
  id: EntityId;
  name: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  map: string | null;
  info: string | null;
  images?: CheckpointImage[];
}

export interface RouteCheckpoint extends Checkpoint {
  isVisited: boolean;
}

export interface ProgressCheckpoint {
  id: EntityId;
  name: string;
  description: string | null;
}

export interface ProgressHistoryItem {
  id: EntityId;
  scanned_at: string;
  checkpoints: ProgressCheckpoint;
}

export interface ProgressResponse {
  total_visitados: number;
  historico: ProgressHistoryItem[];
}

export interface PendingCheckin {
  checkpoint_id: string;
  scanned_at: string;
  user_id?: string;
  latitude_scanned?: number | null;
  longitude_scanned?: number | null;
}

export interface UpdateProfileInput {
  full_name: string;
  avatar_url: string | null;
}

export interface ProfileUpdateResponse {
  id: EntityId;
  full_name: string | null;
  avatar_url: string | null;
}

export interface CertificateRecord {
  id: string;
  user_id: string;
  issued_at: string;
}

export interface IssueCertificateResponse {
  mensagem?: string;
  error?: string;
  certificado?: CertificateRecord;
}

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  role: AppRole;
  is_admin: boolean;
}

export interface AuthMeResponse {
  user: AuthenticatedUser;
  profile: UserProfile | null;
}

export interface SyncCheckinsResult {
  status: 'idle' | 'success' | 'conflict' | 'discarded';
  syncedCount: number;
}
