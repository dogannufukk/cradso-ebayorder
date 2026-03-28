using EbayDesign.Application.Common.Interfaces;

namespace EbayDesign.Infrastructure.Services;

public class MockRoyalMailService : IRoyalMailService
{
    private static readonly Random _random = new();

    public Task<CreateShipmentResult> CreateShipmentAsync(ShipmentRequest request, CancellationToken cancellationToken = default)
    {
        var trackingNumber = $"RM{_random.Next(100000000, 999999999)}GB";

        var estimatedDays = request.DeliveryType == 1 ? 1 : 3;
        var estimatedDelivery = DateTime.UtcNow.AddDays(estimatedDays);

        return Task.FromResult(new CreateShipmentResult(trackingNumber, estimatedDelivery));
    }

    public Task<TrackingResult> GetTrackingAsync(string trackingNumber, CancellationToken cancellationToken = default)
    {
        var result = new TrackingResult(
            trackingNumber,
            "In Transit",
            DeliveredAt: null
        );

        return Task.FromResult(result);
    }
}
