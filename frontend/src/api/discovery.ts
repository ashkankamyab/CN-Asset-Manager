import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from './client';
import type { DiscoveryJob, PaginatedResponse } from '../types';

export function useDiscoveryJobs(params?: Record<string, string>) {
  return useQuery<PaginatedResponse<DiscoveryJob>>({
    queryKey: ['discoveryJobs', params],
    queryFn: async () => {
      const { data } = await client.get('/discovery/jobs/', { params });
      return data;
    },
    refetchInterval: (query) => {
      const hasActive = query.state.data?.results.some(
        (j) => j.status === 'PENDING' || j.status === 'RUNNING'
      );
      return hasActive ? 3000 : false;
    },
  });
}

export function useDiscoveryJob(id: string) {
  return useQuery<DiscoveryJob>({
    queryKey: ['discoveryJob', id],
    queryFn: async () => {
      const { data } = await client.get(`/discovery/jobs/${id}/`);
      return data;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'PENDING' || status === 'RUNNING' ? 2000 : false;
    },
  });
}

export function useTriggerDiscovery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (accountId?: string) => {
      const { data } = await client.post('/discovery/trigger/', {
        account_id: accountId || null,
      });
      return data as DiscoveryJob;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discoveryJobs'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
