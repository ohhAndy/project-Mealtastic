import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export function useRequireAuth() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  return { user, isLoading };
}

export function useRedirectIfAuthenticated(redirectTo: string = '/recipes') {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && user) {
      router.push(redirectTo);
    }
  }, [user, isLoading, router, redirectTo]);

  return { user, isLoading };
}

export function useAuth() {
  return useAuthStore();
}