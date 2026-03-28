using EbayDesign.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Shipments.Queries.GetShipmentByOrder;

public class GetShipmentByOrderQueryHandler : IRequestHandler<GetShipmentByOrderQuery, ShipmentDto?>
{
    private readonly IApplicationDbContext _context;

    public GetShipmentByOrderQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ShipmentDto?> Handle(GetShipmentByOrderQuery request, CancellationToken cancellationToken)
    {
        var shipment = await _context.Shipments
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.OrderId == request.OrderId, cancellationToken);

        if (shipment is null) return null;

        return new ShipmentDto(
            shipment.Id,
            shipment.OrderId,
            shipment.TrackingNumber,
            shipment.Carrier,
            shipment.DeliveryType,
            shipment.ShipmentDate,
            shipment.EstimatedDelivery
        );
    }
}
