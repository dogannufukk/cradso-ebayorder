using EbayDesign.Domain.Common;

namespace EbayDesign.Domain.Events;

public class ShipmentCreatedEvent : DomainEvent
{
    public Guid ShipmentId { get; }
    public Guid OrderId { get; }
    public string TrackingNumber { get; }

    public ShipmentCreatedEvent(Guid shipmentId, Guid orderId, string trackingNumber)
    {
        ShipmentId = shipmentId;
        OrderId = orderId;
        TrackingNumber = trackingNumber;
    }
}
