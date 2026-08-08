import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Me, Project } from './types';

export function useMe() {
  return useQuery<Me>({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/users/me')).data,
    retry: false,
  });
}

export function useMyProjects() {
  return useQuery<Project[]>({
    queryKey: ['my-projects'],
    queryFn: async () => (await api.get('/projects/mine')).data,
  });
}
