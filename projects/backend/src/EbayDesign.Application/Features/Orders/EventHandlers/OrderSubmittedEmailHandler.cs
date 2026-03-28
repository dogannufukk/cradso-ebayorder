using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using EbayDesign.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EbayDesign.Application.Features.Orders.EventHandlers;

public class OrderSubmittedEmailHandler : INotificationHandler<OrderStatusChangedEvent>
{
    private readonly IApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly ILogger<OrderSubmittedEmailHandler> _logger;

    public OrderSubmittedEmailHandler(
        IApplicationDbContext context,
        IEmailService emailService,
        ILogger<OrderSubmittedEmailHandler> logger)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task Handle(OrderStatusChangedEvent notification, CancellationToken cancellationToken)
    {
        if (notification.OldStatus != OrderStatus.Draft || notification.NewStatus != OrderStatus.WaitingDesign)
            return;

        var order = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .Include(o => o.DesignRequests)
            .FirstOrDefaultAsync(o => o.Id == notification.OrderId, cancellationToken);

        if (order is null) return;

        var customer = order.Customer;
        if (string.IsNullOrWhiteSpace(customer.Email)) return;

        var baseUrl = "http://localhost:5177";

        var customerUploadRequests = order.DesignRequests
            .Where(dr => dr.Type == DesignRequestType.CustomerUpload)
            .ToList();

        if (customerUploadRequests.Count == 0) return;

        // Use the first design request's token as the portal entry point
        // (portal shows all items for the order via this token)
        var firstToken = customerUploadRequests.First().ApprovalToken;
        var portalUrl = $"{baseUrl}/portal/design/{firstToken}";

        // Build items list for the template
        var items = customerUploadRequests.Select(dr =>
        {
            var orderItem = order.Items.FirstOrDefault(i => i.Id == dr.OrderItemId);
            return new
            {
                sku = orderItem?.SKU ?? "N/A",
                quantity = orderItem?.Quantity ?? 1,
                description = orderItem?.Description ?? ""
            };
        }).ToList();

        var model = new
        {
            customer_name = customer.CustomerName,
            order_no = order.EbayOrderNo,
            item_count = customerUploadRequests.Count,
            items = items,
            portal_url = portalUrl
        };

        await _emailService.QueueAsync(
            "DesignUploadRequest",
            model,
            customer.Email,
            $"Design Upload Required - Order {order.EbayOrderNo}",
            "Order",
            order.Id.ToString(),
            cancellationToken);

        _logger.LogInformation(
            "Single consolidated upload request email queued for order {OrderId} with {ItemCount} items.",
            order.Id, customerUploadRequests.Count);
    }
}
