using MediatR;

namespace EbayDesign.Application.Features.Dashboard.Queries.GetDashboardSummary;

public record GetDashboardSummaryQuery : IRequest<DashboardSummaryDto>;

public record DashboardSummaryDto(
    int TotalOrders,
    int DraftOrders,
    int WaitingDesignOrders,
    int InDesignOrders,
    int WaitingApprovalOrders,
    int ApprovedOrders,
    int InProductionOrders,
    int ShippedOrders,
    int RejectedOrders,
    int TotalCustomers,
    int TotalDesignRequests,
    int PendingDesignRequests,
    List<RecentOrderDto> RecentOrders
);

public record RecentOrderDto(
    Guid Id,
    string EbayOrderNo,
    string CustomerName,
    int Status,
    DateTime CreatedDate
);
