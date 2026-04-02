// ============================================================
// CRADSO - Reusable DataGrid Component
// ============================================================
// Usage:
//   var grid = new DataGrid('#container', {
//     url: '/Order/List',
//     columns: [ { key: 'name', header: 'Name', sortable: true, filterable: true, filterType: 'text', render: fn } ],
//     rowKey: 'id',
//     onRowClick: function(row) { ... },
//     defaultPageSize: 20,
//     defaultSortBy: 'createdDate',
//     defaultSortDir: 'desc'
//   });

function DataGrid(selector, opts) {
    var self = this;
    self.$el = $(selector);
    self.opts = opts;
    self.syncUrl = opts.syncUrl !== false; // default true
    self.loading = false;
    self.data = null;

    // Read state from URL or use defaults
    var urlParams = new URLSearchParams(window.location.search);
    self.page = parseInt(urlParams.get('page')) || 1;
    self.pageSize = parseInt(urlParams.get('pageSize')) || opts.defaultPageSize || 20;
    self.sortBy = urlParams.get('sortBy') || opts.defaultSortBy || '';
    self.sortDir = urlParams.get('sortDir') || opts.defaultSortDir || 'desc';

    // Read filters from URL, merge with initialFilters
    self.filters = $.extend({}, opts.initialFilters || {});
    if (self.syncUrl) {
        var filterKeys = (opts.columns || []).filter(function (c) { return c.filterable; }).map(function (c) { return c.key; });
        filterKeys.forEach(function (key) {
            var val = urlParams.get(key);
            if (val !== null && val !== '') self.filters[key] = val;
        });
    }

    self.render();
    self.load();
}

DataGrid.prototype.updateUrl = function () {
    if (!this.syncUrl) return;
    var params = new URLSearchParams();
    if (this.page > 1) params.set('page', this.page);
    if (this.pageSize !== (this.opts.defaultPageSize || 20)) params.set('pageSize', this.pageSize);
    if (this.sortBy && this.sortBy !== (this.opts.defaultSortBy || '')) params.set('sortBy', this.sortBy);
    if (this.sortBy && this.sortDir !== (this.opts.defaultSortDir || 'desc')) params.set('sortDir', this.sortDir);
    var self = this;
    $.each(this.filters, function (k, v) {
        if (v !== '' && v !== null && v !== undefined) params.set(k, v);
    });
    var qs = params.toString();
    var newUrl = window.location.pathname + (qs ? '?' + qs : '');
    window.history.replaceState(null, '', newUrl);
};

DataGrid.prototype.render = function () {
    var self = this;
    var html = '<div class="card">';
    html += '<div class="card-body p-0">';
    html += '<div class="table-responsive">';
    html += '<table class="table table-hover datagrid-table mb-0">';

    // Header row
    html += '<thead><tr>';
    self.opts.columns.forEach(function (col) {
        var style = col.width ? ' style="width:' + col.width + 'px"' : '';
        var cls = col.sortable ? ' class="sortable" data-sort="' + col.key + '"' : '';
        var sortIcon = '';
        if (col.sortable && self.sortBy === col.key) {
            sortIcon = self.sortDir === 'asc' ? ' <i class="bi bi-sort-up"></i>' : ' <i class="bi bi-sort-down"></i>';
        }
        html += '<th' + cls + style + '>' + col.header + sortIcon + '</th>';
    });
    html += '</tr>';

    // Filter row
    var hasFilter = self.opts.columns.some(function (c) { return c.filterable; });
    if (hasFilter) {
        html += '<tr class="datagrid-filter">';
        self.opts.columns.forEach(function (col) {
            html += '<th>';
            if (col.filterable) {
                if (col.filterType === 'select' && col.filterOptions) {
                    html += '<select class="form-select form-select-sm" data-filter="' + col.key + '">';
                    html += '<option value="">All</option>';
                    col.filterOptions.forEach(function (opt) {
                        var sel = self.filters[col.key] == opt.value ? ' selected' : '';
                        html += '<option value="' + opt.value + '"' + sel + '>' + opt.label + '</option>';
                    });
                    html += '</select>';
                } else {
                    var val = self.filters[col.key] || '';
                    html += '<input type="text" class="form-control form-control-sm" data-filter="' + col.key + '" placeholder="Filter..." value="' + escapeHtml(val) + '" />';
                }
            }
            html += '</th>';
        });
        html += '</tr>';
    }
    html += '</thead>';
    html += '<tbody id="datagrid-body"><tr><td colspan="' + self.opts.columns.length + '" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div> Loading...</td></tr></tbody>';
    html += '</table></div>';

    // Pagination
    html += '<div class="d-flex justify-content-between align-items-center p-3 border-top" id="datagrid-footer">';
    html += '<div id="datagrid-info" class="text-muted small"></div>';
    html += '<div class="d-flex align-items-center gap-2">';
    html += '<select id="datagrid-pagesize" class="form-select form-select-sm" style="width:auto">';
    [10, 25, 50, 100].forEach(function (s) {
        var sel = s === self.pageSize ? ' selected' : '';
        html += '<option value="' + s + '"' + sel + '>' + s + ' / page</option>';
    });
    html += '</select>';
    html += '<nav><ul class="pagination pagination-sm mb-0 datagrid-pagination" id="datagrid-pages"></ul></nav>';
    html += '</div></div>';
    html += '</div>';

    self.$el.html(html);

    // Bind events
    self.$el.on('click', 'th.sortable', function () {
        var key = $(this).data('sort');
        if (self.sortBy === key) {
            self.sortDir = self.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            self.sortBy = key;
            self.sortDir = 'asc';
        }
        self.page = 1;
        self.render();
        self.load();
    });

    self.$el.on('input', '.datagrid-filter input', debounce(function () {
        var key = $(this).data('filter');
        self.filters[key] = $(this).val();
        self.page = 1;
        self.load();
    }, 400));

    self.$el.on('change', '.datagrid-filter select', function () {
        var key = $(this).data('filter');
        self.filters[key] = $(this).val();
        self.page = 1;
        self.load();
    });

    self.$el.on('change', '#datagrid-pagesize', function () {
        self.pageSize = parseInt($(this).val());
        self.page = 1;
        self.load();
    });

    self.$el.on('click', '.datagrid-pagination .page-link', function (e) {
        e.preventDefault();
        var p = $(this).data('page');
        if (p && p !== self.page) {
            self.page = p;
            self.load();
        }
    });

    if (self.opts.onRowClick) {
        self.$el.on('click', '#datagrid-body tr[data-id]', function () {
            var id = $(this).data('id');
            var row = self.data.items.find(function (r) { return r[self.opts.rowKey] === id; });
            if (row) self.opts.onRowClick(row);
        });
    }
};

