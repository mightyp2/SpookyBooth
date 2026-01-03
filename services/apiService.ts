
import { SavedPhoto, User } from '../types';

// Prefer explicit env, otherwise use same-origin to avoid mixed-content/ad-block issues
const API_URL =
  (import.meta as any).env?.VITE_API_URL ||
  `${typeof window !== 'undefined' ? window.location.origin : ''}/api.php`;

export const apiService = {
  async register(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`${API_URL}?action=register`, {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    return res.json();
  },

  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const res = await fetch(`${API_URL}?action=login`, {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    return res.json();
  },

  async savePhoto(photo: SavedPhoto, userId: number): Promise<boolean> {
    const res = await fetch(`${API_URL}?action=save_photo`, {
      method: 'POST',
      body: JSON.stringify({ ...photo, user_id: userId })
    });
    const data = await res.json();
    return data.success;
  },

  async getPhotos(userId: number): Promise<SavedPhoto[]> {
    const res = await fetch(`${API_URL}?action=get_photos&user_id=${userId}`);
    const data = await res.json();
    return data.success ? data.photos : [];
  },

  async deletePhoto(photoId: string, userId: number): Promise<boolean> {
    const res = await fetch(`${API_URL}?action=delete_photo`, {
      method: 'POST',
      body: JSON.stringify({ id: photoId, user_id: userId })
    });
    const data = await res.json();
    return data.success;
  }
};
