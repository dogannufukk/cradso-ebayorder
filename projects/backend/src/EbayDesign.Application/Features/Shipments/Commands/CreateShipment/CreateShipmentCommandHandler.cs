using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Entities;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Shipments.Commands.CreateShipment;

public class CreateShipmentCommandHandler : IRequestHandler<CreateShipmentCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly IEmailService _emailService;

    public CreateShipmentCommandHandler(IApplicationDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
    }

    public async Task<Guid> Handle(CreateShipmentCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken)
            ?? throw new InvalidOperationException($"Order '{request.OrderId}' not found.");

        if (order.Status != OrderStatus.InProduction)
            throw new InvalidOperationException($"Order must be in InProduction status. Current: '{order.Status}'.");

        var existingShipment = await _context.Shipments
            .AnyAsync(s => s.OrderId == request.OrderId, cancellationToken);
        if (existingShipment)
            throw new InvalidOperationException("A shipment already exists for this order.");

        if (string.IsNullOrWhiteSpace(request.TrackingNumber))
            throw new InvalidOperationException("Tracking number is required.");

        var shipment = Shipment.Create(order.Id, request.TrackingNumber.Trim(), request.DeliveryType);
        _context.Shipments.Add(shipment);

        order.TransitionTo(OrderStatus.Shipped);

        await _context.SaveChangesAsync(cancellationToken);

        // Queue shipment notification email
        var customer = order.Customer;
        if (!string.IsNullOrWhiteSpace(customer.Email))
        {
            var trackingUrl = $"http://www.royalmail.com/portal/rm/track?trackNumber={request.TrackingNumber.Trim()}";
            var items = order.Items.Select(i => new { sku = i.SKU, quantity = i.Quantity }).ToList();

            await _emailService.QueueAsync(
                "ShipmentNotification",
                new
                {
                    customer_name = customer.CustomerName,
                    order_no = order.EbayOrderNo,
                    tracking_number = request.TrackingNumber.Trim(),
                    carrier = "Royal Mail",
                    tracking_url = trackingUrl,
                    item_count = items.Count,
                    items = items
                },
                customer.Email,
                $"Your Order Has Been Shipped - #{order.EbayOrderNo}",
                "Order",
                order.Id.ToString(),
                cancellationToken);
        }

        return shipment.Id;
    }
}
