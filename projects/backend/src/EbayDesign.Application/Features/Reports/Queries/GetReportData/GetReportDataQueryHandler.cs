using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Reports.Queries.GetReportData;

public class GetReportDataQueryHandler : IRequestHandler<GetReportDataQuery, ReportDataDto>
{
    private readonly IApplicationDbContext _context;

    public GetReportDataQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ReportDataDto> Handle(GetReportDataQuery request, CancellationToken ct)
    {
        var now = DateTime.UtcNow;

        // ========== TAB 1: Order Status Overview ==========
        var orders = await _context.Orders.AsNoTracking().ToListAsync(ct);
        var ordersByStatus = Enum.GetValues<OrderStatus>()
            .Select(s => new StatusCount(s.ToString(), orders.Count(o => o.Status == s)))
            .ToList();

        var last30 = Enumerable.Range(0, 30).Select(i => now.Date.AddDays(-29 + i)).ToList();
        var ordersOverTime = last30.Select(d => new DateCount(
            d.ToString("dd MMM"),
            orders.Count(o => o.CreatedDate.Date == d)
        )).ToList();

        var shipments = await _context.Shipments.AsNoTracking().ToListAsync(ct);
        var shippedOrders = orders.Where(o => o.Status == OrderStatus.Shipped).ToList();
        double? avgCompletionDays = null;
        if (shippedOrders.Any())
        {
            var completionDays = shippedOrders
                .Select(o =>
                {
                    var shipment = shipments.FirstOrDefault(s => s.OrderId == o.Id);
                    if (shipment == null) return (double?)null;
                    return (shipment.ShipmentDate - o.CreatedDate).TotalDays;
                })
                .Where(d => d.HasValue)
                .Select(d => d!.Value)
                .ToList();
            if (completionDays.Any()) avgCompletionDays = Math.Round(completionDays.Average(), 1);
        }

        // ========== TAB 2: Design Workflow Performance ==========
        var designs = await _context.DesignRequests.AsNoTracking().ToListAsync(ct);
        var designFiles = await _context.DesignFiles.AsNoTracking().ToListAsync(ct);

        var designsByStatus = Enum.GetValues<DesignRequestStatus>()
            .Select(s => new StatusCount(s.ToString(), designs.Count(d => d.Status == s)))
            .ToList();

        // Print rejection rate
        var printReviewed = designs.Count(d =>
            d.Status != DesignRequestStatus.WaitingUpload);
        var printRejected = designFiles.Count(f => f.RejectionReason != null && f.UploadedBy == UploadedBy.Customer);
        double printRejectionRate = printReviewed > 0 ? Math.Round((double)printRejected / printReviewed * 100, 1) : 0;

        // Customer rejection rate
        var customerReviewed = designs.Count(d =>
            d.Status == DesignRequestStatus.Approved || d.Status == DesignRequestStatus.Rejected);
        var customerRejected = designs.Count(d => d.Status == DesignRequestStatus.Rejected);
        double customerRejectionRate = customerReviewed > 0 ? Math.Round((double)customerRejected / customerReviewed * 100, 1) : 0;

        // Average rounds (max version per design)
        double? avgRounds = null;
        var approvedDesigns = designs.Where(d => d.Status == DesignRequestStatus.Approved).ToList();
        if (approvedDesigns.Any())
        {
            var rounds = approvedDesigns.Select(d =>
            {
                var maxVersion = designFiles.Where(f => f.DesignRequestId == d.Id).Select(f => f.Version).DefaultIfEmpty(1).Max();
                return maxVersion;
            }).ToList();
            avgRounds = Math.Round(rounds.Average(), 1);
        }

        // Avg times (estimate from CreatedDate and ModifiedDate)
        double? avgPrintReviewHours = null;
        double? avgCustomerApprovalHours = null;

        // ========== TAB 3: Customer Activity ==========
        var customers = await _context.Customers.AsNoTracking().ToListAsync(ct);
        var topCustomers = customers
            .Select(c =>
            {
                var custOrders = orders.Where(o => o.CustomerId == c.Id).ToList();
                var custDesigns = designs.Where(d => custOrders.Any(o => o.Id == d.OrderId)).ToList();
                return new CustomerActivity(
                    c.CustomerName ?? c.EbayUsername ?? "Unknown",
                    c.Email,
                    custOrders.Count,
                    custDesigns.Count(d => d.Status == DesignRequestStatus.Approved),
                    custDesigns.Count(d => d.Status == DesignRequestStatus.Rejected)
                );
            })
            .OrderByDescending(c => c.OrderCount)
            .Take(10)
            .ToList();

        double avgOrdersPerCustomer = customers.Any() ? Math.Round((double)orders.Count / customers.Count, 1) : 0;

        // ========== TAB 4: Email Delivery ==========
        var emails = await _context.EmailLogs.AsNoTracking().ToListAsync(ct);
        var emailsByStatus = Enum.GetValues<EmailStatus>()
            .Select(s => new StatusCount(s.ToString(), emails.Count(e => e.Status == s)))
            .ToList();
        var emailsByTemplate = emails
            .GroupBy(e => e.TemplateName)
            .Select(g => new TemplateCount(g.Key, g.Count()))
            .OrderByDescending(t => t.Count)
            .ToList();
        double emailFailureRate = emails.Any()
            ? Math.Round((double)emails.Count(e => e.Status == EmailStatus.Failed) / emails.Count * 100, 1) : 0;

        // ========== TAB 5: Timeline ==========
        var monthsBack = 6;
        var monthlyOrders = Enumerable.Range(0, monthsBack)
            .Select(i =>
            {
                var month = new DateTime(now.Year, now.Month, 1).AddMonths(-monthsBack + 1 + i);
                var monthEnd = month.AddMonths(1);
                return new MonthlyTrend(
                    month.ToString("MMM yyyy"),
                    orders.Count(o => o.CreatedDate >= month && o.CreatedDate < monthEnd),
                    orders.Count(o => o.Status == OrderStatus.Shipped &&
                        o.ModifiedDate.HasValue && o.ModifiedDate.Value >= month && o.ModifiedDate.Value < monthEnd)
                );
            })
            .ToList();

        // ========== TAB 6: Production & Shipping ==========
        var inProduction = orders
            .Where(o => o.Status == OrderStatus.InProduction || o.Status == OrderStatus.Approved)
            .Select(o =>
            {
                var customer = customers.FirstOrDefault(c => c.Id == o.CustomerId);
                var days = (now - (o.ModifiedDate ?? o.CreatedDate)).Days;
                return new ProductionItem(o.Id, o.EbayOrderNo, customer?.CustomerName ?? customer?.EbayUsername ?? "Unknown", days);
            })
            .OrderByDescending(p => p.DaysSinceApproved)
            .ToList();

        var thisMonth = new DateTime(now.Year, now.Month, 1);
        int shippedThisMonth = shipments.Count(s => s.ShipmentDate >= thisMonth);

        double? avgProductionDays = null;
        var completedShipments = shippedOrders
            .Select(o =>
            {
                var s = shipments.FirstOrDefault(sh => sh.OrderId == o.Id);
                if (s == null || !o.ModifiedDate.HasValue) return (double?)null;
                return (s.ShipmentDate - o.CreatedDate).TotalDays;
            })
            .Where(d => d.HasValue)
            .Select(d => d!.Value)
            .ToList();
        if (completedShipments.Any()) avgProductionDays = Math.Round(completedShipments.Average(), 1);

        return new ReportDataDto(
            ordersByStatus, ordersOverTime, avgCompletionDays, orders.Count,
            avgPrintReviewHours, avgCustomerApprovalHours, printRejectionRate, customerRejectionRate, avgRounds, designsByStatus, designs.Count,
            topCustomers, customers.Count, avgOrdersPerCustomer,
            emailsByStatus, emailsByTemplate, emailFailureRate, emails.Count,
            monthlyOrders,
            inProduction, avgProductionDays, shippedThisMonth
        );
    }
}
