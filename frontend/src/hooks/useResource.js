import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readResource, writeResource } from '../api/resourceApi.js';
import { queryKeys } from '../api/queryKeys.js';
export function useResource(path, params, options = {}) {
  return useQuery({
    queryKey: queryKeys.list(path, params),
    queryFn: ({ signal }) => readResource(path, params, signal),
    enabled: Boolean(path),
    ...options,
  });
}
export function useResourceMutation(paths = []) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: writeResource,
    onSuccess: async (_, variables) => {
      const reportSources = [
        '/companies',
        '/job-postings',
        '/placement-drives',
        '/applications',
        '/admin/applications',
        '/students/me',
      ];
      const reportsChanged = reportSources.some(
        (path) =>
          variables.path === path || variables.path.startsWith(`${path}/`),
      );
      const invalidatedPaths = reportsChanged
        ? [...paths, '/admin/reports']
        : paths;
      await client.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'resource' &&
          invalidatedPaths.some(
            (path) =>
              query.queryKey[1] === path ||
              query.queryKey[1]?.startsWith(`${path}/`),
          ),
      });
    },
  });
}
