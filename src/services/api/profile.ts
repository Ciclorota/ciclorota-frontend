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

export async function uploadCurrentUserAvatar(localUri: string, mimeType: string) {
  const form = new FormData();
  // React Native FormData aceita { uri, name, type } como "blob" para upload.
  form.append('file', {
    uri: localUri,
    name: `avatar.${mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg'}`,
    type: mimeType,
  } as any);

  return apiRequest<ProfileUpdateResponse>('/me/profile/avatar', {
    method: 'POST',
    body: form as any,
  });
}
