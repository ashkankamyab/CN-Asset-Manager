import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from './client';
import type { AdminUser, SiteSettings } from '../types';

// ── Users ──

export function useAdminUsers() {
  return useQuery<AdminUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => client.get('/admin/users/').then((r) => r.data),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      username: string;
      email: string;
      password: string;
      role: string;
      is_active?: boolean;
    }) => client.post('/admin/users/', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      client.patch(`/admin/users/${id}/`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => client.delete(`/admin/users/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

// ── Site Settings ──

export function useSiteSettings() {
  return useQuery<SiteSettings>({
    queryKey: ['admin', 'settings'],
    queryFn: () => client.get('/admin/settings/').then((r) => r.data),
  });
}

export function useUpdateSiteSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SiteSettings>) =>
      client.patch('/admin/settings/', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
  });
}

export function useTestEmail() {
  return useMutation<{ detail: string }, unknown, string>({
    mutationFn: (to: string) =>
      client.post('/admin/settings/test-email/', { to }).then((r) => r.data),
  });
}
