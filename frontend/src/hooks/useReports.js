import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { exportReport } from '../api/reportsApi.js';
import { downloadCsv } from '../utils/downloadCsv.js';
import { useResource } from './useResource.js';
import { reportViews } from '../services/reportViews.js';

export function useReportFilters() {
  const [search, setSearch] = useSearchParams();
  const filters = {};
  for (const key of ['from', 'to', 'driveId', 'companyId', 'branchId']) {
    if (search.get(key)) filters[key] = search.get(key);
  }
  const report = Object.hasOwn(reportViews, search.get('report'))
    ? search.get('report')
    : 'drives';
  const page = Math.max(1, Number(search.get('page')) || 1);
  function update(key, value) {
    setSearch((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      if (key === 'companyId') next.delete('driveId');
      return next;
    });
  }
  return { filters, report, page, update, reset: () => setSearch({ report }) };
}

export function useReport(report, filters) {
  return useResource(`/admin/reports/${report}`, filters, {
    refetchInterval: 45_000,
    refetchIntervalInBackground: false,
  });
}

export function useReportExport(report, filters) {
  return useMutation({
    mutationFn: () => exportReport(report, filters),
    retry: false,
    onSuccess: (content) => downloadCsv(content, `placement-${report}.csv`),
  });
}
