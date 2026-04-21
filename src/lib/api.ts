const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787/api';

export interface User {
  id: string;
  email: string;
  name: string;
  profile_color: string;
  created_at: number;
  updated_at: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginAttemptResponse {
  error: string;
  locked?: boolean;
  remainingMinutes?: number;
  remainingAttempts?: number;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw data;
    }

    return data;
  }

  // Auth
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async requestPasswordReset(email: string): Promise<{ message: string; resetToken?: string; resetLink?: string }> {
    return this.request('/auth/request-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  // Profile
  async getProfile(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/profile');
  }

  async updateProfile(data: { name?: string; profile_color?: string }): Promise<{ user: User }> {
    return this.request<{ user: User }>('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return this.request('/profile/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async deleteAccount(): Promise<{ message: string }> {
    return this.request('/profile', {
      method: 'DELETE',
    });
  }

  async getProfileColors(): Promise<{ colors: string[] }> {
    return this.request<{ colors: string[] }>('/profile/colors');
  }

  // Stash Items
  async getItems(): Promise<{ items: any[] }> {
    const response = await this.request<{ items: any[] }>('/items');
    // Transform snake_case to camelCase
    return {
      items: response.items.map(item => ({
        ...item,
        collectionId: item.collection_id,
        deletedAt: item.deleted_at,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }))
    };
  }

  async createItem(item: any): Promise<{ item: any }> {
    // Transform camelCase to snake_case
    const payload = {
      ...item,
      collection_id: item.collectionId,
      deleted_at: item.deletedAt,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
    const response = await this.request<{ item: any }>('/items', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    // Transform response back to camelCase
    return {
      item: {
        ...response.item,
        collectionId: response.item.collection_id,
        deletedAt: response.item.deleted_at,
        createdAt: response.item.created_at,
        updatedAt: response.item.updated_at,
      }
    };
  }

  async updateItem(id: string, updates: any): Promise<{ item: any }> {
    // Transform camelCase to snake_case
    const payload: any = {};
    if (updates.collectionId !== undefined) payload.collection_id = updates.collectionId;
    if (updates.deletedAt !== undefined) payload.deleted_at = updates.deletedAt;
    if (updates.updatedAt !== undefined) payload.updated_at = updates.updatedAt;
    if (updates.createdAt !== undefined) payload.created_at = updates.createdAt;
    
    // Copy other fields as-is
    Object.keys(updates).forEach(key => {
      if (!['collectionId', 'deletedAt', 'updatedAt', 'createdAt'].includes(key)) {
        payload[key] = updates[key];
      }
    });

    const response = await this.request<{ item: any }>(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    // Transform response back to camelCase
    return {
      item: {
        ...response.item,
        collectionId: response.item.collection_id,
        deletedAt: response.item.deleted_at,
        createdAt: response.item.created_at,
        updatedAt: response.item.updated_at,
      }
    };
  }

  async deleteItem(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/items/${id}`, {
      method: 'DELETE',
    });
  }

  // Collections
  async getCollections(): Promise<{ collections: any[] }> {
    const response = await this.request<{ collections: any[] }>('/collections');
    // Transform snake_case to camelCase
    return {
      collections: response.collections.map(col => ({
        ...col,
        createdAt: col.created_at,
      }))
    };
  }

  async createCollection(name: string, emoji?: string): Promise<{ collection: any }> {
    const response = await this.request<{ collection: any }>('/collections', {
      method: 'POST',
      body: JSON.stringify({ name, emoji }),
    });
    return {
      collection: {
        ...response.collection,
        createdAt: response.collection.created_at,
      }
    };
  }

  async updateCollection(id: string, data: { name?: string; emoji?: string }): Promise<{ collection: any }> {
    const response = await this.request<{ collection: any }>(`/collections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return {
      collection: {
        ...response.collection,
        createdAt: response.collection.created_at,
      }
    };
  }

  async deleteCollection(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/collections/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
