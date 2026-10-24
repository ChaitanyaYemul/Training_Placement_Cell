import { useMutation } from '@tanstack/react-query';
import { register } from '../api/authApi.js';
export function useRegistration() {
  return useMutation({ mutationFn: register });
}
