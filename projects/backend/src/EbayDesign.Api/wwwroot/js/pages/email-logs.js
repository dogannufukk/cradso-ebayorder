$(function () {
    var grid = new DataGrid('#emaillogs-grid', {
        url: '/EmailLog/List',
        rowKey: 'id',
        defaultSortBy: 'createdDate',
        defaultSortDir: 'desc',
        defaultPageSize: 20,
        columns: [
            { key: 'toEmail', header: 'To', sortable: true, filterable: true, width: 180 },
            { key: 'subject', header: 'Subject', sortable: true, filterable: true },
            { key: 'templateName', header: 'Template', sortable: true, width: 150 },
            {
                key: 'status', header: 'Status', sortable: true, width: 100,
                filterable: true, filterType: 'select',
                filterOptions: [
                    { value: '0', label: 'Pending' },
                    { value: '2', label: 'Sent' },
                    { value: '3', label: 'Failed' }
                ],
                render: function (val) { return renderBadge(val, EMAIL_STATUS); }
            },
            {
                key: 'retryCount', header: 'Retries', sortable: true, width: 80,
                render: function (val, row) {
                    var cls = val > 0 ? 'text-warning fw-bold' : '';
                    return '<span class="' + cls + '">' + val + '/' + row.maxRetries + '</span>';
                }
            },
            {
                key: 'sentAt', header: 'Sent At', sortable: true, width: 140,
                render: function (val) { return formatDateTime(val); }
            },
            {
                key: 'errorMessage', header: 'Error', width: 200,
                render: function (val) {
                    if (!val) return '';
                    var short = val.length > 50 ? val.substring(0, 50) + '...' : val;
                    return '<span class="text-danger small" title="' + escapeHtml(val) + '">' + escapeHtml(short) + '</span>';
                }
            },
            {
                key: 'createdDate', header: 'Date', sortable: true, width: 140,
                render: function (val) { return formatDateTime(val); }
            },
            {
                key: '_actions', header: '', width: 80,
                render: function (val, row) {
                    if (row.status === 3) { // Failed
                        return '<button class="btn btn-sm btn-outline-primary btn-retry" data-id="' + row.id + '"><i class="bi bi-arrow-clockwise"></i></button>';
                    }
                    return '';
                }
            }
        ]
    });

    // Auto-refresh every 10 seconds
    setInterval(function () { grid.refresh(); updateStats(); }, 10000);

    // Retry
    $(document).on('click', '.btn-retry', function (e) {
        e.stopPropagation();
        var id = $(this).data('id');
        var $btn = $(this).prop('disabled', true);
        api.post('/EmailLog/Retry/' + id).done(function () {
            toast.success('Email queued for retry');
            grid.refresh();
        }).always(function () { $btn.prop('disabled', false); });
    });

    // Stats
    function updateStats() {
        api.get('/EmailLog/List?page=1&pageSize=1&status=0').done(function (d) { $('#stat-pending').text(d.totalCount); });
        api.get('/EmailLog/List?page=1&pageSize=1&status=2').done(function (d) { $('#stat-sent').text(d.totalCount); });
        api.get('/EmailLog/List?page=1&pageSize=1&status=3').done(function (d) { $('#stat-failed').text(d.totalCount); });
    }
    updateStats();
});
