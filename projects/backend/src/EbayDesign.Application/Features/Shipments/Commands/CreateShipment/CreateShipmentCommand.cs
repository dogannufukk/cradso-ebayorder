using EbayDesign.Domain.Enums;
using MediatR;

namespace EbayDesign.Application.Features.Shipments.Commands.CreateShipment;

public record CreateShipmentCommand(
    Guid OrderId,
    string TrackingNumber,
    DeliveryType DeliveryType
) : IRequest<Guid>;
