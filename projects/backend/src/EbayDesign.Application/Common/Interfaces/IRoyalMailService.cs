namespace EbayDesign.Application.Common.Interfaces;

public interface IRoyalMailService
{
    Task<CreateShipmentResult> CreateShipmentAsync(ShipmentRequest request, CancellationToken cancellationToken = default);
    Task<TrackingResult> GetTrackingAsync(string trackingNumber, CancellationToken cancellationToken = default);
}

public record ShipmentRequest(
    string OrderId,
    string CustomerName,
    string AddressLine1,
    string AddressLine2,
    string City,
    string PostCode,
    string Country,
    int DeliveryType
);

public record CreateShipmentResult(string TrackingNumber, DateTime EstimatedDelivery);

public record TrackingResult(string TrackingNumber, string Status, DateTime? DeliveredAt);
