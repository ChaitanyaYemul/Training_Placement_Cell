import { useSearchParams } from 'react-router-dom';
export function useListFilters(defaultSort = '-createdAt') {
  const [search, setSearch] = useSearchParams();
  const params = {
    page: Math.max(1, Number(search.get('page')) || 1),
    limit: 10,
    sort: search.get('sort') || defaultSort,
  };
  for (const key of ['q', 'status', 'isActive', 'companyId', 'branchId'])
    if (search.get(key)) params[key] = search.get(key);
  function update(key, value) {
    setSearch((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    });
  }
  return { params, update };
}
