  import { create } from 'zustand';

  interface User {
      id: string;
      email: string;
      name: string;
      google_id?: string | null | undefined;
  }

  interface AuthState {
    user: User | null;
    isLoading: boolean;
    setUser: (user: User | null) => void;
    setLoading: (isLoading: boolean) => void;
    login: (user: User) => void;
    logout: () => void;
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
  }));