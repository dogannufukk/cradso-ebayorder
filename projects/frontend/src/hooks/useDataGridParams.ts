import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { DataGridParams } from '../components/ui/DataGrid';

export function useDataGridParams(
  defaultSortBy = 'createdDate',
  defaultSortDirection: 'asc' | 'desc' = 'desc',
  defaultPageSize = 20
): [DataGridParams, (params: DataGridParams) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useMemo<DataGridParams>(() => {
    const filters: Record<string, string> = {};
    // Extract filter params (anything that's not a grid control param)
    const controlKeys = new Set(['page', 'pageSize', 'sortBy', 'sortDirection']);
    searchParams.forEach((value, key) => {
      if (!controlKeys.has(key) && value) {
        filters[key] = value;
      }
    });

    return {
      page: Number(searchParams.get('page')) || 1,
      pageSize: Number(searchParams.get('pageSize')) || defaultPageSize,
      sortBy: searchParams.get('sortBy') || defaultSortBy,
      sortDirection: (searchParams.get('sortDirection') as 'asc' | 'desc') || defaultSortDirection,
      filters,
    };
  }, [searchParams, defaultSortBy, defaultSortDirection, defaultPageSize]);

  const handleChange = useCallback(
    (newParams: DataGridParams) => {
      const newSearchParams = new URLSearchParams();

      // Only set non-default values to keep URL clean
      if (newParams.page > 1) newSearchParams.set('page', String(newParams.page));
      if (newParams.pageSize !== defaultPageSize) newSearchParams.set('pageSize', String(newParams.pageSize));
      if (newParams.sortBy && newParams.sortBy !== defaultSortBy) newSearchParams.set('sortBy', newParams.sortBy);
      if (newParams.sortDirection && newParams.sortDirection !== defaultSortDirection) newSearchParams.set('sortDirection', newParams.sortDirection);

      // Add filters
      for (const [key, value] of Object.entries(newParams.filters)) {
        if (value) newSearchParams.set(key, value);
      }

      setSearchParams(newSearchParams, { replace: true });
    },
    [setSearchParams, defaultSortBy, defaultSortDirection, defaultPageSize]
  );

  return [params, handleChange];
}

/** Convert DataGridParams to flat query params for API calls */
export function toQueryParams(params: DataGridParams): Record<string, string | number | undefined> {
  const q: Record<string, string | number | undefined> = {
    page: params.page,
    pageSize: params.pageSize,
    sortBy: params.sortBy,
    sortDirection: params.sortDirection,
  };
  for (const [key, value] of Object.entries(params.filters)) {
    if (value) q[key] = value;
  }
  return q;
}
