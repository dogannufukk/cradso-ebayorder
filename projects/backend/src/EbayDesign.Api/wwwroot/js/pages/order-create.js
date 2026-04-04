$(function () {
    var selectedCustomerId = null;
    var currentStep = 1;
    var itemIndex = 0;

    // --- Step Navigation ---
    function goToStep(step) {
        currentStep = step;
        $('.wizard-step').removeClass('active');
        $('#step-' + step).addClass('active');
        $('.step-indicator .step').removeClass('active completed');
        for (var i = 1; i <= 3; i++) {
            if (i < step) $('#step-ind-' + i).addClass('completed');
            else if (i === step) $('#step-ind-' + i).addClass('active');
        }
    }

    $('#step1-next').click(function () {
        if (!selectedCustomerId) { toast.error('Please select or create a customer'); return; }
        goToStep(2);
    });
    $('#step2-back').click(function () { goToStep(1); });
    $('#step2-next').click(function () {
        if (!$('#ebay-order-no').val().trim()) { toast.error('eBay Order No is required'); return; }
        goToStep(3);
        if ($('#items-container .item-row').length === 0) addItem();
    });
    $('#step3-back').click(function () { goToStep(2); });

    // --- Customer Search ---
    var searchCustomers = debounce(function () {
        var q = $('#customer-search').val().trim();
        if (q.length < 2) { $('#customer-results').html(''); return; }
        api.get('/Customer/List?page=1&pageSize=10&search=' + encodeURIComponent(q)).done(function (data) {
            if (!data.items || data.items.length === 0) {
                $('#customer-results').html('<div class="text-muted p-2">No customers found</div>');
                return;
            }
            var html = '<div class="list-group">';
            data.items.forEach(function (c) {
                html += '<a href="#" class="list-group-item list-group-item-action customer-pick" data-id="' + c.id + '" data-name="' + escapeHtml(c.customerName || c.companyName || '') + '" data-email="' + escapeHtml(c.email) + '">';
                html += '<strong>' + escapeHtml(c.customerName || c.companyName || 'No name') + '</strong> <span class="text-muted">- ' + escapeHtml(c.email) + '</span>';
                html += '</a>';
            });
            html += '</div>';
            $('#customer-results').html(html);
        });
    }, 400);

    $('#customer-search').on('input', searchCustomers);

    $(document).on('click', '.customer-pick', function (e) {
        e.preventDefault();
        selectCustomer($(this).data('id'), $(this).data('name'), $(this).data('email'));
    });

    function selectCustomer(id, name, email) {
        selectedCustomerId = id;
        $('#sel-customer-name').text(name);
        $('#sel-customer-email').text(email);
        $('#selected-customer').removeClass('d-none');
        $('#customer-search').val('').prop('disabled', true);
        $('#customer-results').html('');
        $('#new-customer-form').addClass('d-none');
        $('#step1-next').prop('disabled', false);
    }

    $('#clear-customer').click(function () {
        selectedCustomerId = null;
        $('#selected-customer').addClass('d-none');
        $('#customer-search').val('').prop('disabled', false).focus();
        $('#step1-next').prop('disabled', true);
    });

    // --- New Customer ---
    $('#toggle-new-customer').click(function (e) {
        e.preventDefault();
        $('#new-customer-form').toggleClass('d-none');
        $('#customer-search').val('').prop('disabled', !$('#new-customer-form').hasClass('d-none'));
        $('#customer-results').html('');
    });

    $('#create-customer-btn').click(function () {
        var email = $('#nc-email').val().trim();
        if (!email) { toast.error('Email is required'); return; }

        var data = {
            customerName: $('#nc-name').val().trim() || null,
            ebayUsername: $('#nc-ebayuser').val().trim() || null,
            email: email,
            phone: $('#nc-phone').val().trim() || null,
            addressLine1: $('#nc-addr1').val().trim() || null,
            addressLine2: $('#nc-addr2').val().trim() || null,
            city: $('#nc-city').val().trim() || null,
            county: $('#nc-county').val().trim() || null,
            postCode: $('#nc-postcode').val().trim() || null,
            country: $('#nc-country').val().trim() || null
        };

        var $btn = $(this).prop('disabled', true).text('Creating...');
        api.post('/Customer/CreateCustomer', data).done(function (res) {
            toast.success('Customer created');
            selectCustomer(res.id, data.customerName || data.ebayUsername || '', data.email);
        }).always(function () {
            $btn.prop('disabled', false).html('<i class="bi bi-check-lg me-1"></i> Create Customer');
        });
    });

    // --- Items ---
    function addItem() {
        itemIndex++;
        var html = '<div class="item-row border rounded p-3 mb-2" data-idx="' + itemIndex + '">';
        html += '<div class="d-flex justify-content-between align-items-center mb-2">';
        html += '<strong>Item #' + itemIndex + '</strong>';
        html += '<button class="btn btn-sm btn-outline-danger remove-item"><i class="bi bi-trash"></i></button>';
        html += '</div>';
        html += '<div class="row g-2">';
        html += '<div class="col-md-2"><label class="form-label small">SKU <span class="text-danger">*</span></label><input type="text" class="form-control form-control-sm item-sku" required /></div>';
        html += '<div class="col-md-3"><label class="form-label small">eBay Product Code</label><input type="text" class="form-control form-control-sm item-epc" /></div>';
        html += '<div class="col-md-1"><label class="form-label small">Qty <span class="text-danger">*</span></label><input type="number" class="form-control form-control-sm item-qty" value="1" min="1" required /></div>';
        html += '<div class="col-md-3"><label class="form-label small">Description</label><input type="text" class="form-control form-control-sm item-desc" /></div>';
        html += '<div class="col-md-3"><label class="form-label small">Design Type</label>';
        html += '<select class="form-select form-select-sm item-dtype" disabled><option value="0" selected>Customer Upload</option></select></div>';
        html += '</div></div>';
        $('#items-container').append(html);
    }

    $('#add-item').click(function () { addItem(); });

    $(document).on('click', '.remove-item', function () {
        if ($('#items-container .item-row').length > 1) {
            $(this).closest('.item-row').remove();
        } else {
            toast.error('At least one item is required');
        }
    });

    // --- Create Order ---
    $('#create-order-btn').click(function () {
        var ebayNo = $('#ebay-order-no').val().trim();
        if (!ebayNo) { toast.error('eBay Order No is required'); return; }

        var items = [];
        var valid = true;
        $('#items-container .item-row').each(function () {
            var sku = $(this).find('.item-sku').val().trim();
            var qty = parseInt($(this).find('.item-qty').val()) || 0;
            if (!sku) { valid = false; toast.error('SKU is required for all items'); return false; }
            if (qty < 1) { valid = false; toast.error('Quantity must be at least 1'); return false; }
            items.push({
                sku: sku,
                ebayProductCode: $(this).find('.item-epc').val().trim() || null,
                quantity: qty,
                description: $(this).find('.item-desc').val().trim() || null,
                designType: parseInt($(this).find('.item-dtype').val())
            });
        });
        if (!valid || items.length === 0) return;

        var data = {
            ebayOrderNo: ebayNo,
            customerId: selectedCustomerId,
            notes: $('#order-notes').val().trim() || null,
            items: items
        };

        var $btn = $(this).prop('disabled', true).text('Creating...');
        api.post('/Order/CreateOrder', data).done(function (res) {
            toast.success('Order created');
            window.location.href = '/Order/Detail/' + res.id;
        }).always(function () {
            $btn.prop('disabled', false).html('<i class="bi bi-check-lg me-1"></i> Create Order');
        });
    });
});
