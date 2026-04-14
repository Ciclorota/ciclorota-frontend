import {
  ProfileUpdateResponse,
  ProgressResponse,
  UpdateProfileInput,
  UserProfile,
} from '../../types/passport';
import { apiRequest } from './client';

export function fetchCurrentUserProfile() {
  return apiRequest<UserProfile>('/me/profile');
}

export function fetchCurrentUserProgress() {
  return apiRequest<ProgressResponse>('/me/progress');
}

export function updateCurrentUserProfile(payload: UpdateProfileInput) {
  return apiRequest<ProfileUpdateResponse>('/me/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
