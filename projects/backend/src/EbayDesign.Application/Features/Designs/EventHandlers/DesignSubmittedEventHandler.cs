using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using EbayDesign.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EbayDesign.Application.Features.Designs.EventHandlers;

/// <summary>
/// When designs are submitted for approval (InDesign → WaitingApproval),
/// waits until ALL items are WaitingApproval, then sends ONE consolidated email.
/// </summary>
public class DesignSubmittedEventHandler : INotificationHandler<DesignRequestStatusChangedEvent>
{
    private readonly IApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly ILogger<DesignSubmittedEventHandler> _logger;

    public DesignSubmittedEventHandler(
        IApplicationDbContext context,
        IEmailService emailService,
        ILogger<DesignSubmittedEventHandler> logger)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task Handle(DesignRequestStatusChangedEvent notification, CancellationToken cancellationToken)
    {
        if (notification.NewStatus != DesignRequestStatus.WaitingApproval)
            return;

        // Check if ALL design requests for this order are now WaitingApproval or beyond
        var allDesignRequests = await _context.DesignRequests
            .Include(dr => dr.OrderItem)
            .Where(dr => dr.OrderId == notification.OrderId)
            .ToListAsync(cancellationToken);

        var hasNotReady = allDesignRequests.Any(dr =>
            dr.Status != DesignRequestStatus.WaitingApproval
            && dr.Status != DesignRequestStatus.Approved);

        // Wait until all items are submitted
        if (hasNotReady) return;

        var waitingItems = allDesignRequests
            .Where(dr => dr.Status == DesignRequestStatus.WaitingApproval)
            .ToList();

        if (waitingItems.Count == 0) return;

        try
        {
            var order = await _context.Orders
                .Include(o => o.Customer)
                .FirstOrDefaultAsync(o => o.Id == notification.OrderId, cancellationToken);

            if (order is null) return;
            var customer = order.Customer;
            if (string.IsNullOrWhiteSpace(customer.Email)) return;

            // Use first item's token as portal entry
            var firstToken = waitingItems.First().ApprovalToken;
            var portalUrl = $"http://localhost:5177/portal/design/{firstToken}";

            var items = waitingItems.Select(dr => new
            {
                sku = dr.OrderItem?.SKU ?? "N/A",
                quantity = dr.OrderItem?.Quantity ?? 1,
                description = dr.OrderItem?.Description ?? ""
            }).ToList();

            var model = new
            {
                customer_name = customer.CustomerName,
                order_no = order.EbayOrderNo,
                item_count = waitingItems.Count,
                items = items,
                portal_url = portalUrl
            };

            await _emailService.QueueAsync(
                "DesignApprovalRequest",
                model,
                customer.Email,
                $"Your Designs Are Ready for Approval - Order {order.EbayOrderNo}",
                "Order",
                order.Id.ToString(),
                cancellationToken);

            _logger.LogInformation(
                "Consolidated design approval email queued for order {OrderId} with {Count} items.",
                order.Id, waitingItems.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to queue design approval email for order.");
        }
    }
}