DataGrid.prototype.load = function () {
    var self = this;
    if (self.loading) return;
    self.loading = true;
    self.updateUrl();

    var params = {
        page: self.page,
        pageSize: self.pageSize
    };
    if (self.sortBy) {
        params.sortBy = self.sortBy;
        params.sortDirection = self.sortDir;
    }
    $.each(self.filters, function (k, v) {
        if (v !== '' && v !== null && v !== undefined) params[k] = v;
    });

    api.get(self.opts.url + '?' + $.param(params)).done(function (data) {
        self.data = data;
        self.renderBody(data);
        self.renderPagination(data);
    }).always(function () {
        self.loading = false;
    });
};

DataGrid.prototype.renderBody = function (data) {
    var self = this;
    var $body = self.$el.find('#datagrid-body');

    if (!data.items || data.items.length === 0) {
        $body.html('<tr><td colspan="' + self.opts.columns.length + '" class="text-center py-4 text-muted">No records found</td></tr>');
        return;
    }

    var html = '';
    data.items.forEach(function (row) {
        var rowId = row[self.opts.rowKey];
        html += '<tr data-id="' + rowId + '">';
        self.opts.columns.forEach(function (col) {
            var val = row[col.key];
            var content = col.render ? col.render(val, row) : escapeHtml(String(val != null ? val : ''));
            html += '<td>' + content + '</td>';
        });
        html += '</tr>';
    });
    $body.html(html);
};

DataGrid.prototype.renderPagination = function (data) {
    var self = this;
    var $info = self.$el.find('#datagrid-info');
    var $pages = self.$el.find('#datagrid-pages');

    var start = (data.pageNumber - 1) * self.pageSize + 1;
    var end = Math.min(data.pageNumber * self.pageSize, data.totalCount);
    $info.text(data.totalCount > 0 ? 'Showing ' + start + '-' + end + ' of ' + data.totalCount : 'No records');

    var html = '';
    html += '<li class="page-item ' + (!data.hasPreviousPage ? 'disabled' : '') + '"><a class="page-link" data-page="1"><i class="bi bi-chevron-double-left"></i></a></li>';
    html += '<li class="page-item ' + (!data.hasPreviousPage ? 'disabled' : '') + '"><a class="page-link" data-page="' + (data.pageNumber - 1) + '"><i class="bi bi-chevron-left"></i></a></li>';

    var startPage = Math.max(1, data.pageNumber - 2);
    var endPage = Math.min(data.totalPages, data.pageNumber + 2);
    for (var i = startPage; i <= endPage; i++) {
        html += '<li class="page-item ' + (i === data.pageNumber ? 'active' : '') + '"><a class="page-link" data-page="' + i + '">' + i + '</a></li>';
    }

    html += '<li class="page-item ' + (!data.hasNextPage ? 'disabled' : '') + '"><a class="page-link" data-page="' + (data.pageNumber + 1) + '"><i class="bi bi-chevron-right"></i></a></li>';
    html += '<li class="page-item ' + (!data.hasNextPage ? 'disabled' : '') + '"><a class="page-link" data-page="' + data.totalPages + '"><i class="bi bi-chevron-double-right"></i></a></li>';

    $pages.html(html);
};

DataGrid.prototype.refresh = function () {
    this.load();
};
