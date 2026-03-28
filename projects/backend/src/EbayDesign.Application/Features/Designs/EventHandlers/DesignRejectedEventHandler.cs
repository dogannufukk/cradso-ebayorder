using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using EbayDesign.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EbayDesign.Application.Features.Designs.EventHandlers;

/// <summary>
/// When a design is rejected, check if ALL items have been decided (no more WaitingApproval).
/// If any are rejected, transition order to Rejected and send admin notification.
/// </summary>
public class DesignRejectedEventHandler : INotificationHandler<DesignRejectedEvent>
{
    private readonly IApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly ILogger<DesignRejectedEventHandler> _logger;

    public DesignRejectedEventHandler(
        IApplicationDbContext context,
        IEmailService emailService,
        ILogger<DesignRejectedEventHandler> logger)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task Handle(DesignRejectedEvent notification, CancellationToken cancellationToken)
    {
        // Check if all items have been decided
        var allDesignRequests = await _context.DesignRequests
            .Include(dr => dr.OrderItem)
            .Where(dr => dr.OrderId == notification.OrderId)
            .ToListAsync(cancellationToken);

        var hasUndecided = allDesignRequests.Any(dr => dr.Status == DesignRequestStatus.WaitingApproval);
        if (hasUndecided) return; // Wait until all items are decided

        var rejectedItems = allDesignRequests.Where(dr => dr.Status == DesignRequestStatus.Rejected).ToList();
        if (rejectedItems.Count == 0) return;

        // Transition order to Rejected
        var order = await _context.Orders
            .Include(o => o.Customer)
            .FirstOrDefaultAsync(o => o.Id == notification.OrderId, cancellationToken);

        if (order != null && order.Status == OrderStatus.WaitingApproval)
        {
            order.TransitionTo(OrderStatus.Rejected);
            _logger.LogInformation("Design decisions submitted for order {OrderId}. {Count} item(s) rejected. Order transitioned to Rejected.",
                notification.OrderId, rejectedItems.Count);
        }

        // Send consolidated admin notification
        try
        {
            if (order is null) return;

            var items = rejectedItems.Select(dr => new
            {
                sku = dr.OrderItem?.SKU ?? "N/A",
                reason = dr.RejectionReason ?? "No reason provided"
            }).ToList();

            var model = new
            {
                customer_name = order.Customer.CustomerName,
                order_no = order.EbayOrderNo,
                item_count = rejectedItems.Count,
                items = items
            };

            await _emailService.QueueAsync(
                "DesignRejected",
                model,
                "admin@ebaydesign.co.uk",
                $"Customer Requested Design Changes - Order {order.EbayOrderNo} ({rejectedItems.Count} items)",
                "Order",
                order.Id.ToString(),
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to queue rejection email for order {OrderId}.", notification.OrderId);
        }
    }
}
