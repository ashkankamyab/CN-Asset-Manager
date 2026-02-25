import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from './client';
import type { AWSAccount, PaginatedResponse } from '../types';

export function useAccounts() {
  return useQuery<PaginatedResponse<AWSAccount>>({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data } = await client.get('/accounts/');
      return data;
    },
  });
}

export function useAccount(id: string) {
  return useQuery<AWSAccount>({
    queryKey: ['account', id],
    queryFn: async () => {
      const { data } = await client.get(`/accounts/${id}/`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await client.post('/accounts/', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useUpdateAccount(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await client.patch(`/accounts/${id}/`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['account', id] });
    },
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await client.post(`/accounts/${id}/test_connection/`);
      return data as { success: boolean; message: string };
    },
  });
}

export function useRefreshCosts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await client.post('/accounts/refresh_costs/');
      return data as { updated: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
