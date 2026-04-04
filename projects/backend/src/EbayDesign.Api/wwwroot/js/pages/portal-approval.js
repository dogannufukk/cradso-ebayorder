$(function () {
    var token = PORTAL_TOKEN;
    var orderData = null;
    var fileSelections = {};
    var decisions = {};
    var previewUrls = {};

    checkOtpAndLoad();

    function checkOtpAndLoad() {
        api.get('/Setting/OtpRequired').done(function (data) {
            if (data.required) {
                var verified = sessionStorage.getItem('otp_verified_' + token);
                if (!verified) { window.location.href = '/Portal/Verify/' + token; return; }
                var exp = JSON.parse(verified);
                if (new Date(exp.expiresAt) <= new Date()) {
                    sessionStorage.removeItem('otp_verified_' + token);
                    window.location.href = '/Portal/Verify/' + token;
                    return;
                }
            }
            loadOrder();
        });
    }

    function loadOrder() {
        api.get('/Portal/GetOrder?token=' + encodeURIComponent(token)).done(function (data) {
            orderData = data;
            renderOrder(data);
            $('#loading-state').addClass('d-none');
            $('#content').removeClass('d-none');
        }).fail(function () {
            $('#loading-state').html('<div class="text-danger text-center py-5"><i class="bi bi-exclamation-circle fs-1"></i><p class="mt-2">Failed to load order. The link may be expired or invalid.</p></div>');
        });
    }

    // ============================
    // RENDER
    // ============================
    function renderOrder(data) {
        $('#portal-customer').text(data.customerName);
        $('#portal-order-no').text(data.ebayOrderNo);
        $('#portal-item-count').text(data.items.length);

        var allApproved = data.items.every(function (i) { return i.status === 6; });
        if (allApproved) $('#all-approved-badge').removeClass('d-none');
        else $('#all-approved-badge').addClass('d-none');

        var html = '';
        data.items.forEach(function (item, idx) { html += renderItemCard(item, idx); });
        $('#item-cards').html(html);
        renderActionButtons(data);
    }

    function renderItemCard(item, idx) {
        var html = '<div class="card border-0 shadow-sm mb-4 portal-item-card" data-design-id="' + item.designRequestId + '">';

        // Card header
        html += '<div class="card-header bg-white py-3">';
        html += '<div class="d-flex justify-content-between align-items-center">';
        html += '<div class="d-flex align-items-center gap-2">';
        html += '<span class="portal-item-number">' + (idx + 1) + '</span>';
        html += '<div><span class="fw-bold">' + escapeHtml(item.sku) + '</span>';
        if (item.quantity > 1) html += ' <span class="text-muted small">x' + item.quantity + '</span>';
        if (item.description) html += '<div class="text-muted small">' + escapeHtml(item.description) + '</div>';
        html += '</div></div>';
        html += renderBadge(item.status, DESIGN_STATUS);
        html += '</div></div>';

        html += '<div class="card-body pt-0">';

        // Status message + action area
        html += renderStatusContent(item);

        // History section (collapsible)
        var history = buildHistory(item);
        if (history.length > 0) {
            html += '<div class="mt-3 pt-3 border-top">';
            html += '<a class="text-decoration-none small fw-medium" data-bs-toggle="collapse" href="#history-' + item.designRequestId + '">';
            html += '<i class="bi bi-clock-history me-1"></i>History (' + history.length + ' round' + (history.length > 1 ? 's' : '') + ')';
            html += '</a>';
            html += '<div class="collapse mt-2" id="history-' + item.designRequestId + '">';
            html += renderHistory(history, item);
            html += '</div></div>';
        }

        html += '</div></div>';
        return html;
    }

    function renderStatusContent(item) {
        var html = '';
        switch (item.status) {
            case 0: // WaitingUpload
                html += '<div class="portal-status-box status-upload">';
                html += '<div class="portal-status-header"><i class="bi bi-cloud-arrow-up fs-5"></i><div><strong>Upload your design files</strong><div class="small text-muted">Please upload the design files for this item</div></div></div>';
                html += renderUploadArea(item);
                html += '</div>';
                break;

            case 2: // PrintRejected
                html += '<div class="portal-status-box status-rejected">';
                html += '<div class="portal-status-header"><i class="bi bi-exclamation-triangle fs-5 text-danger"></i><div><strong>Files need revision</strong>';
                if (item.rejectionReason) html += '<div class="small text-danger mt-1"><i class="bi bi-chat-left-text me-1"></i>' + escapeHtml(item.rejectionReason) + '</div>';
                html += '</div></div>';
                html += renderUploadArea(item);
                html += '</div>';
                break;

            case 1: // CustomerUploaded
                html += '<div class="portal-status-box status-review">';
                html += '<div class="portal-status-header"><i class="bi bi-hourglass-split fs-5 text-primary"></i><div><strong>Under review</strong><div class="small text-muted">Our team is reviewing your files. We\'ll notify you when done.</div></div></div>';
                html += renderCurrentFiles(item, 'customer');
                html += '</div>';
                break;

            case 3: // PrintApproved
                html += '<div class="portal-status-box status-progress">';
                html += '<div class="portal-status-header"><i class="bi bi-check-circle fs-5 text-success"></i><div><strong>Files approved</strong><div class="small text-muted">Your files passed our quality check. Design work in progress.</div></div></div>';
                html += '</div>';
                break;

            case 4: // InDesign
                html += '<div class="portal-status-box status-progress">';
                html += '<div class="portal-status-header"><i class="bi bi-palette fs-5 text-primary"></i><div><strong>Design in progress</strong><div class="small text-muted">Our team is creating your design. You\'ll receive it for approval soon.</div></div></div>';
                html += '</div>';
                break;

            case 5: // WaitingApproval
                html += '<div class="portal-status-box status-approval">';
                html += '<div class="portal-status-header"><i class="bi bi-eye fs-5 text-primary"></i><div><strong>Review the design</strong><div class="small text-muted">Please review the design below and approve or request changes</div></div></div>';
                html += renderDesignPreview(item);
                html += renderApprovalButtons(item);
                html += '</div>';
                break;

            case 6: // Approved
                html += '<div class="portal-status-box status-approved">';
                html += '<div class="portal-status-header"><i class="bi bi-check-circle-fill fs-5 text-success"></i><div><strong>Design approved</strong><div class="small text-muted">This item is proceeding to production</div></div></div>';
                html += renderCurrentFiles(item, 'admin');
                html += '</div>';
                break;

            case 7: // Rejected
                html += '<div class="portal-status-box status-revision">';
                html += '<div class="portal-status-header"><i class="bi bi-arrow-repeat fs-5 text-warning"></i><div><strong>Revising design</strong>';
                if (item.rejectionReason) html += '<div class="small text-muted mt-1">Your feedback: "' + escapeHtml(item.rejectionReason) + '"</div>';
                html += '<div class="small text-muted">We\'re making changes based on your feedback.</div></div></div>';
                html += '</div>';
                break;
        }
        return html;
    }

    function renderUploadArea(item) {
        var html = '<div class="upload-area mt-3" data-design-id="' + item.designRequestId + '">';
        html += '<i class="bi bi-cloud-upload fs-3 text-muted"></i>';
        html += '<p class="text-muted mb-1 small">Click or drag files here</p>';
        html += '<span class="badge bg-light text-muted">PDF, JPG, PNG, PSD, AI, TIFF</span>';
        html += '<input type="file" class="d-none portal-file-input" data-design-id="' + item.designRequestId + '" multiple accept=".pdf,.jpg,.jpeg,.png,.psd,.ai,.tiff,.tif" />';
        html += '</div>';
        html += '<div class="file-preview-list mt-2" data-design-id="' + item.designRequestId + '"></div>';
        return html;
    }

    function renderDesignPreview(item) {
        var adminFiles = (item.activeFiles || []).filter(function (f) { return f.uploadedBy === 'Admin'; });
        if (adminFiles.length === 0) return '';

        var html = '<div class="design-preview-grid mt-3">';
        adminFiles.forEach(function (f) {
            var isImg = isImageUrl(f.fileName);
            html += '<div class="design-preview-item">';
            html += '<a href="' + f.previewUrl + '" target="_blank" class="text-decoration-none" style="display:block;color:inherit">';
            if (isImg) {
                html += '<div class="design-preview-img"><img src="' + f.previewUrl + '" alt="' + escapeHtml(f.fileName) + '" /></div>';
            } else {
                html += '<div class="design-preview-file"><i class="bi ' + getFileIcon(f.fileName) + ' fs-1"></i></div>';
            }
            html += '</a>';
            html += '<div class="design-preview-label">';
            html += '<span>' + escapeHtml(f.fileName) + '</span>';
            html += '<div class="d-flex gap-2 mt-1">';
            html += '<a href="' + f.previewUrl + '" target="_blank" class="small text-primary text-decoration-none"><i class="bi bi-box-arrow-up-right me-1"></i>View</a>';
            html += '<a href="' + f.previewUrl + '" download="' + escapeHtml(f.fileName) + '" class="small text-success text-decoration-none"><i class="bi bi-download me-1"></i>Download</a>';
            html += '</div></div></div>';
        });
        html += '</div>';
        return html;
    }

    function renderApprovalButtons(item) {
        var dec = decisions[item.designRequestId];
        var html = '<div class="approval-actions mt-3">';
        html += '<div class="d-flex gap-2">';
        html += '<button class="btn ' + (dec && dec.action === 'approve' ? 'btn-success' : 'btn-outline-success') + ' btn-portal-approve" data-id="' + item.designRequestId + '"><i class="bi bi-check-lg me-1"></i>Approve Design</button>';
        html += '<button class="btn ' + (dec && dec.action === 'reject' ? 'btn-danger' : 'btn-outline-danger') + ' btn-portal-reject" data-id="' + item.designRequestId + '"><i class="bi bi-x-lg me-1"></i>Don't Approve</button>';
        html += '</div>';

        if (dec && dec.action === 'approve') {
            html += '<div class="decision-indicator mt-2"><span class="badge bg-success"><i class="bi bi-check-lg me-1"></i>Will Approve</span></div>';
        }
        if (dec && dec.action === 'reject') {
            html += '<div class="portal-reject-reason mt-2" data-id="' + item.designRequestId + '">';
            html += '<textarea class="form-control form-control-sm portal-reason-text" rows="2" placeholder="Please describe the changes you need...">' + escapeHtml(dec.reason || '') + '</textarea>';
            html += '</div>';
            html += '<div class="decision-indicator mt-2"><span class="badge bg-danger"><i class="bi bi-x-lg me-1"></i>Won't Approve</span></div>';
        }
        html += '</div>';
        return html;
    }

    function renderCurrentFiles(item, type) {
        var files = (item.activeFiles || []).filter(function (f) {
            return type === 'customer' ? f.uploadedBy === 'Customer' : f.uploadedBy === 'Admin';
        });
        if (files.length === 0) return '';

        var html = '<div class="mt-3">';
        html += '<div class="file-preview-grid">';
        files.forEach(function (f) {
            var isImg = isImageUrl(f.fileName);
            html += '<div class="file-preview-card portal-file-open" data-url="' + f.previewUrl + '" style="cursor:pointer">';
            html += '<div class="file-card-actions"><a href="' + f.previewUrl + '" download="' + escapeHtml(f.fileName) + '" class="file-action-btn btn-download-file" title="Download"><i class="bi bi-download"></i></a></div>';
            if (isImg) {
                html += '<div class="file-preview-thumb"><img src="' + f.previewUrl + '" alt="' + escapeHtml(f.fileName) + '" /></div>';
            } else {
                html += '<div class="file-preview-icon"><i class="bi ' + getFileIcon(f.fileName) + '"></i></div>';
            }
            var shortName = f.fileName.length > 18 ? f.fileName.substring(0, 15) + '...' : f.fileName;
            html += '<div class="file-preview-info"><span class="file-preview-name" title="' + escapeHtml(f.fileName) + '">' + escapeHtml(shortName) + '</span></div>';
            html += '</div>';
        });
        html += '</div></div>';
        return html;
    }

    // ============================
    // HISTORY
    // ============================
    function buildHistory(item) {
        var allFiles = item.allFiles || [];
        if (allFiles.length === 0) return [];

        var versions = {};
        allFiles.forEach(function (f) {
            if (!versions[f.version]) versions[f.version] = { customer: [], admin: [] };
            if (f.uploadedBy === 'Customer') versions[f.version].customer.push(f);
            else versions[f.version].admin.push(f);
        });

        var rounds = Object.keys(versions).map(Number).sort(function (a, b) { return b - a; });
        return rounds.map(function (v) {
            return { version: v, customer: versions[v].customer, admin: versions[v].admin };
        });
    }

    function renderHistory(history, item) {
        var html = '<div class="portal-history">';
        history.forEach(function (round, roundIdx) {
            var hasActive = round.customer.some(function (f) { return f.isActive; }) || round.admin.some(function (f) { return f.isActive; });
            var cRejected = round.customer.find(function (f) { return f.rejectionReason; });
            // Past round with admin files but no longer active = customer rejected that design
            var wasDesignRejected = !hasActive && round.admin.length > 0 && !round.admin.some(function (f) { return f.isActive; });

            // Round status
            var roundBadge = '';
            var roundCls = 'past';
            if (hasActive) { roundBadge = '<span class="badge bg-primary bg-opacity-10 text-primary">Current</span>'; roundCls = 'current'; }
            else if (cRejected) { roundBadge = '<span class="badge bg-danger bg-opacity-10 text-danger">Print Rejected</span>'; roundCls = 'rejected'; }
            else if (wasDesignRejected) { roundBadge = '<span class="badge bg-warning bg-opacity-10 text-warning">Changes Requested</span>'; roundCls = 'revised'; }
            else { roundBadge = '<span class="badge bg-light text-muted">Completed</span>'; }

            html += '<div class="portal-history-round ' + roundCls + '">';
            html += '<div class="portal-history-dot"></div>';
            html += '<div class="portal-history-content">';
            html += '<div class="d-flex align-items-center gap-2 mb-2"><strong class="small">Round ' + round.version + '</strong>' + roundBadge + '</div>';

            // Print rejection reason (from file level)
            if (cRejected && cRejected.rejectionReason) {
                html += '<div class="portal-history-rejection"><i class="bi bi-building me-1"></i><strong>Team:</strong> ' + escapeHtml(cRejected.rejectionReason) + '</div>';
            }

            // Customer design rejection reason (from item level)
            if (wasDesignRejected && item.rejectionReason) {
                html += '<div class="portal-history-rejection" style="border-left-color:#f59e0b;background:#fffbeb;color:#92400e"><i class="bi bi-person me-1"></i><strong>You:</strong> ' + escapeHtml(item.rejectionReason) + '</div>';
            }

            // Files
            if (round.customer.length > 0) {
                html += '<div class="mb-2"><span class="text-muted small fw-medium"><i class="bi bi-person me-1"></i>Your upload</span>';
                html += '<div class="portal-history-files">';
                round.customer.forEach(function (f) {
                    html += renderHistoryFile(f);
                });
                html += '</div></div>';
            }
            if (round.admin.length > 0) {
                html += '<div><span class="text-muted small fw-medium"><i class="bi bi-building me-1"></i>Design from team</span>';
                html += '<div class="portal-history-files">';
                round.admin.forEach(function (f) {
                    html += renderHistoryFile(f);
                });
                html += '</div></div>';
            }

            html += '</div></div>';
        });
        html += '</div>';
        return html;
    }

    function renderHistoryFile(f) {
        var isImg = isImageUrl(f.fileName);
        var html = '<div class="portal-history-file">';
        html += '<a href="' + f.previewUrl + '" target="_blank" class="text-decoration-none">';
        if (isImg) {
            html += '<img src="' + f.previewUrl + '" alt="' + escapeHtml(f.fileName) + '" />';
        } else {
            html += '<div class="portal-history-file-icon"><i class="bi ' + getFileIcon(f.fileName) + '"></i></div>';
        }
        html += '</a>';
        html += '<span class="small">' + escapeHtml(f.fileName.length > 12 ? f.fileName.substring(0, 10) + '...' : f.fileName) + '</span>';
        html += '<a href="' + f.previewUrl + '" download="' + escapeHtml(f.fileName) + '" class="portal-history-download"><i class="bi bi-download"></i></a>';
        html += '</div>';
        return html;
    }

    // ============================
    // ACTION BUTTONS
    // ============================
    function renderActionButtons(data) {
        var html = '';
        var hasUploadable = data.items.some(function (i) { return i.status === 0 || i.status === 2; });
        var hasApprovable = data.items.some(function (i) { return i.status === 5; });

        if (hasUploadable) {
            html += '<button class="btn btn-primary btn-lg me-2" id="btn-submit-files" disabled><i class="bi bi-upload me-1"></i>Submit Files for Review</button>';
        }
        if (hasApprovable) {
            html += '<button class="btn btn-success btn-lg" id="btn-submit-decisions" disabled><i class="bi bi-check-all me-1"></i>Submit Decisions</button>';
        }
        $('#action-buttons').html(html);

        // Re-evaluate button states after render
        updateDecisionButton();
        updateSubmitButton();
    }

    // ============================
    // HELPERS
    // ============================
    function isImageUrl(name) { return /\.(jpe?g|png|gif|bmp|webp)$/i.test(name); }

    function getFileIcon(name) {
        var ext = (name || '').split('.').pop().toLowerCase();
        return { pdf:'bi-file-earmark-pdf text-danger', psd:'bi-file-earmark-richtext text-purple', ai:'bi-file-earmark-richtext text-warning', tif:'bi-file-earmark-image text-info', tiff:'bi-file-earmark-image text-info' }[ext] || 'bi-file-earmark text-secondary';
    }

    function isImageFile(file) { return /\.(jpe?g|png|gif|bmp|webp|tiff?)$/i.test(file.name); }

    // ============================
    // EVENTS
    // ============================

    // Open file in new tab (portal current files)
    $(document).on('click', '.portal-file-open', function (e) {
        if ($(e.target).closest('.file-card-actions').length) return;
        window.open($(this).data('url'), '_blank');
    });
    $(document).on('click', '.btn-download-file', function (e) { e.stopPropagation(); });

    // Upload area
    $(document).on('click', '.upload-area', function (e) {
        if ($(e.target).hasClass('portal-file-input')) return;
        $(this).find('.portal-file-input')[0].click();
    });
    $(document).on('dragover', '.upload-area', function (e) { e.preventDefault(); $(this).addClass('dragover'); });
    $(document).on('dragleave', '.upload-area', function () { $(this).removeClass('dragover'); });
    $(document).on('drop', '.upload-area', function (e) {
        e.preventDefault(); $(this).removeClass('dragover');
        addFiles($(this).data('design-id'), e.originalEvent.dataTransfer.files);
    });
    $(document).on('change', '.portal-file-input', function () {
        addFiles($(this).data('design-id'), this.files);
        $(this).val('');
    });

    function addFiles(designId, files) {
        if (!fileSelections[designId]) fileSelections[designId] = [];
        for (var i = 0; i < files.length; i++) fileSelections[designId].push(files[i]);
        renderFilePreview(designId);
        updateSubmitButton();
    }

    function renderFilePreview(designId) {
        var $list = $('.file-preview-list[data-design-id="' + designId + '"]');
        var files = fileSelections[designId] || [];
        if (previewUrls[designId]) previewUrls[designId].forEach(function (u) { URL.revokeObjectURL(u); });
        previewUrls[designId] = [];
        if (files.length === 0) { $list.html(''); return; }

        var html = '<div class="file-preview-grid">';
        files.forEach(function (f, idx) {
            html += '<div class="file-preview-card">';
            html += '<button type="button" class="file-preview-remove remove-file" data-design-id="' + designId + '" data-idx="' + idx + '"><i class="bi bi-x-lg"></i></button>';
            if (isImageFile(f)) {
                var url = URL.createObjectURL(f);
                previewUrls[designId].push(url);
                html += '<div class="file-preview-thumb"><img src="' + url + '" /></div>';
            } else {
                html += '<div class="file-preview-icon"><i class="bi ' + getFileIcon(f.name) + '"></i></div>';
            }
            var shortName = f.name.length > 18 ? f.name.substring(0, 15) + '...' : f.name;
            html += '<div class="file-preview-info"><span class="file-preview-name">' + escapeHtml(shortName) + '</span><span class="file-preview-size">' + formatFileSize(f.size) + '</span></div>';
            html += '</div>';
        });
        html += '</div>';
        $list.html(html);
    }

    $(document).on('click', '.remove-file', function (e) {
        e.stopPropagation();
        var designId = $(this).data('design-id'), idx = $(this).data('idx');
        fileSelections[designId].splice(idx, 1);
        renderFilePreview(designId);
        updateSubmitButton();
    });

    function updateSubmitButton() {
        var hasFiles = false;
        if (orderData) orderData.items.forEach(function (item) {
            if ((item.status === 0 || item.status === 2) && fileSelections[item.designRequestId] && fileSelections[item.designRequestId].length > 0) hasFiles = true;
        });
        $('#btn-submit-files').prop('disabled', !hasFiles);
    }

    // Approve / Reject
    $(document).on('click', '.btn-portal-approve', function () {
        decisions[$(this).data('id')] = { action: 'approve', reason: '' };
        updateDecisionButton();
        renderOrder(orderData); // re-render with decision state
    });
    $(document).on('click', '.btn-portal-reject', function () {
        decisions[$(this).data('id')] = { action: 'reject', reason: '' };
        updateDecisionButton();
        renderOrder(orderData);
    });
    $(document).on('input', '.portal-reason-text', function () {
        var id = $(this).closest('.portal-reject-reason').data('id');
        if (decisions[id]) decisions[id].reason = $(this).val();
    });

    function updateDecisionButton() {
        if (!orderData) return;
        var approvable = orderData.items.filter(function (i) { return i.status === 5; });
        var allDecided = approvable.length > 0 && approvable.every(function (i) { return decisions[i.designRequestId]; });
        $('#btn-submit-decisions').prop('disabled', !allDecided);
    }

    // Submit files (sequential)
    $(document).on('click', '#btn-submit-files', function () {
        var $btn = $(this).prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span>Uploading...');
        var uploadItems = [];
        Object.keys(fileSelections).forEach(function (designId) {
            var files = fileSelections[designId];
            if (!files || files.length === 0) return;
            var item = orderData.items.find(function (i) { return i.designRequestId === designId; });
            if (!item || (item.status !== 0 && item.status !== 2)) return;
            uploadItems.push({ token: item.approvalToken || token, files: files });
        });
        if (uploadItems.length === 0) { $btn.prop('disabled', false).html('<i class="bi bi-upload me-1"></i>Submit Files for Review'); return; }

        function uploadNext(idx) {
            if (idx >= uploadItems.length) {
                // All uploaded, now submit
                submitNext(0);
                return;
            }
            var ui = uploadItems[idx];
            var formData = new FormData();
            ui.files.forEach(function (f) { formData.append('files', f); });
            api.upload('/Portal/Upload?token=' + encodeURIComponent(ui.token), formData)
                .done(function () { uploadNext(idx + 1); })
                .fail(function () { $btn.prop('disabled', false).html('<i class="bi bi-upload me-1"></i>Submit Files for Review'); });
        }
        function submitNext(idx) {
            if (idx >= uploadItems.length) {
                toast.success('Files submitted for review');
                fileSelections = {};
                loadOrder();
                return;
            }
            api.post('/Portal/Submit?token=' + encodeURIComponent(uploadItems[idx].token))
                .done(function () { submitNext(idx + 1); })
                .fail(function () { $btn.prop('disabled', false).html('<i class="bi bi-upload me-1"></i>Submit Files for Review'); });
        }
        uploadNext(0);
    });

    // Submit decisions (sequential)
    $(document).on('click', '#btn-submit-decisions', function () {
        var $btn = $(this).prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span>Submitting...');
        var decKeys = Object.keys(decisions);

        // Validate
        for (var i = 0; i < decKeys.length; i++) {
            if (decisions[decKeys[i]].action === 'reject' && !decisions[decKeys[i]].reason.trim()) {
                toast.error('Please provide a reason for each rejection');
                $btn.prop('disabled', false).html('<i class="bi bi-check-all me-1"></i>Submit Decisions');
                return;
            }
        }

        function decNext(idx) {
            if (idx >= decKeys.length) {
                toast.success('Decisions submitted');
                decisions = {};
                loadOrder();
                return;
            }
            var id = decKeys[idx];
            var dec = decisions[id];
            var item = orderData.items.find(function (i) { return i.designRequestId === id; });
            if (!item) { decNext(idx + 1); return; }
            var t = item.approvalToken || token;
            var req = dec.action === 'approve'
                ? api.post('/Portal/Approve?token=' + encodeURIComponent(t))
                : api.post('/Portal/Reject?token=' + encodeURIComponent(t), { reason: dec.reason });
            req.done(function () { decNext(idx + 1); })
               .fail(function () { $btn.prop('disabled', false).html('<i class="bi bi-check-all me-1"></i>Submit Decisions'); });
        }
        decNext(0);
    });
});
