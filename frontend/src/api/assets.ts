import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from './client';
import type {
  AssetListItem,
  AssetDetail,
  PaginatedResponse,
  FilterOptions,
} from '../types';

export function useAssets(params: Record<string, string>) {
  return useQuery<PaginatedResponse<AssetListItem>>({
    queryKey: ['assets', params],
    queryFn: async () => {
      const { data } = await client.get('/assets/', { params });
      return data;
    },
  });
}

export function useAsset(id: string) {
  return useQuery<AssetDetail>({
    queryKey: ['asset', id],
    queryFn: async () => {
      const { data } = await client.get(`/assets/${id}/`);
      return data;
    },
    enabled: !!id,
  });
}

export function useFilterOptions() {
  return useQuery<FilterOptions>({
    queryKey: ['filterOptions'],
    queryFn: async () => {
      const { data } = await client.get('/assets/filter_options/');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await client.post('/assets/', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useUpdateAsset(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await client.patch(`/assets/${id}/`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['asset', id] });
    },
  });
}

export function useDecommissionAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await client.post(`/assets/${id}/decommission/`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export interface AutocompleteResult {
  id: string;
  asset_id: string;
  name: string;
  aws_service_type: string;
}

export async function searchAssets(q: string): Promise<AutocompleteResult[]> {
  if (q.length < 2) return [];
  const { data } = await client.get('/assets/autocomplete/', { params: { q } });
  return data;
}

export interface RelationshipData {
  id: number;
  source_asset: string;
  target_asset: string;
  relationship_type: string;
  description: string;
  source_asset_id_display: string;
  source_asset_name: string;
  target_asset_id_display: string;
  target_asset_name: string;
}

export function useCreateRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      source_asset: string;
      target_asset: string;
      relationship_type: string;
      description?: string;
    }) => {
      const { data } = await client.post('/relationships/', payload);
      return data as RelationshipData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset'] });
    },
  });
}

export function useDeleteRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await client.delete(`/relationships/${id}/`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset'] });
    },
  });
}

export function useBulkAddDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      asset_ids: string[];
      target_asset: string;
      relationship_type: string;
    }) => {
      const { data } = await client.post('/assets/bulk_add_dependency/', payload);
      return data as { detail: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['asset'] });
    },
  });
}

export function useBulkUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      asset_ids: string[];
      owner?: string;
      criticality?: string;
      data_classification?: string;
    }) => {
      const { data } = await client.post('/assets/bulk_update/', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}
