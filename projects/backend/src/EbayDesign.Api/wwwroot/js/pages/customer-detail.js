$(function () {
    $('#btn-edit').click(function () {
        $('#view-mode').addClass('d-none');
        $('#edit-mode').removeClass('d-none');
    });
    $('#btn-cancel').click(function () {
        $('#edit-mode').addClass('d-none');
        $('#view-mode').removeClass('d-none');
    });

    $('#btn-save').click(function () {
        var email = $('#e-email').val().trim();
        if (!email) { toast.error('Email is required'); return; }

        var data = {
            customerName: $('#e-name').val().trim() || null,
            ebayUsername: $('#e-ebayuser').val().trim() || null,
            email: email,
            phone: $('#e-phone').val().trim() || null,
            addressLine1: $('#e-addr1').val().trim() || null,
            addressLine2: $('#e-addr2').val().trim() || null,
            city: $('#e-city').val().trim() || null,
            county: $('#e-county').val().trim() || null,
            postCode: $('#e-postcode').val().trim() || null,
            country: $('#e-country').val().trim() || null
        };

        var $btn = $(this).prop('disabled', true);
        api.put('/Customer/Update/' + CUSTOMER_ID, data).done(function () {
            toast.success('Customer updated');
            location.reload();
        }).always(function () { $btn.prop('disabled', false); });
    });

    $('#btn-delete').click(function () {
        confirmDialog('This will permanently delete this customer.', function () {
            api.del('/Customer/Delete/' + CUSTOMER_ID).done(function () {
                toast.success('Customer deleted');
                window.location.href = '/Customer';
            });
        });
    });
});
