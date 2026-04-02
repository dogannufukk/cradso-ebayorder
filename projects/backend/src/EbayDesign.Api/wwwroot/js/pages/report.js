$(function () {
    var charts = {};
    var COLORS = ['#3b82f6','#f59e0b','#10b981','#8b5cf6','#ef4444','#06b6d4','#f97316','#ec4899'];
    var STATUS_COLORS = {
        'Draft':'#9ca3af','WaitingDesign':'#f59e0b','InDesign':'#3b82f6','WaitingApproval':'#8b5cf6',
        'Approved':'#10b981','Rejected':'#ef4444','InProduction':'#06b6d4','Shipped':'#22c55e',
        'WaitingUpload':'#9ca3af','CustomerUploaded':'#3b82f6','PrintRejected':'#ef4444',
        'PrintApproved':'#10b981','Pending':'#f59e0b','Sending':'#3b82f6','Sent':'#10b981','Failed':'#ef4444'
    };

    api.get('/Report/Data').done(function (d) {
        $('#report-loading').addClass('d-none');
        $('#reportContent').removeClass('d-none');
        renderAll(d);
    });

    function kpi(icon, value, label, color) {
        return '<div class="col-md-3 col-6"><div class="dash-summary-card">' +
            '<div class="dash-summary-icon" style="background:' + (color || '#eff6ff') + '"><i class="bi ' + icon + '"></i></div>' +
            '<div><div class="dash-summary-count">' + (value ?? '-') + '</div><div class="dash-summary-label">' + label + '</div></div>' +
            '</div></div>';
    }

    function renderAll(d) {
        // ========== TAB 1 ==========
        $('#order-kpis').html(
            kpi('bi-bag', d.totalOrders, 'Total Orders', '#eff6ff') +
            kpi('bi-clock', d.avgCompletionDays ? d.avgCompletionDays + ' days' : '-', 'Avg Completion', '#f0fdf4') +
            kpi('bi-truck', d.ordersByStatus.find(function(s){return s.label==='Shipped'})?.count || 0, 'Shipped', '#ecfdf5') +
            kpi('bi-exclamation-triangle', d.ordersByStatus.find(function(s){return s.label==='Rejected'})?.count || 0, 'Rejected', '#fef2f2')
        );

        var statusData = d.ordersByStatus.filter(function(s){ return s.count > 0; });
        charts.orderStatus = new Chart($('#chart-order-status'), {
            type: 'doughnut',
            data: {
                labels: statusData.map(function(s){ return s.label.replace(/([A-Z])/g,' $1').trim(); }),
                datasets: [{ data: statusData.map(function(s){ return s.count; }),
                    backgroundColor: statusData.map(function(s){ return STATUS_COLORS[s.label] || '#9ca3af'; }),
                    borderWidth: 0 }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true } } } }
        });

        charts.orderTrend = new Chart($('#chart-order-trend'), {
            type: 'bar',
            data: {
                labels: d.ordersOverTime.map(function(o){ return o.date; }),
                datasets: [{ label: 'Orders', data: d.ordersOverTime.map(function(o){ return o.count; }),
                    backgroundColor: '#3b82f6', borderRadius: 4, maxBarThickness: 20 }]
            },
            options: { responsive: true, plugins: { legend: { display: false } },
                scales: { x: { grid: { display: false }, ticks: { maxRotation: 45, font: { size: 10 } } }, y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });

        // ========== TAB 2 ==========
        $('#design-kpis').html(
            kpi('bi-palette', d.totalDesigns, 'Total Designs', '#eff6ff') +
            kpi('bi-x-circle', d.printRejectionRate + '%', 'Print Rejection', '#fef2f2') +
            kpi('bi-person-x', d.customerRejectionRate + '%', 'Customer Rejection', '#fff7ed') +
            kpi('bi-arrow-repeat', d.avgRoundsToApproval ? d.avgRoundsToApproval + ' rounds' : '-', 'Avg Rounds', '#faf5ff')
        );

        var dsData = d.designsByStatus.filter(function(s){ return s.count > 0; });
        charts.designStatus = new Chart($('#chart-design-status'), {
            type: 'doughnut',
            data: {
                labels: dsData.map(function(s){ return s.label.replace(/([A-Z])/g,' $1').trim(); }),
                datasets: [{ data: dsData.map(function(s){ return s.count; }),
                    backgroundColor: dsData.map(function(s){ return STATUS_COLORS[s.label] || '#9ca3af'; }),
                    borderWidth: 0 }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true } } } }
        });

        charts.rejection = new Chart($('#chart-rejection'), {
            type: 'bar',
            data: {
                labels: ['Print Rejection', 'Customer Rejection'],
                datasets: [{ data: [d.printRejectionRate, d.customerRejectionRate],
                    backgroundColor: ['#f97316', '#ef4444'], borderRadius: 6, maxBarThickness: 60 }]
            },
            options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true, max: 100, ticks: { callback: function(v){ return v+'%'; } } } } }
        });

        // ========== TAB 4 ==========
        var sentCount = d.emailsByStatus.find(function(s){return s.label==='Sent'})?.count || 0;
        var failedCount = d.emailsByStatus.find(function(s){return s.label==='Failed'})?.count || 0;
        $('#email-kpis').html(
            kpi('bi-envelope', d.totalEmails, 'Total Emails', '#eff6ff') +
            kpi('bi-check-circle', sentCount, 'Sent', '#ecfdf5') +
            kpi('bi-x-circle', failedCount, 'Failed', '#fef2f2') +
            kpi('bi-graph-down', d.emailFailureRate + '%', 'Failure Rate', '#fff7ed')
        );

        var esData = d.emailsByStatus.filter(function(s){ return s.count > 0; });
        charts.emailStatus = new Chart($('#chart-email-status'), {
            type: 'doughnut',
            data: {
                labels: esData.map(function(s){ return s.label; }),
                datasets: [{ data: esData.map(function(s){ return s.count; }),
                    backgroundColor: esData.map(function(s){ return STATUS_COLORS[s.label] || '#9ca3af'; }),
                    borderWidth: 0 }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true } } } }
        });

        charts.emailTemplate = new Chart($('#chart-email-template'), {
            type: 'bar',
            data: {
                labels: d.emailsByTemplate.map(function(t){ return t.template; }),
                datasets: [{ label: 'Emails', data: d.emailsByTemplate.map(function(t){ return t.count; }),
                    backgroundColor: COLORS, borderRadius: 4, maxBarThickness: 40 }]
            },
            options: { responsive: true, plugins: { legend: { display: false } },
                scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });

        // ========== TAB 5 ==========
        charts.timeline = new Chart($('#chart-timeline'), {
            type: 'line',
            data: {
                labels: d.monthlyOrders.map(function(m){ return m.month; }),
                datasets: [
                    { label: 'Created', data: d.monthlyOrders.map(function(m){ return m.created; }),
                        borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.3, pointRadius: 5 },
                    { label: 'Shipped', data: d.monthlyOrders.map(function(m){ return m.completed; }),
                        borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.3, pointRadius: 5 }
                ]
            },
            options: { responsive: true, plugins: { legend: { labels: { usePointStyle: true } } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });

        // ========== TAB 6 ==========
        $('#production-kpis').html(
            kpi('bi-gear', d.inProductionOrders.length, 'Awaiting', '#ecfeff') +
            kpi('bi-clock-history', d.avgProductionDays ? d.avgProductionDays + ' days' : '-', 'Avg Production Time', '#eff6ff') +
            kpi('bi-truck', d.shippedThisMonth, 'Shipped This Month', '#ecfdf5')
        );

        var phtml = '<table class="table table-hover mb-0"><thead><tr><th>Order</th><th>Customer</th><th class="text-end">Days Waiting</th></tr></thead><tbody>';
        if (d.inProductionOrders.length === 0) {
            phtml += '<tr><td colspan="3" class="text-center text-muted py-4">No orders in production</td></tr>';
        } else {
            d.inProductionOrders.forEach(function(p) {
                var urgency = p.daysSinceApproved > 7 ? 'text-danger fw-bold' : p.daysSinceApproved > 3 ? 'text-warning' : '';
                phtml += '<tr style="cursor:pointer" onclick="window.location=\'/Order/Detail/' + p.id + '\'">';
                phtml += '<td><a href="/Order/Detail/' + p.id + '" class="text-decoration-none fw-medium">' + escapeHtml(p.ebayOrderNo) + '</a></td>';
                phtml += '<td>' + escapeHtml(p.customerName) + '</td>';
                phtml += '<td class="text-end ' + urgency + '">' + p.daysSinceApproved + ' day' + (p.daysSinceApproved !== 1 ? 's' : '') + '</td></tr>';
            });
        }
        phtml += '</tbody></table>';
        $('#production-table').html(phtml);
    }
});
