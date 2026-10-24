import { useResourceMutation } from './useResource.js';
export function useApplicationMutation() {
  return useResourceMutation([
    '/applications',
    '/admin/applications',
    '/placement-drives',
  ]);
}
