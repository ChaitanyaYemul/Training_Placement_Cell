export const queryKeys = {
  health: () => ['health'],
  me: () => ['auth', 'me'],
  resource: (path) => ['resource', path],
  list: (path, params) => ['resource', path, params],
};
