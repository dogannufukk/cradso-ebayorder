using MediatR;

namespace EbayDesign.Application.Features.Reports.Queries.GetReportData;

public record GetReportDataQuery : IRequest<ReportDataDto>;

public record ReportDataDto(
    // Tab 1: Order Status Overview
    List<StatusCount> OrdersByStatus,
    List<DateCount> OrdersOverTime,
    double? AvgCompletionDays,
    int TotalOrders,

    // Tab 2: Design Workflow Performance
    double? AvgPrintReviewHours,
    double? AvgCustomerApprovalHours,
    double PrintRejectionRate,
    double CustomerRejectionRate,
    double? AvgRoundsToApproval,
    List<StatusCount> DesignsByStatus,
    int TotalDesigns,

    // Tab 3: Customer Activity
    List<CustomerActivity> TopCustomers,
    int TotalCustomers,
    double AvgOrdersPerCustomer,

    // Tab 4: Email Delivery
    List<StatusCount> EmailsByStatus,
    List<TemplateCount> EmailsByTemplate,
    double EmailFailureRate,
    int TotalEmails,

    // Tab 5: Timeline
    List<MonthlyTrend> MonthlyOrders,

    // Tab 6: Production & Shipping
    List<ProductionItem> InProductionOrders,
    double? AvgProductionDays,
    int ShippedThisMonth
);

public record StatusCount(string Label, int Count);
public record DateCount(string Date, int Count);
public record CustomerActivity(string Name, string Email, int OrderCount, int ApprovedCount, int RejectedCount);
public record TemplateCount(string Template, int Count);
public record MonthlyTrend(string Month, int Created, int Completed);
public record ProductionItem(Guid Id, string EbayOrderNo, string CustomerName, int DaysSinceApproved);
