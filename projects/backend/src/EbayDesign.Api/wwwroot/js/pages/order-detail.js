$(function () {
    var orderId = ORDER_ID;
    var orderStatus = ORDER_STATUS_VAL;
    var printDecisions = {}; // { designId: { decision: 'approve'|'reject', reason: '' } }
    var rejectDesignId = null;

    // --- Status Timeline ---
    // Main flow (Rejected is a side-branch, not in main flow)
    var mainFlow = [
        { val: 0, label: 'Draft' },
        { val: 1, label: 'Waiting Design' },
        { val: 2, label: 'In Design' },
        { val: 3, label: 'Waiting Approval' },
        { val: 4, label: 'Approved' },
        { val: 6, label: 'In Production' },
        { val: 7, label: 'Shipped' }
    ];
    // Map status to its position in main flow (for progress calculation)
    var flowIndex = {};
    mainFlow.forEach(function (s, i) { flowIndex[s.val] = i; });
    // Rejected/InDesign loop: treat as same position as InDesign
    flowIndex[5] = flowIndex[2];

    var statusDescriptions = {
        0: { icon: 'bi-pencil-square', cls: 'alert-secondary',
             title: 'Draft Order',
             desc: 'This order is still being prepared. You can edit the order details, add or remove items, and update customer information. Click "Submit Order" when ready to proceed.' },
        1: { icon: 'bi-clock-history', cls: 'alert-warning',
             title: 'Waiting for Customer Design',
             desc: 'An email has been sent to the customer requesting their design files. Once the customer uploads their files through the portal, the items will appear below for print quality review.' },
        2: { icon: 'bi-palette', cls: 'alert-primary',
             title: 'Design In Progress',
             desc: 'The design team is working on this order. Upload your design files for each item below, then click "Send Designs to Customer" to submit them for customer approval.' },
        3: { icon: 'bi-hourglass-split', cls: 'alert-warning',
             title: 'Waiting for Customer Approval',
             desc: 'Designs have been sent to the customer for review. The customer will approve or request changes through the portal. You will be notified when they respond.' },
        4: { icon: 'bi-check-circle', cls: 'alert-success',
             title: 'All Designs Approved',
             desc: 'The customer has approved all designs. Click "Start Production" to move this order into the production phase.' },
        5: { icon: 'bi-x-circle', cls: 'alert-danger',
             title: 'Design Rejected by Customer',
             desc: 'The customer has requested changes. Review the rejection reason below, revise the design, and re-submit for approval.' },
        6: { icon: 'bi-gear', cls: 'alert-info',
             title: 'In Production',
             desc: 'This order is currently being produced. Once production is complete and the item is dispatched, click "Mark as Shipped" and enter the tracking number.' },
        7: { icon: 'bi-truck', cls: 'alert-success',
             title: 'Order Shipped',
             desc: 'This order has been shipped. Tracking information is shown in the shipment section.' }
    };

    function refreshOrderStatus() {
        api.get('/Order/List?page=1&pageSize=1&ebayOrderNo=' + encodeURIComponent(ORDER_DATA.ebayOrderNo)).done(function (data) {
            if (data.items && data.items.length > 0) {
                var newStatus = data.items[0].status;
                if (newStatus !== orderStatus) {
                    orderStatus = newStatus;
                    renderStatusUI();
                }
            }
        });
    }

    function renderStatusUI() {
        // Timeline - show main flow, handle Rejected as branch
        var currentIdx = flowIndex[orderStatus] !== undefined ? flowIndex[orderStatus] : 0;
        var isRejected = (orderStatus === 5);

        var html = '';
        mainFlow.forEach(function (s, i) {
            var cls = '';
            if (isRejected) {
                // Rejected: show steps up to InDesign as past, InDesign as current (revision)
                if (i < currentIdx) cls = 'past';
                else if (i === currentIdx) cls = 'current';
            } else {
                if (i < currentIdx) cls = 'past';
                else if (s.val === orderStatus) cls = 'current';
            }
            html += '<div class="status-step ' + cls + '">' + s.label + '</div>';
        });
        $('#status-timeline').html(html);
        $('#order-status-badge').html(renderBadge(orderStatus, ORDER_STATUS));

        // Banner
        $('#status-banner').remove();
        var info = statusDescriptions[orderStatus];
        if (info) {
            var bannerHtml = '<div id="status-banner" class="alert ' + info.cls + ' d-flex align-items-start mb-4" role="alert">';
            bannerHtml += '<i class="bi ' + info.icon + ' fs-4 me-3 mt-1"></i>';
            bannerHtml += '<div><strong>' + info.title + '</strong><div class="small mt-1">' + info.desc + '</div></div>';
            bannerHtml += '</div>';
            $('#status-timeline').after(bannerHtml);
        }

        // Action buttons
        renderStatusActions();

        // Draft-only UI elements
        var isDraft = (orderStatus === 0);

        // Edit/Delete buttons for order details
        if (isDraft) {
            $('#edit-buttons').html(
                '<button class="btn btn-sm btn-outline-primary" id="btn-edit"><i class="bi bi-pencil me-1"></i>Edit</button>' +
                '<button class="btn btn-sm btn-outline-danger ms-1" id="btn-delete-order"><i class="bi bi-trash me-1"></i>Delete</button>'
            );
        } else {
            $('#edit-buttons').html('');
            // If was in edit mode, close it
            $('#edit-mode').addClass('d-none');
            $('#view-mode').removeClass('d-none');
        }

        // Items table - render with or without action column
        renderItemsTable();

    }

    function renderItemsTable() {
        var isDraft = (orderStatus === 0);
        var headerHtml = isDraft
            ? '<button class="btn btn-sm btn-outline-primary" id="btn-add-item"><i class="bi bi-plus-lg me-1"></i>Add Item</button>'
            : '';
        $('#items-header-actions').html(headerHtml);

        var html = '<table class="table mb-0" id="items-table"><thead><tr>';
        html += '<th>SKU</th><th>eBay Product Code</th><th style="width:80px">Qty</th><th>Description</th>';
        if (isDraft) html += '<th style="width:90px"></th>';
        html += '</tr></thead><tbody>';
        ORDER_DATA.items.forEach(function (item) {
            html += '<tr data-item-id="' + item.id + '">';
            html += '<td class="fw-medium item-sku">' + escapeHtml(item.sku) + '</td>';
            html += '<td class="item-epc">' + escapeHtml(item.ebayProductCode || '-') + '</td>';
            html += '<td class="item-qty">' + item.quantity + '</td>';
            html += '<td class="item-desc">' + escapeHtml(item.description || '-') + '</td>';
            if (isDraft) {
                html += '<td class="text-end">';
                html += '<button class="btn btn-sm btn-outline-secondary btn-edit-item me-1" title="Edit"><i class="bi bi-pencil"></i></button>';
                html += '<button class="btn btn-sm btn-outline-danger btn-remove-item" title="Delete"><i class="bi bi-trash"></i></button>';
                html += '</td>';
            }
            html += '</tr>';
        });
        html += '</tbody></table>';
        $('#items-card-body').html(html);
    }

    function renderStatusActions() {
        var html = '';
        var nextMap = {
            0: { next: 1, label: 'Submit Order', cls: 'btn-primary' },
            4: { next: 6, label: 'Start Production', cls: 'btn-info' },
            6: { next: null, label: 'Mark as Shipped', cls: 'btn-success', modal: true }
        };
        var action = nextMap[orderStatus];
        if (action) {
            if (action.modal) {
                html += '<button class="btn ' + action.cls + '" id="btn-status-action" data-bs-toggle="modal" data-bs-target="#shipModal">' +
                    '<i class="bi bi-truck me-1"></i>' + action.label + '</button>';
            } else {
                html += '<button class="btn ' + action.cls + '" id="btn-status-action" data-next="' + action.next + '">' +
                    '<i class="bi bi-arrow-right-circle me-1"></i>' + action.label + '</button>';
            }
        }
        $('#status-actions').html(html);
    }

    // Initial render
    renderStatusUI();
    if (orderStatus > 0) loadDesigns();

    $(document).on('click', '#btn-status-action[data-next]', function () {
        var next = parseInt($(this).data('next'));
        var $btn = $(this).prop('disabled', true);
        api.patch('/Order/UpdateStatus/' + orderId, { status: next }).done(function () {
            toast.success('Status updated');
            orderStatus = next;
            renderStatusUI();
            loadDesigns();
        }).fail(function () { $btn.prop('disabled', false); });
    });

    // --- Edit Mode ---
    $('#btn-edit').click(function () {
        $('#view-mode').addClass('d-none');
        $('#edit-mode').removeClass('d-none');
    });
    $('#btn-cancel-edit').click(function () {
        $('#edit-mode').addClass('d-none');
        $('#view-mode').removeClass('d-none');
    });
    $('#btn-save-order').click(function () {
        var items = [];
        ORDER_DATA.items.forEach(function (item) {
            items.push({ id: item.id, sku: item.sku, quantity: item.quantity, description: item.description });
        });
        var data = {
            ebayOrderNo: $('#edit-ebay-no').val().trim(),
            notes: $('#edit-notes').val().trim() || null,
            items: items
        };
        api.put('/Order/Update/' + orderId, data).done(function () {
            toast.success('Order updated');
            location.reload();
        });
    });

    // --- Item Management (Draft only) ---
    if (orderStatus === 0) {
        // Edit item inline
        $(document).on('click', '.btn-edit-item', function () {
            var $tr = $(this).closest('tr');
            if ($tr.hasClass('editing')) return;
            var sku = $tr.find('.item-sku').text();
            var epc = $tr.find('.item-epc').text();
            var qty = $tr.find('.item-qty').text();
            var desc = $tr.find('.item-desc').text();
            if (desc === '-') desc = '';
            if (epc === '-') epc = '';

            $tr.addClass('editing');
            $tr.find('.item-sku').html('<input type="text" class="form-control form-control-sm edit-sku" value="' + escapeHtml(sku) + '" />');
            $tr.find('.item-epc').html('<input type="text" class="form-control form-control-sm edit-epc" value="' + escapeHtml(epc) + '" />');
            $tr.find('.item-qty').html('<input type="number" class="form-control form-control-sm edit-qty" value="' + qty + '" min="1" />');
            $tr.find('.item-desc').html('<input type="text" class="form-control form-control-sm edit-desc" value="' + escapeHtml(desc) + '" />');
            $tr.find('td:last').html(
                '<button class="btn btn-sm btn-success btn-save-item me-1" title="Save"><i class="bi bi-check-lg"></i></button>' +
                '<button class="btn btn-sm btn-outline-secondary btn-cancel-item" title="Cancel"><i class="bi bi-x-lg"></i></button>'
            );
        });

        // Cancel edit
        $(document).on('click', '.btn-cancel-item', function () {
            location.reload();
        });

        // Save item edit
        $(document).on('click', '.btn-save-item', function () {
            var $tr = $(this).closest('tr');
            var sku = $tr.find('.edit-sku').val().trim();
            var epc = $tr.find('.edit-epc').val().trim();
            var qty = parseInt($tr.find('.edit-qty').val()) || 0;
            var desc = $tr.find('.edit-desc').val().trim();
            if (!sku) { toast.error('SKU is required'); return; }
            if (qty < 1) { toast.error('Quantity must be at least 1'); return; }

            var items = [];
            $('#items-table tbody tr').each(function () {
                var id = $(this).data('item-id');
                if ($(this).hasClass('editing') && $(this).find('.edit-sku').length) {
                    items.push({ id: id, sku: sku, ebayProductCode: epc || null, quantity: qty, description: desc || null });
                } else {
                    var origItem = ORDER_DATA.items.find(function (i) { return i.id === id; });
                    if (origItem) items.push({ id: id, sku: origItem.sku, ebayProductCode: origItem.ebayProductCode, quantity: origItem.quantity, description: origItem.description });
                }
            });

            var $btn = $(this).prop('disabled', true);
            api.put('/Order/Update/' + orderId, {
                ebayOrderNo: ORDER_DATA.ebayOrderNo,
                notes: ORDER_DATA.notes,
                items: items
            }).done(function () {
                toast.success('Item updated');
                location.reload();
            }).fail(function () { $btn.prop('disabled', false); });
        });

        // Remove item
        $(document).on('click', '.btn-remove-item', function () {
            var $tr = $(this).closest('tr');
            var itemId = $tr.data('item-id');
            var itemCount = $('#items-table tbody tr').length;
            if (itemCount <= 1) { toast.error('Order must have at least one item'); return; }

            confirmDialog('Remove this item from the order?', function () {
                api.del('/Order/DeleteItem/' + orderId + '?itemId=' + itemId).done(function () {
                    toast.success('Item removed');
                    $tr.fadeOut(200, function () { $(this).remove(); });
                    ORDER_DATA.items = ORDER_DATA.items.filter(function (i) { return i.id !== itemId; });
                });
            });
        });

        // Add item
        $('#btn-add-item').click(function () {
            var $tbody = $('#items-table tbody');
            var html = '<tr class="editing new-item">';
            html += '<td><input type="text" class="form-control form-control-sm edit-sku" placeholder="SKU" /></td>';
            html += '<td><input type="text" class="form-control form-control-sm edit-epc" placeholder="eBay Product Code" /></td>';
            html += '<td><input type="number" class="form-control form-control-sm edit-qty" value="1" min="1" /></td>';
            html += '<td><input type="text" class="form-control form-control-sm edit-desc" placeholder="Description" /></td>';
            html += '<td class="text-end">';
            html += '<button class="btn btn-sm btn-success btn-confirm-add me-1" title="Add"><i class="bi bi-check-lg"></i></button>';
            html += '<button class="btn btn-sm btn-outline-secondary btn-cancel-add" title="Cancel"><i class="bi bi-x-lg"></i></button>';
            html += '</td></tr>';
            $tbody.append(html);
            $tbody.find('tr:last .edit-sku').focus();
        });

        $(document).on('click', '.btn-cancel-add', function () {
            $(this).closest('tr').remove();
        });

        $(document).on('click', '.btn-confirm-add', function () {
            var $tr = $(this).closest('tr');
            var sku = $tr.find('.edit-sku').val().trim();
            var epc = $tr.find('.edit-epc').val().trim();
            var qty = parseInt($tr.find('.edit-qty').val()) || 0;
            var desc = $tr.find('.edit-desc').val().trim();
            if (!sku) { toast.error('SKU is required'); return; }
            if (qty < 1) { toast.error('Quantity must be at least 1'); return; }

            var $btn = $(this).prop('disabled', true);
            api.post('/Order/AddItem/' + orderId, {
                sku: sku, ebayProductCode: epc || null, quantity: qty, description: desc || null, designType: 0
            }).done(function () {
                toast.success('Item added');
                location.reload();
            }).fail(function () { $btn.prop('disabled', false); });
        });
    }

    // --- Delete Order ---
    $('#btn-delete-order').click(function () {
        confirmDialog('This will permanently delete this draft order.', function () {
            api.del('/Order/Delete/' + orderId).done(function () {
                toast.success('Order deleted');
                window.location.href = '/Order';
            });
        });
    });

    // --- Ship Order ---
    $('#btn-ship-confirm').click(function () {
        var tracking = $('#ship-tracking').val().trim();
        if (!tracking) { toast.error('Tracking number is required'); return; }
        var $btn = $(this).prop('disabled', true);
        api.post('/Order/CreateShipment/' + orderId, {
            trackingNumber: tracking,
            deliveryType: parseInt($('#ship-delivery-type').val())
        }).done(function () {
            toast.success('Order shipped');
            location.reload();
        }).fail(function () { $btn.prop('disabled', false); });
    });

    // --- Design Management ---
    function loadDesigns() {
        api.get('/Design/ByOrder?orderId=' + orderId).done(function (designs) {
            renderDesignSection(designs);
            refreshOrderStatus();
        });
    }

    function isImageUrl(fileName) {
        return /\.(jpe?g|png|gif|bmp|webp)$/i.test(fileName);
    }

    function getServerFileIcon(name) {
        var ext = (name || '').split('.').pop().toLowerCase();
        var map = {
            pdf: 'bi-file-earmark-pdf text-danger',
            psd: 'bi-file-earmark-richtext text-purple',
            ai: 'bi-file-earmark-richtext text-warning',
            tif: 'bi-file-earmark-image text-info',
            tiff: 'bi-file-earmark-image text-info'
        };
        return map[ext] || 'bi-file-earmark text-secondary';
    }

    function renderFileGrid(files, designId, canDelete) {
        var html = '<div class="file-preview-grid">';
        files.forEach(function (f) {
            var fileUrl = '/files/' + f.fileUrl;
            html += '<div class="file-preview-card file-open-link" data-url="' + fileUrl + '" style="cursor:pointer">';

            // Action buttons overlay
            html += '<div class="file-card-actions">';
            if (canDelete) {
                html += '<button type="button" class="file-action-btn btn-delete-file" data-design-id="' + designId + '" data-file-id="' + f.id + '" title="Delete"><i class="bi bi-trash"></i></button>';
            }
            html += '<a href="' + fileUrl + '" download="' + escapeHtml(f.fileName) + '" class="file-action-btn btn-download-file" title="Download"><i class="bi bi-download"></i></a>';
            html += '</div>';

            if (isImageUrl(f.fileName)) {
                html += '<div class="file-preview-thumb"><img src="' + fileUrl + '" alt="' + escapeHtml(f.fileName) + '" /></div>';
            } else {
                html += '<div class="file-preview-icon"><i class="bi ' + getServerFileIcon(f.fileName) + '"></i></div>';
            }

            var shortName = f.fileName.length > 18 ? f.fileName.substring(0, 15) + '...' : f.fileName;
            html += '<div class="file-preview-info">';
            html += '<span class="file-preview-name" title="' + escapeHtml(f.fileName) + '">' + escapeHtml(shortName) + '</span>';
            html += '<div class="d-flex justify-content-between align-items-center">';
            html += '<span class="file-preview-size">' + formatFileSize(f.fileSizeBytes) + '</span>';
            html += '<span class="badge bg-light text-dark" style="font-size:0.65rem">v' + f.version + '</span>';
            html += '</div></div></div>';
        });
        html += '</div>';
        return html;
    }

    function renderDesignSection(designs) {
        if (!designs || designs.length === 0) {
            $('#design-section').html('');
            return;
        }

        var html = '<div class="card border-0 shadow-sm mb-4"><div class="card-header bg-white d-flex justify-content-between align-items-center">';
        html += '<h6 class="mb-0 fw-bold">Design Management</h6>';
        html += '</div><div class="card-body">';

        // Print review banner
        var needsPrintReview = designs.filter(function (d) { return d.status === 1; }); // CustomerUploaded
        if (needsPrintReview.length > 0) {
            html += '<div class="alert alert-warning"><i class="bi bi-exclamation-triangle me-2"></i><strong>' +
                needsPrintReview.length + ' item(s)</strong> need print quality review</div>';
        }

        // Design cards
        designs.forEach(function (d) {
            html += renderDesignCard(d);
        });

        // Action buttons
        if (needsPrintReview.length > 0) {
            html += '<button class="btn btn-primary me-2" id="btn-submit-print-review"><i class="bi bi-check-all me-1"></i>Submit Print Review</button>';
        }

        var readyToSend = designs.filter(function (d) {
            return (d.status === 3 || d.status === 4) && d.files.some(function (f) { return f.uploadedBy === 1 && f.isActive; }); // PrintApproved/InDesign + has admin file
        });
        if (readyToSend.length > 0) {
            html += '<button class="btn btn-success" id="btn-send-to-customer"><i class="bi bi-send me-1"></i>Send Designs to Customer</button>';
        }

        html += '</div></div>';
        $('#design-section').html(html);
    }

    function renderDesignCard(d) {
        var item = ORDER_DATA.items.find(function (i) { return i.id === d.orderItemId; });
        var sku = item ? item.sku : 'Unknown';

        var html = '<div class="design-card" data-design-id="' + d.id + '">';

        // Header
        html += '<div class="d-flex justify-content-between align-items-center mb-3">';
        html += '<div><span class="badge bg-secondary me-2">' + escapeHtml(sku) + '</span>' + renderBadge(d.status, DESIGN_STATUS) + '</div>';
        if (d.approvalToken) {
            var portalLink = window.location.origin + '/Portal/Design/' + d.approvalToken;
            html += '<a href="' + portalLink + '" target="_blank" class="btn btn-sm btn-outline-primary"><i class="bi bi-link-45deg me-1"></i>Portal Link</a>';
        }
        html += '</div>';

        // --- Version Timeline ---
        html += renderVersionTimeline(d);

        // --- Actions based on current status ---
        if (d.status === 1) { // CustomerUploaded - print review
            html += '<div class="mt-3 border-top pt-3">';
            html += '<div class="form-check form-check-inline"><input type="radio" class="form-check-input print-decision" name="print-' + d.id + '" value="approve" id="pa-' + d.id + '"><label class="form-check-label" for="pa-' + d.id + '">Print Suitable</label></div>';
            html += '<div class="form-check form-check-inline"><input type="radio" class="form-check-input print-decision" name="print-' + d.id + '" value="reject" id="pr-' + d.id + '"><label class="form-check-label" for="pr-' + d.id + '">Not Suitable</label></div>';
            html += '<div class="mt-2 print-reject-reason d-none" data-id="' + d.id + '"><textarea class="form-control form-control-sm reject-reason-input" rows="2" placeholder="Reason for rejection..."></textarea></div>';
            html += '</div>';
        }

        if (d.status === 3 || d.status === 4 || d.status === 7) { // PrintApproved, InDesign, Rejected
            html += '<div class="mt-3 border-top pt-3">';
            html += '<label class="form-label small">Upload Design File</label>';
            html += '<input type="file" class="form-control form-control-sm upload-design-file" data-design-id="' + d.id + '" accept=".pdf,.jpg,.jpeg,.png,.psd,.ai,.tiff,.tif" />';
            html += '</div>';
        }

        if (d.status === 5) {
            html += '<div class="alert alert-info py-2 mt-3 mb-0"><i class="bi bi-hourglass-split me-1"></i>Waiting for customer approval</div>';
        }


        html += '</div>';
        return html;
    }

    // Determine what happened in a specific round by analyzing file states
    function getRoundStatus(cFiles, aFiles, isCurrentRound, designStatus, rejectionReason) {
        var steps = [];

        // who: 'customer' | 'admin' | 'system'
        if (cFiles.length > 0) {
            var cRejected = cFiles.find(function (f) { return f.rejectionReason; });
            steps.push({ icon: 'bi-cloud-upload', label: 'Uploaded files', cls: 'step-done', who: 'customer' });
            if (cRejected) {
                steps.push({ icon: 'bi-x-circle', label: 'Print not suitable', cls: 'step-rejected', who: 'admin', reason: cRejected.rejectionReason });
            } else if (!isCurrentRound || aFiles.length > 0 || designStatus >= 3) {
                steps.push({ icon: 'bi-check-circle', label: 'Print approved', cls: 'step-done', who: 'admin' });
            } else if (isCurrentRound && designStatus === 1) {
                steps.push({ icon: 'bi-hourglass-split', label: 'Print review', cls: 'step-waiting', who: 'admin' });
            }
        }

        if (aFiles.length > 0) {
            steps.push({ icon: 'bi-palette', label: 'Design created', cls: 'step-done', who: 'admin' });

            if (!isCurrentRound) {
                steps.push({ icon: 'bi-send', label: 'Sent for approval', cls: 'step-done', who: 'admin' });
                steps.push({ icon: 'bi-x-circle', label: 'Rejected', cls: 'step-rejected', who: 'customer', reason: rejectionReason || '' });
            } else {
                if (designStatus === 5) {
                    steps.push({ icon: 'bi-send', label: 'Sent for approval', cls: 'step-done', who: 'admin' });
                    steps.push({ icon: 'bi-hourglass-split', label: 'Reviewing', cls: 'step-waiting', who: 'customer' });
                } else if (designStatus === 6) {
                    steps.push({ icon: 'bi-send', label: 'Sent for approval', cls: 'step-done', who: 'admin' });
                    steps.push({ icon: 'bi-check-circle-fill', label: 'Approved', cls: 'step-approved', who: 'customer' });
                } else if (designStatus === 7) {
                    steps.push({ icon: 'bi-send', label: 'Sent for approval', cls: 'step-done', who: 'admin' });
                    steps.push({ icon: 'bi-x-circle', label: 'Rejected', cls: 'step-rejected', who: 'customer', reason: rejectionReason || '' });
                } else if (designStatus === 4) {
                    steps.push({ icon: 'bi-hourglass-split', label: 'Ready to send', cls: 'step-waiting', who: 'admin' });
                }
            }
        } else if (cFiles.length > 0 && !cFiles.find(function(f){return f.rejectionReason;}) && isCurrentRound) {
            if (designStatus === 3 || designStatus === 4) {
                steps.push({ icon: 'bi-hourglass-split', label: 'Creating design', cls: 'step-waiting', who: 'admin' });
            }
        }

        return steps;
    }

    function renderVersionTimeline(d) {
        if (!d.files || d.files.length === 0) return '';

        var customerFiles = d.files.filter(function (f) { return f.uploadedBy === 0; });
        var adminFiles = d.files.filter(function (f) { return f.uploadedBy === 1; });
        var allVersions = getUniqueVersions(d.files);
        if (allVersions.length === 0) return '';
        var maxVersion = allVersions[0];

        var html = '<div class="version-timeline">';

        allVersions.forEach(function (v) {
            var cFiles = customerFiles.filter(function (f) { return f.version === v; });
            var aFiles = adminFiles.filter(function (f) { return f.version === v; });
            if (cFiles.length === 0 && aFiles.length === 0) return;

            var hasActive = cFiles.some(function (f) { return f.isActive; }) || aFiles.some(function (f) { return f.isActive; });
            var isLatest = (v === maxVersion);
            var steps = getRoundStatus(cFiles, aFiles, isLatest, d.status, d.rejectionReason);

            // Determine round outcome for header badge
            var lastStep = steps.length > 0 ? steps[steps.length - 1] : null;
            var roundCls = 'active';
            var headerBadge = '';
            if (!isLatest || (lastStep && lastStep.cls === 'step-approved')) {
                if (lastStep && lastStep.cls === 'step-rejected') {
                    roundCls = 'rejected';
                    headerBadge = '<span class="badge bg-danger bg-opacity-10 text-danger" style="font-size:0.65rem"><i class="bi bi-x-circle me-1"></i>Rejected</span>';
                } else if (lastStep && lastStep.cls === 'step-approved') {
                    roundCls = 'approved';
                    headerBadge = '<span class="badge bg-success bg-opacity-10 text-success" style="font-size:0.65rem"><i class="bi bi-check-circle me-1"></i>Approved</span>';
                } else {
                    roundCls = 'past';
                    headerBadge = '<span class="badge bg-light text-muted" style="font-size:0.65rem">Completed</span>';
                }
            } else if (lastStep && lastStep.cls === 'step-waiting') {
                headerBadge = '<span class="badge bg-warning bg-opacity-10 text-warning" style="font-size:0.65rem"><i class="bi bi-clock me-1"></i>In Progress</span>';
            } else {
                headerBadge = '<span class="badge bg-primary bg-opacity-10 text-primary" style="font-size:0.65rem"><i class="bi bi-circle-fill me-1" style="font-size:0.4rem"></i>Current</span>';
            }

            html += '<div class="version-round ' + roundCls + '">';

            // Header
            html += '<div class="version-round-header" data-bs-toggle="collapse" data-bs-target="#vr-' + d.id + '-' + v + '">';
            html += '<div class="d-flex align-items-center gap-2 flex-wrap">';
            html += '<span class="version-dot ' + roundCls + '"></span>';
            html += '<span class="fw-bold">Round ' + v + '</span>';
            html += headerBadge;

            // Mini step summary in header for collapsed rounds
            if (steps.length > 0 && !isLatest) {
                html += '<span class="round-mini-steps ms-1">';
                steps.forEach(function (s, si) {
                    var color = s.cls === 'step-done' ? '#10b981' : s.cls === 'step-rejected' ? '#ef4444' : s.cls === 'step-approved' ? '#10b981' : '#f59e0b';
                    var whoIcon = s.who === 'customer' ? 'bi-person-fill' : 'bi-building';
                    if (si > 0) html += '<i class="bi bi-chevron-right" style="color:#d1d5db;font-size:0.55rem"></i>';
                    html += '<span class="mini-step" title="' + (s.who === 'customer' ? 'Customer' : 'Admin') + ': ' + s.label + '">';
                    html += '<i class="bi ' + whoIcon + '" style="color:#9ca3af;font-size:0.6rem"></i>';
                    html += '<i class="bi ' + s.icon + '" style="color:' + color + ';font-size:0.7rem"></i>';
                    html += '</span>';
                });
                html += '</span>';
            }

            html += '</div>';
            html += '<i class="bi bi-chevron-down version-chevron"></i>';
            html += '</div>';

            // Collapsible body
            html += '<div class="collapse ' + (isLatest ? 'show' : '') + '" id="vr-' + d.id + '-' + v + '">';
            html += '<div class="version-round-body">';

            // Step flow visualization
            if (steps.length > 0) {
                html += '<div class="round-step-flow mb-3">';
                steps.forEach(function (s, idx) {
                    if (idx > 0) html += '<i class="bi bi-chevron-right round-step-arrow"></i>';
                    var whoClass = 'who-' + (s.who || 'system');
                    html += '<div class="round-step ' + s.cls + ' ' + whoClass + '">';
                    html += '<span class="round-step-who">' + (s.who === 'customer' ? '<i class="bi bi-person-fill"></i>' : '<i class="bi bi-building"></i>') + '</span>';
                    html += '<span class="round-step-content">';
                    html += '<i class="bi ' + s.icon + '"></i> ' + s.label;
                    html += '</span>';
                    html += '</div>';
                });
                html += '</div>';

                // Show rejection reasons
                var rejSteps = steps.filter(function (s) { return s.reason; });
                rejSteps.forEach(function (rs) {
                    var whoLabel = rs.who === 'customer' ? 'Customer' : 'Admin';
                    html += '<div class="round-rejection-note"><i class="bi bi-chat-left-text me-1"></i><strong>' + whoLabel + ':</strong> ' + escapeHtml(rs.reason) + '</div>';
                });
            }

            // Files
            if (cFiles.length > 0) {
                html += '<div class="version-section">';
                html += '<div class="version-section-label"><i class="bi bi-person-circle text-warning me-1"></i>Customer Upload <span class="text-muted">(' + cFiles.length + ' file' + (cFiles.length > 1 ? 's' : '') + ')</span></div>';
                html += renderFileGrid(cFiles, d.id, false);
                html += '</div>';
            }

            if (aFiles.length > 0) {
                html += '<div class="version-section mt-2">';
                html += '<div class="version-section-label"><i class="bi bi-palette2 text-primary me-1"></i>Admin Design <span class="text-muted">(' + aFiles.length + ' file' + (aFiles.length > 1 ? 's' : '') + ')</span></div>';
                var canDeleteAdmin = hasActive && d.status !== 5 && d.status !== 6; // not WaitingApproval, not Approved
                html += renderFileGrid(aFiles, d.id, canDeleteAdmin);
                html += '</div>';
            }

            html += '</div></div>';
            html += '</div>';
        });

        html += '</div>';
        return html;
    }

    function getUniqueVersions(files) {
        var map = {};
        files.forEach(function (f) { map[f.version] = true; });
        return Object.keys(map).map(Number).sort(function (a, b) { return b - a; });
    }

    // Print review decisions
    $(document).on('change', '.print-decision', function () {
        var name = $(this).attr('name');
        var designId = name.replace('print-', '');
        var val = $(this).val();
        printDecisions[designId] = { decision: val, reason: '' };
        if (val === 'reject') {
            $('.print-reject-reason[data-id="' + designId + '"]').removeClass('d-none');
        } else {
            $('.print-reject-reason[data-id="' + designId + '"]').addClass('d-none');
        }
    });

    $(document).on('input', '.reject-reason-input', function () {
        var designId = $(this).closest('.print-reject-reason').data('id');
        if (printDecisions[designId]) {
            printDecisions[designId].reason = $(this).val();
        }
    });

    // Submit print review
    $(document).on('click', '#btn-submit-print-review', function () {
        var keys = Object.keys(printDecisions);
        if (keys.length === 0) { toast.error('Please make a decision for each item'); return; }

        // Validate all rejections have reasons
        for (var i = 0; i < keys.length; i++) {
            var dec = printDecisions[keys[i]];
            if (dec.decision === 'reject' && !dec.reason.trim()) {
                toast.error('Please provide a reason for rejection');
                return;
            }
        }

        var $btn = $(this).prop('disabled', true);
        // Sequential execution so event handlers see correct state
        function submitNext(idx) {
            if (idx >= keys.length) {
                toast.success('Print review submitted');
                printDecisions = {};
                loadDesigns();
                return;
            }
            var id = keys[idx];
            var dec = printDecisions[id];
            var req = dec.decision === 'approve'
                ? api.patch('/Design/ApprovePrint/' + id)
                : api.patch('/Design/RejectPrint/' + id, { reason: dec.reason });
            req.done(function () { submitNext(idx + 1); })
               .fail(function () { $btn.prop('disabled', false); });
        }
        submitNext(0);
    });

    // Upload design file
    $(document).on('change', '.upload-design-file', function () {
        var file = this.files[0];
        if (!file) return;
        var designId = $(this).data('design-id');
        var formData = new FormData();
        formData.append('file', file);

        var $input = $(this).prop('disabled', true);
        api.upload('/Design/UploadFile/' + designId, formData).done(function () {
            toast.success('File uploaded');
            loadDesigns();
        }).fail(function () { $input.prop('disabled', false); });
    });

    // Open file in new tab
    $(document).on('click', '.file-open-link', function (e) {
        if ($(e.target).closest('.file-card-actions').length) return;
        window.open($(this).data('url'), '_blank');
    });

    // Download file
    $(document).on('click', '.btn-download-file', function (e) {
        e.stopPropagation();
    });

    // Delete design file
    $(document).on('click', '.btn-delete-file', function (e) {
        e.stopPropagation();
        var designId = $(this).data('design-id');
        var fileId = $(this).data('file-id');
        confirmDialog('Delete this design file?', function () {
            api.del('/Design/DeleteFile/' + designId + '?fileId=' + fileId).done(function () {
                toast.success('File deleted');
                loadDesigns();
            });
        });
    });

    // Send designs to customer
    $(document).on('click', '#btn-send-to-customer', function () {
        var $btn = $(this).prop('disabled', true);
        api.get('/Design/ByOrder?orderId=' + orderId).done(function (designs) {
            var toSend = designs.filter(function (d) {
                return (d.status === 3 || d.status === 4) && d.files.some(function (f) { return f.uploadedBy === 1 && f.isActive; });
            });
            if (toSend.length === 0) { $btn.prop('disabled', false); return; }

            function sendNext(idx) {
                if (idx >= toSend.length) {
                    toast.success('Designs sent to customer');
                    loadDesigns();
                    return;
                }
                api.patch('/Design/SubmitForApproval/' + toSend[idx].id)
                    .done(function () { sendNext(idx + 1); })
                    .fail(function () { $btn.prop('disabled', false); });
            }
            sendNext(0);
        });
    });

    // Approve design
    $(document).on('click', '.btn-approve-design', function () {
        var id = $(this).data('id');
        var $btn = $(this).prop('disabled', true);
        api.patch('/Design/Approve/' + id).done(function () {
            toast.success('Design approved');
            loadDesigns();
        }).fail(function () { $btn.prop('disabled', false); });
    });

    // Reject design - open modal
    $(document).on('click', '.btn-reject-design', function () {
        rejectDesignId = $(this).data('id');
        $('#reject-reason').val('');
        new bootstrap.Modal('#rejectModal').show();
    });

    $('#btn-reject-confirm').click(function () {
        var reason = $('#reject-reason').val().trim();
        if (!reason) { toast.error('Reason is required'); return; }
        var $btn = $(this).prop('disabled', true);
        api.patch('/Design/Reject/' + rejectDesignId, { reason: reason }).done(function () {
            toast.success('Design rejected');
            bootstrap.Modal.getInstance('#rejectModal').hide();
            loadDesigns();
        }).fail(function () { $btn.prop('disabled', false); });
    });
});
