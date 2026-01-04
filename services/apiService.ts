
import { AdminGalleryPhoto, AdminSnapshot, SavedPhoto, User } from '../types';

// Prefer explicit env, otherwise use same-origin to avoid mixed-content/ad-block issues
const API_URL =
  (import.meta as any).env?.VITE_API_URL ||
  `${typeof window !== 'undefined' ? window.location.origin : ''}/api.php`;

export const apiService = {
  async register(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`${API_URL}?action=register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return res.json();
  },

  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const res = await fetch(`${API_URL}?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data?.success && data.user) {
      data.user = {
        id: Number(data.user.id),
        username: data.user.username,
        isAdmin: Boolean(data.user.isAdmin)
      } as User;
    }
    return data;
  },

  async savePhoto(photo: SavedPhoto, userId: number): Promise<boolean> {
    const res = await fetch(`${API_URL}?action=save_photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: photoId, user_id: userId })
    });
    const data = await res.json();
    return data.success;
  },

  async adminSnapshot(): Promise<{ success: boolean; data?: AdminSnapshot; error?: string }> {
    const res = await fetch(`${API_URL}?action=admin_snapshot`);
    const data = await res.json();
    if (!data?.success) {
      return { success: false, error: data?.error || 'Failed to load admin data' };
    }
    return { success: true, data: normalizeAdminSnapshot(data) };
  },

  async adminDeleteUser(userId: number): Promise<boolean> {
    const res = await fetch(`${API_URL}?action=admin_delete_user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    const data = await res.json();
    return Boolean(data?.success);
  },

  async adminSetRole(userId: number, isAdmin: boolean): Promise<boolean> {
    const res = await fetch(`${API_URL}?action=admin_set_role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, is_admin: isAdmin })
    });
    const data = await res.json();
    return Boolean(data?.success);
  },

  async adminAllPhotos(): Promise<{ success: boolean; photos?: AdminGalleryPhoto[]; error?: string }> {
    const res = await fetch(`${API_URL}?action=admin_all_photos`);
    const data = await res.json();
    if (!data?.success) {
      return { success: false, error: data?.error || 'Failed to load gallery' };
    }
    const photos = Array.isArray(data.photos)
      ? data.photos.map((item: any) => ({
          id: Number(item.id),
          url: item.url,
          timestamp: Number(item.timestamp ?? 0),
          userId: Number(item.user_id ?? 0),
          username: item.username || 'Unknown'
        }))
      : [];
    return { success: true, photos };
  }
};

function normalizeAdminSnapshot(payload: any): AdminSnapshot {
  const rawStats = payload?.stats || {};
  const stats = {
    totalUsers: Number(rawStats.total_users ?? 0),
    totalPhotos: Number(rawStats.total_photos ?? 0),
    photosLast24h: Number(rawStats.photos_last_24h ?? 0),
    activeUsersLast24h: Number(rawStats.active_users_last_24h ?? 0),
    newUsersLast7d: Number(rawStats.new_users_last_7d ?? 0),
    topCreators: Array.isArray(rawStats.top_creators)
      ? rawStats.top_creators.map((item: any) => ({
          username: item?.username || 'Unknown',
          userId: Number(item?.user_id ?? 0),
          photoCount: Number(item?.photo_count ?? 0)
        }))
      : []
  };

  const users = Array.isArray(payload?.users)
    ? payload.users.map((u: any) => ({
        id: Number(u.id),
        username: u.username,
        createdAt: Number(u.created_at ?? 0),
        isAdmin: Boolean(u.is_admin ?? false),
        photoCount: Number(u.photo_count ?? 0),
        lastPhotoAt: u.last_photo_at !== null && u.last_photo_at !== undefined
          ? Number(u.last_photo_at)
          : null
      }))
    : [];

  const recent = Array.isArray(payload?.recent)
    ? payload.recent.map((item: any) => ({
        id: Number(item.id),
        url: item.url,
        timestamp: Number(item.timestamp ?? 0),
        userId: Number(item.user_id ?? 0),
        username: item.username || 'Unknown'
      }))
    : [];

  return { stats, users, recent };
}
