import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailLogsApi } from '../../api/endpoints/emailLogs';
import DataGrid, { type ColumnDef } from '../../components/ui/DataGrid';
import { useDataGridParams, toQueryParams } from '../../hooks/useDataGridParams';
import type { EmailLogItem } from '../../types/emailLog';
import { EmailStatus } from '../../types/emailLog';
import { EMAIL_STATUS_LABELS, EMAIL_STATUS_COLORS } from '../../utils/constants';

function EmailStatusBadge({ status }: { status: EmailLogItem['status'] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${EMAIL_STATUS_COLORS[status]}`}
    >
      {EMAIL_STATUS_LABELS[status]}
    </span>
  );
}

export default function EmailLogListPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useDataGridParams();

  const { data, isLoading } = useQuery({
    queryKey: ['email-logs', params],
    queryFn: () => emailLogsApi.getAll(toQueryParams(params)).then((r) => r.data),
    refetchInterval: 10000,
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => emailLogsApi.retry(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email-logs'] }),
  });

  const columns: ColumnDef<EmailLogItem>[] = [
    {
      key: 'toEmail',
      header: 'To',
      sortable: true,
      filterable: true,
      width: '180px',
    },
    {
      key: 'subject',
      header: 'Subject',
      sortable: true,
      filterable: true,
    },
    {
      key: 'templateName',
      header: 'Template',
      sortable: true,
      filterable: true,
      width: '150px',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '100px',
      render: (row) => <EmailStatusBadge status={row.status} />,
    },
    {
      key: 'retryCount',
      header: 'Retries',
      sortable: true,
      width: '80px',
      render: (row) => (
        <span className={row.retryCount > 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}>
          {row.retryCount}/{row.maxRetries}
        </span>
      ),
    },
    {
      key: 'sentAt',
      header: 'Sent At',
      sortable: true,
      width: '140px',
      render: (row) =>
        row.sentAt ? new Date(row.sentAt).toLocaleString() : <span className="text-gray-400">-</span>,
    },
    {
      key: 'errorMessage',
      header: 'Error',
      width: '200px',
      render: (row) =>
        row.errorMessage ? (
          <span className="text-red-600 text-xs truncate block max-w-[200px]" title={row.errorMessage}>
            {row.errorMessage}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: 'createdDate',
      header: 'Date',
      sortable: true,
      width: '140px',
      render: (row) => new Date(row.createdDate).toLocaleString(),
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (row) =>
        row.status === EmailStatus.Failed ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              retryMutation.mutate(row.id);
            }}
            disabled={retryMutation.isPending}
            className="rounded bg-orange-500 px-2 py-1 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
          >
            Retry
          </button>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Email Logs</h1>
        <div className="flex gap-3 text-sm">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />
            Pending: {data?.items.filter((e) => e.status === EmailStatus.Pending).length ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
            Sent: {data?.items.filter((e) => e.status === EmailStatus.Sent).length ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
            Failed: {data?.items.filter((e) => e.status === EmailStatus.Failed).length ?? 0}
          </span>
        </div>
      </div>

      <DataGrid
        data={data}
        columns={columns}
        isLoading={isLoading}
        params={params}
        onParamsChange={setParams}
        rowKey={(row) => row.id}
      />
    </div>
  );
}
