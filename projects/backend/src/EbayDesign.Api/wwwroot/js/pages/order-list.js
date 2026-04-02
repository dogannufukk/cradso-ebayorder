$(function () {
    var grid = new DataGrid('#orders-grid', {
        url: '/Order/List',
        rowKey: 'id',
        defaultSortBy: 'createdDate',
        defaultSortDir: 'desc',
        defaultPageSize: 20,
        onRowClick: function (row) {
            window.location.href = '/Order/Detail/' + row.id;
        },
        columns: [
            {
                key: 'ebayOrderNo', header: 'eBay Order No', sortable: true, filterable: true,
                render: function (val, row) {
                    return '<a href="/Order/Detail/' + row.id + '" class="text-decoration-none fw-medium">' + escapeHtml(val) + '</a>';
                }
            },
            { key: 'customerName', header: 'Customer', sortable: true, filterable: true },
            { key: 'customerEmail', header: 'Email', sortable: true, filterable: true },
            {
                key: 'status', header: 'Status', sortable: true, filterable: true,
                filterType: 'select',
                filterOptions: [
                    { value: '0', label: 'Draft' },
                    { value: '1', label: 'Waiting Design' },
                    { value: '2', label: 'In Design' },
                    { value: '3', label: 'Waiting Approval' },
                    { value: '4', label: 'Approved' },
                    { value: '5', label: 'Rejected' },
                    { value: '6', label: 'In Production' },
                    { value: '7', label: 'Shipped' }
                ],
                render: function (val) { return renderBadge(val, ORDER_STATUS); }
            },
            { key: 'itemCount', header: 'Items', width: 80 },
            {
                key: 'createdDate', header: 'Date', sortable: true, width: 150,
                render: function (val) { return formatDateTime(val); }
            },
            {
                key: '_actions', header: '', width: 60,
                render: function (val, row) {
                    if (row.status === 0) {
                        return '<button class="btn btn-sm btn-outline-danger btn-delete" data-id="' + row.id + '" onclick="event.stopPropagation()"><i class="bi bi-trash"></i></button>';
                    }
                    return '';
                }
            }
        ]
    });

    // Delete order
    $(document).on('click', '.btn-delete', function () {
        var id = $(this).data('id');
        confirmDialog('This will permanently delete this draft order.', function () {
            api.del('/Order/Delete/' + id).done(function () {
                toast.success('Order deleted');
                grid.refresh();
            });
        });
    });
});
