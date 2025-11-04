import { create } from 'zustand';

interface User {
    id: string;
    email: string;
    name: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  login: (user: User) => void;
  logout: () => void;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),

  login: (user) => {
    // Store user data locally (session cookie handled by backend)
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('user');
    set({ user: null });
  },

  initAuth: () => {
    try {
      // Check if user data exists in localStorage
      const userStr = localStorage.getItem('user');
      
      if (userStr) {
        const user = JSON.parse(userStr);
        set({ user, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to init auth:', error);
      set({ isLoading: false });
    }
  },
}));