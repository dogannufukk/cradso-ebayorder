import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import LoadingSpinner from './LoadingSpinner';

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'select';
  filterOptions?: { value: string; label: string }[];
  render?: (row: T) => ReactNode;
  width?: string;
}

export interface DataGridParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  filters: Record<string, string>;
}

interface PaginatedData<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

interface DataGridProps<T> {
  data: PaginatedData<T> | undefined;
  columns: ColumnDef<T>[];
  isLoading: boolean;
  params: DataGridParams;
  onParamsChange: (params: DataGridParams) => void;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  pageSize?: number;
}

export default function DataGrid<T>({
  data,
  columns,
  isLoading,
  params,
  onParamsChange,
  rowKey,
  onRowClick,
}: DataGridProps<T>) {
  const [filterValues, setFilterValues] = useState<Record<string, string>>(params.filters);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Sync filter values when params.filters changes externally
  useEffect(() => {
    setFilterValues(params.filters);
  }, [params.filters]);

  const handleSort = useCallback(
    (key: string) => {
      const isSameColumn = params.sortBy === key;
      const newDirection = isSameColumn && params.sortDirection === 'desc' ? 'asc' : 'desc';
      onParamsChange({
        ...params,
        page: 1,
        sortBy: key,
        sortDirection: newDirection,
      });
    },
    [params, onParamsChange]
  );

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      setFilterValues((prev) => ({ ...prev, [key]: value }));

      // Debounce
      if (debounceTimers.current[key]) {
        clearTimeout(debounceTimers.current[key]);
      }
      debounceTimers.current[key] = setTimeout(() => {
        onParamsChange({
          ...params,
          page: 1,
          filters: { ...params.filters, [key]: value },
        });
      }, 400);
    },
    [params, onParamsChange]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      onParamsChange({ ...params, page: newPage });
    },
    [params, onParamsChange]
  );

  const getSortIcon = (key: string) => {
    if (params.sortBy !== key) return <span className="ml-1 text-gray-300">&#8597;</span>;
    return params.sortDirection === 'asc' ? (
      <span className="ml-1 text-blue-600">&#8593;</span>
    ) : (
      <span className="ml-1 text-blue-600">&#8595;</span>
    );
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {/* Header row */}
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 ${
                    col.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''
                  }`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <div className="flex items-center">
                    {col.header}
                    {col.sortable && getSortIcon(col.key)}
                  </div>
                </th>
              ))}
            </tr>
            {/* Filter row */}
            {columns.some((c) => c.filterable) && (
              <tr className="bg-gray-50/50">
                {columns.map((col) => (
                  <th key={`filter-${col.key}`} className="px-4 py-2">
                    {col.filterable ? (
                      col.filterType === 'select' && col.filterOptions ? (
                        <select
                          className="w-full rounded border border-gray-300 px-2 py-1 text-xs font-normal focus:border-blue-500 focus:outline-none bg-white"
                          value={filterValues[col.key] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFilterValues((prev) => ({ ...prev, [col.key]: val }));
                            onParamsChange({
                              ...params,
                              page: 1,
                              filters: { ...params.filters, [col.key]: val },
                            });
                          }}
                        >
                          <option value="">All</option>
                          {col.filterOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder={`Filter...`}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-xs font-normal focus:border-blue-500 focus:outline-none"
                          value={filterValues[col.key] || ''}
                          onChange={(e) => handleFilterChange(col.key, e.target.value)}
                        />
                      )
                    ) : (
                      <div />
                    )}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12">
                  <LoadingSpinner />
                </td>
              </tr>
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-gray-500">
                  No records found.
                </td>
              </tr>
            ) : (
              data?.items.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sm">
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{data.totalCount} records | Page {data.pageNumber} of {data.totalPages || 1}</span>
            <select
              className="rounded border border-gray-300 px-2 py-1 text-xs bg-white focus:border-blue-500 focus:outline-none"
              value={params.pageSize}
              onChange={(e) => onParamsChange({ ...params, page: 1, pageSize: Number(e.target.value) })}
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>{size} / page</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(1)}
              disabled={!data.hasPreviousPage}
              className="rounded border px-2 py-1 text-xs disabled:opacity-40 hover:bg-gray-50"
            >
              &laquo;
            </button>
            <button
              onClick={() => handlePageChange(data.pageNumber - 1)}
              disabled={!data.hasPreviousPage}
              className="rounded border px-2 py-1 text-xs disabled:opacity-40 hover:bg-gray-50"
            >
              &lsaquo;
            </button>
            {getPageNumbers(data.pageNumber, data.totalPages).map((p) =>
              p === '...' ? (
                <span key={`ellipsis-${p}`} className="px-1 text-xs text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => handlePageChange(p as number)}
                  className={`rounded border px-2 py-1 text-xs ${
                    p === data.pageNumber
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => handlePageChange(data.pageNumber + 1)}
              disabled={!data.hasNextPage}
              className="rounded border px-2 py-1 text-xs disabled:opacity-40 hover:bg-gray-50"
            >
              &rsaquo;
            </button>
            <button
              onClick={() => handlePageChange(data.totalPages)}
              disabled={!data.hasNextPage}
              className="rounded border px-2 py-1 text-xs disabled:opacity-40 hover:bg-gray-50"
            >
              &raquo;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | string)[] = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('...');
  if (total > 1) pages.push(total);
  return pages;
}
