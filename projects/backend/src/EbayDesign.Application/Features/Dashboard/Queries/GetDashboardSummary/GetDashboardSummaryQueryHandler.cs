using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Dashboard.Queries.GetDashboardSummary;

public class GetDashboardSummaryQueryHandler : IRequestHandler<GetDashboardSummaryQuery, DashboardSummaryDto>
{
    private readonly IApplicationDbContext _context;

    public GetDashboardSummaryQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardSummaryDto> Handle(GetDashboardSummaryQuery request,
        CancellationToken cancellationToken)
    {
        var orders = _context.Orders.AsNoTracking();

        var totalOrders = await orders.CountAsync(cancellationToken);
        var draftOrders = await orders.CountAsync(o => o.Status == OrderStatus.Draft, cancellationToken);
        var waitingDesignOrders = await orders.CountAsync(o => o.Status == OrderStatus.WaitingDesign, cancellationToken);
        var inDesignOrders = await orders.CountAsync(o => o.Status == OrderStatus.InDesign, cancellationToken);
        var waitingApprovalOrders = await orders.CountAsync(o => o.Status == OrderStatus.WaitingApproval, cancellationToken);
        var approvedOrders = await orders.CountAsync(o => o.Status == OrderStatus.Approved, cancellationToken);
        var inProductionOrders = await orders.CountAsync(o => o.Status == OrderStatus.InProduction, cancellationToken);
        var shippedOrders = await orders.CountAsync(o => o.Status == OrderStatus.Shipped, cancellationToken);
        var rejectedOrders = await orders.CountAsync(o => o.Status == OrderStatus.Rejected, cancellationToken);

        var totalCustomers = await _context.Customers.AsNoTracking().CountAsync(cancellationToken);

        var designRequests = _context.DesignRequests.AsNoTracking();
        var totalDesignRequests = await designRequests.CountAsync(cancellationToken);
        var pendingDesignRequests = await designRequests.CountAsync(
            dr => dr.Status == DesignRequestStatus.WaitingUpload
                || dr.Status == DesignRequestStatus.InDesign
                || dr.Status == DesignRequestStatus.WaitingApproval,
            cancellationToken);

        var recentOrders = await orders
            .Include(o => o.Customer)
            .OrderByDescending(o => o.CreatedDate)
            .Take(10)
            .Select(o => new RecentOrderDto(
                o.Id,
                o.EbayOrderNo,
                o.Customer.CustomerName,
                (int)o.Status,
                o.CreatedDate
            ))
            .ToListAsync(cancellationToken);

        return new DashboardSummaryDto(
            totalOrders,
            draftOrders,
            waitingDesignOrders,
            inDesignOrders,
            waitingApprovalOrders,
            approvedOrders,
            inProductionOrders,
            shippedOrders,
            rejectedOrders,
            totalCustomers,
            totalDesignRequests,
            pendingDesignRequests,
            recentOrders
        );
    }
}
