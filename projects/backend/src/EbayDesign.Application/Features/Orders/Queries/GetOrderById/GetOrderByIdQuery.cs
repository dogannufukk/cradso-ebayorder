using EbayDesign.Domain.Enums;
using MediatR;

namespace EbayDesign.Application.Features.Orders.Queries.GetOrderById;

public record GetOrderByIdQuery(Guid Id) : IRequest<OrderDetailDto?>;

public record OrderDetailDto(
    Guid Id,
    string EbayOrderNo,
    OrderStatus Status,
    string? Notes,
    DateTime CreatedDate,
    CustomerSummaryDto Customer,
    List<OrderItemDetailDto> Items,
    List<DesignRequestSummaryDto> DesignRequests,
    ShipmentSummaryDto? Shipment
);

public record CustomerSummaryDto(Guid Id, string CustomerName, string Email);

public record OrderItemDetailDto(
    Guid Id, string SKU, string? EbayProductCode, int Quantity, string? Description
);

public record DesignRequestSummaryDto(
    Guid Id, Guid OrderItemId, DesignRequestType Type,
    DesignRequestStatus Status, int FileCount
);

public record ShipmentSummaryDto(
    Guid Id, string TrackingNumber, string Carrier,
    DeliveryType DeliveryType, DateTime ShipmentDate
);
