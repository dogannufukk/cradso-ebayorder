// ============================================================
// CRADSO - Shared JavaScript Utilities
// ============================================================

// --- API Helper ---
var api = {
    _request: function (method, url, data, contentType) {
        var opts = {
            type: method,
            url: url,
            dataType: 'json',
            // Accept empty 200 responses as success
            converters: { 'text json': function(text) { return text ? JSON.parse(text) : {}; } }
        };
        if (data !== undefined && data !== null) {
            if (contentType === false) {
                // FormData - don't set content type
                opts.data = data;
                opts.processData = false;
                opts.contentType = false;
            } else {
                opts.data = JSON.stringify(data);
                opts.contentType = 'application/json';
            }
        }
        return $.ajax(opts).fail(function (xhr) {
            if (xhr.status === 401) {
                window.location.href = '/Account/Login';
                return;
            }
            var msg = 'An error occurred';
            if (xhr.responseJSON) {
                if (xhr.responseJSON.title) msg = xhr.responseJSON.title;
                if (xhr.responseJSON.errors && xhr.responseJSON.errors.length > 0) {
                    msg = xhr.responseJSON.errors.join(', ');
                }
            }
            toast.error(msg);
        });
    },
    get: function (url) { return this._request('GET', url); },
    post: function (url, data) { return this._request('POST', url, data); },
    put: function (url, data) { return this._request('PUT', url, data); },
    patch: function (url, data) { return this._request('PATCH', url, data); },
    del: function (url) { return this._request('DELETE', url); },
    upload: function (url, formData) { return this._request('POST', url, formData, false); }
};

// --- Toast Notifications ---
var toast = {
    success: function (msg) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: msg, showConfirmButton: false, timer: 3000, timerProgressBar: true });
    },
    error: function (msg) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: msg, showConfirmButton: false, timer: 5000, timerProgressBar: true });
    }
};

// --- Confirm Dialog ---
function confirmDialog(msg, callback) {
    Swal.fire({
        title: 'Are you sure?',
        text: msg,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, proceed'
    }).then(function (result) {
        if (result.isConfirmed && callback) callback();
    });
}

// --- Status Maps ---
var ORDER_STATUS = {
    0: { label: 'Draft', css: 'badge-draft' },
    1: { label: 'Waiting Design', css: 'badge-waitingdesign' },
    2: { label: 'In Design', css: 'badge-indesign' },
    3: { label: 'Waiting Approval', css: 'badge-waitingapproval' },
    4: { label: 'Approved', css: 'badge-approved' },
    5: { label: 'Rejected', css: 'badge-rejected' },
    6: { label: 'In Production', css: 'badge-inproduction' },
    7: { label: 'Shipped', css: 'badge-shipped' }
};

var DESIGN_STATUS = {
    0: { label: 'Waiting Upload', css: 'badge-waitingupload' },
    1: { label: 'Customer Uploaded', css: 'badge-customeruploaded' },
    2: { label: 'Print Rejected', css: 'badge-printrejected' },
    3: { label: 'Print Approved', css: 'badge-printapproved' },
    4: { label: 'In Design', css: 'badge-indesign' },
    5: { label: 'Waiting Approval', css: 'badge-waitingapproval' },
    6: { label: 'Approved', css: 'badge-approved' },
    7: { label: 'Rejected', css: 'badge-rejected' }
};

var DESIGN_TYPE = {
    0: 'Customer Upload',
    1: 'Request From Us',
    2: 'Template'
};

var EMAIL_STATUS = {
    0: { label: 'Pending', css: 'badge-pending' },
    1: { label: 'Sending', css: 'badge-sending' },
    2: { label: 'Sent', css: 'badge-sent' },
    3: { label: 'Failed', css: 'badge-failed' }
};

// --- Utility Functions ---
function formatDate(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function renderBadge(status, map) {
    var info = map[status] || { label: 'Unknown', css: '' };
    return '<span class="badge ' + info.css + '">' + info.label + '</span>';
}

function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}

function debounce(fn, ms) {
    var timer;
    return function () {
        var ctx = this, args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
}

function escapeHtml(str) {
    if (!str) return '';
    return $('<div>').text(str).html();
}
