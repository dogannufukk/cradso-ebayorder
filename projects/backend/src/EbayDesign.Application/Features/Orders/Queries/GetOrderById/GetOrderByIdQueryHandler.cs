using EbayDesign.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Orders.Queries.GetOrderById;

public class GetOrderByIdQueryHandler : IRequestHandler<GetOrderByIdQuery, OrderDetailDto?>
{
    private readonly IApplicationDbContext _context;

    public GetOrderByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<OrderDetailDto?> Handle(GetOrderByIdQuery request,
        CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .AsNoTracking()
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .Include(o => o.DesignRequests).ThenInclude(dr => dr.Files)
            .Include(o => o.Shipment)
            .FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken);

        if (order is null) return null;

        return new OrderDetailDto(
            order.Id,
            order.EbayOrderNo,
            order.Status,
            order.Notes,
            order.CreatedDate,
            new CustomerSummaryDto(order.Customer.Id, order.Customer.CustomerName, order.Customer.Email),
            order.Items.Select(i => new OrderItemDetailDto(i.Id, i.SKU, i.EbayProductCode, i.Quantity, i.Description)).ToList(),
            order.DesignRequests.Select(dr => new DesignRequestSummaryDto(
                dr.Id, dr.OrderItemId, dr.Type, dr.Status, dr.Files.Count)).ToList(),
            order.Shipment is null ? null : new ShipmentSummaryDto(
                order.Shipment.Id, order.Shipment.TrackingNumber, order.Shipment.Carrier,
                order.Shipment.DeliveryType, order.Shipment.ShipmentDate)
        );
    }
}
