using EbayDesign.Domain.Enums;
using MediatR;

namespace EbayDesign.Application.Features.Shipments.Queries.GetShipmentByOrder;

public record GetShipmentByOrderQuery(Guid OrderId) : IRequest<ShipmentDto?>;

public record ShipmentDto(
    Guid Id,
    Guid OrderId,
    string TrackingNumber,
    string Carrier,
    DeliveryType DeliveryType,
    DateTime ShipmentDate,
    DateTime? EstimatedDelivery
);
