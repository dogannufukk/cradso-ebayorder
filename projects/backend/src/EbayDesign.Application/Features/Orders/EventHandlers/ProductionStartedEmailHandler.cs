using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using EbayDesign.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EbayDesign.Application.Features.Orders.EventHandlers;

public class ProductionStartedEmailHandler : INotificationHandler<OrderStatusChangedEvent>
{
    private readonly IApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly ILogger<ProductionStartedEmailHandler> _logger;

    public ProductionStartedEmailHandler(
        IApplicationDbContext context,
        IEmailService emailService,
        ILogger<ProductionStartedEmailHandler> logger)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task Handle(OrderStatusChangedEvent notification, CancellationToken cancellationToken)
    {
        if (notification.OldStatus != OrderStatus.Approved || notification.NewStatus != OrderStatus.InProduction)
            return;

        try
        {
            var order = await _context.Orders
                .Include(o => o.Customer)
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == notification.OrderId, cancellationToken);

            if (order is null) return;
            var customer = order.Customer;
            if (string.IsNullOrWhiteSpace(customer.Email)) return;

            var items = order.Items.Select(i => new
            {
                sku = i.SKU,
                quantity = i.Quantity,
                description = i.Description ?? ""
            }).ToList();

            await _emailService.QueueAsync(
                "ProductionStarted",
                new
                {
                    customer_name = customer.CustomerName,
                    order_no = order.EbayOrderNo,
                    item_count = items.Count,
                    items = items
                },
                customer.Email,
                $"Production Started - Order #{order.EbayOrderNo}",
                "Order",
                order.Id.ToString(),
                cancellationToken);

            _logger.LogInformation("Production started email queued for order {OrderId}.", order.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to queue production started email for order {OrderId}.", notification.OrderId);
        }
    }
}
