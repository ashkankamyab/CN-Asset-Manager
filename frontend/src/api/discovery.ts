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
