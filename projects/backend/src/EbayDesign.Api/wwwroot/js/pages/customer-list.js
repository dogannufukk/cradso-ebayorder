$(function () {
    var grid = new DataGrid('#customers-grid', {
        url: '/Customer/List',
        rowKey: 'id',
        defaultSortBy: 'createdDate',
        defaultSortDir: 'desc',
        defaultPageSize: 20,
        onRowClick: function (row) {
            window.location.href = '/Customer/Detail/' + row.id;
        },
        columns: [
            {
                key: 'customerName', header: 'Name', sortable: true, filterable: true,
                render: function (val, row) {
                    var name = val || row.ebayUsername || 'No name';
                    return '<a href="/Customer/Detail/' + row.id + '" class="text-decoration-none fw-medium">' + escapeHtml(name) + '</a>';
                }
            },
            { key: 'ebayUsername', header: 'eBay Username', sortable: true, filterable: true },
            { key: 'email', header: 'Email', sortable: true, filterable: true },
            { key: 'city', header: 'City', sortable: true, filterable: true },
            { key: 'postCode', header: 'PostCode', sortable: true, filterable: true },
            { key: 'country', header: 'Country', sortable: true },
            {
                key: 'createdDate', header: 'Date', sortable: true, width: 120,
                render: function (val) { return formatDate(val); }
            },
            {
                key: '_actions', header: '', width: 60,
                render: function (val, row) {
                    return '<button class="btn btn-sm btn-outline-danger btn-delete-customer" data-id="' + row.id + '" onclick="event.stopPropagation()"><i class="bi bi-trash"></i></button>';
                }
            }
        ]
    });

    // Add customer
    $('#btn-add-customer').click(function () {
        var email = $('#add-email').val().trim();
        var name = $('#add-name').val().trim();
        var ebayUser = $('#add-ebayuser').val().trim();
        if (!email) { toast.error('Email is required'); return; }
        if (!name && !ebayUser) { toast.error('Customer Name or eBay Username is required'); return; }

        var data = {
            customerName: name || null,
            ebayUsername: ebayUser || null,
            email: email,
            phone: $('#add-phone').val().trim() || null,
            addressLine1: $('#add-addr1').val().trim() || null,
            addressLine2: $('#add-addr2').val().trim() || null,
            city: $('#add-city').val().trim() || null,
            county: $('#add-county').val().trim() || null,
            postCode: $('#add-postcode').val().trim() || null,
            country: $('#add-country').val().trim() || null
        };

        var $btn = $(this).prop('disabled', true);
        api.post('/Customer/CreateCustomer', data).done(function () {
            toast.success('Customer created');
            bootstrap.Modal.getInstance('#addCustomerModal').hide();
            grid.refresh();
            $('#addCustomerModal input').not('#add-country').val('');
        }).always(function () { $btn.prop('disabled', false); });
    });

    // Delete customer
    $(document).on('click', '.btn-delete-customer', function () {
        var id = $(this).data('id');
        confirmDialog('This will permanently delete this customer.', function () {
            api.del('/Customer/Delete/' + id).done(function () {
                toast.success('Customer deleted');
                grid.refresh();
            });
        });
    });
});
