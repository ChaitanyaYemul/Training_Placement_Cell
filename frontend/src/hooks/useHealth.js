import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '../api/healthApi.js';
import { queryKeys } from '../api/queryKeys.js';
export function useHealth() {
  return useQuery({ queryKey: queryKeys.health(), queryFn: fetchHealth });
}
