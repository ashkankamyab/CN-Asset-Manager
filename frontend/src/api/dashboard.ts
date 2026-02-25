import { useQuery } from '@tanstack/react-query';
import client from './client';
import type { DashboardData } from '../types';

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await client.get('/dashboard/');
      return data;
    },
  });
}
