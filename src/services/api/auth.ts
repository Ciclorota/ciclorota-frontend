import { AuthMeResponse } from '../../types/passport';
import { apiRequest } from './client';

export function fetchAuthMe() {
  return apiRequest<AuthMeResponse>('/auth/me');
}
