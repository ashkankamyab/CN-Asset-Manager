import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from './client';
import type { AuthUser } from '../types';

export function useCurrentUser() {
  return useQuery<AuthUser>({
    queryKey: ['auth', 'me'],
    queryFn: () => client.get('/auth/me/').then((r) => r.data),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { username: string; password: string }) =>
      client.post('/auth/login/', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => client.post('/auth/logout/'),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = '/login';
    },
  });
}

export function useConfig() {
  return useQuery<{ oidc_enabled: boolean }>({
    queryKey: ['auth', 'config'],
    queryFn: () => client.get('/auth/config/').then((r) => r.data),
    staleTime: Infinity,
  });
}

export function useForgotPassword() {
  return useMutation<{ detail: string }, unknown, string>({
    mutationFn: (email: string) =>
      client.post('/auth/forgot-password/', { email }).then((r) => r.data),
  });
}

export function useResetPassword() {
  return useMutation<{ detail: string }, unknown, { uid: string; token: string; password: string }>({
    mutationFn: (data) => client.post('/auth/reset-password/', data).then((r) => r.data),
  });
}
