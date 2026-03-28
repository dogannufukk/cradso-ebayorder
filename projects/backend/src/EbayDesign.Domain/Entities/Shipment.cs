using EbayDesign.Domain.Common;
using EbayDesign.Domain.Enums;
using EbayDesign.Domain.Events;

namespace EbayDesign.Domain.Entities;

public class Shipment : BaseEntity
{
    public Guid OrderId { get; set; }
    public string TrackingNumber { get; set; } = string.Empty;
    public string Carrier { get; set; } = "RoyalMail";
    public DeliveryType DeliveryType { get; set; }
    public DateTime ShipmentDate { get; set; }
    public DateTime? EstimatedDelivery { get; set; }

    public Order Order { get; set; } = null!;

    public static Shipment Create(Guid orderId, string trackingNumber, DeliveryType deliveryType)
    {
        var shipment = new Shipment
        {
            OrderId = orderId,
            TrackingNumber = trackingNumber,
            DeliveryType = deliveryType,
            ShipmentDate = DateTime.UtcNow
        };
        shipment.AddDomainEvent(new ShipmentCreatedEvent(shipment.Id, orderId, trackingNumber));
        return shipment;
    }
}
