using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using EbayDesign.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EbayDesign.Application.Features.Designs.EventHandlers;

/// <summary>
/// Handles print decision events. Sends a SINGLE consolidated email per order
/// when ALL items have been reviewed (all PrintApproved or mix of approved/rejected).
/// Does NOT send per-item emails.
/// </summary>
public class PrintDecisionEventHandler : INotificationHandler<DesignRequestStatusChangedEvent>
{
    private readonly IApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly ILogger<PrintDecisionEventHandler> _logger;

    public PrintDecisionEventHandler(
        IApplicationDbContext context,
        IEmailService emailService,
        ILogger<PrintDecisionEventHandler> logger)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task Handle(DesignRequestStatusChangedEvent notification, CancellationToken cancellationToken)
    {
        if (notification.NewStatus != DesignRequestStatus.PrintRejected
            && notification.NewStatus != DesignRequestStatus.PrintApproved)
            return;

        // Check if ALL items have been reviewed (no more CustomerUploaded)
        var allDesignRequests = await _context.DesignRequests
            .Include(dr => dr.OrderItem)
            .Where(dr => dr.OrderId == notification.OrderId)
            .ToListAsync(cancellationToken);

        var hasUnreviewed = allDesignRequests.Any(dr =>
            dr.Status == DesignRequestStatus.CustomerUploaded
            || dr.Status == DesignRequestStatus.WaitingUpload);

        // If there are still unreviewed items, wait until all are done
        if (hasUnreviewed) return;

        // All items reviewed — check if any were rejected
        var rejectedItems = allDesignRequests
            .Where(dr => dr.Status == DesignRequestStatus.PrintRejected)
            .ToList();

        if (rejectedItems.Count == 0)
        {
            // All approved — no email needed (AllPrintApprovedEventHandler handles the transition)
            return;
        }

        // Some items rejected — send consolidated rejection email to customer
        try
        {
            var order = await _context.Orders
                .Include(o => o.Customer)
                .FirstOrDefaultAsync(o => o.Id == notification.OrderId, cancellationToken);

            if (order is null) return;
            var customer = order.Customer;
            if (string.IsNullOrWhiteSpace(customer.Email)) return;

            // Use first rejected item's token as portal entry
            var firstRejected = rejectedItems.First();
            var portalUrl = $"http://localhost:5177/portal/design/{firstRejected.ApprovalToken}";

            var items = rejectedItems.Select(dr => new
            {
                sku = dr.OrderItem?.SKU ?? "N/A",
                reason = dr.RejectionReason ?? "Not suitable for print"
            }).ToList();

            var model = new
            {
                customer_name = customer.CustomerName,
                order_no = order.EbayOrderNo,
                item_count = rejectedItems.Count,
                items = items,
                portal_url = portalUrl
            };

            await _emailService.QueueAsync(
                "PrintRejected",
                model,
                customer.Email,
                $"Action Required - Design Files Need Revision - Order {order.EbayOrderNo}",
                "Order",
                order.Id.ToString(),
                cancellationToken);

            _logger.LogInformation(
                "Consolidated print rejection email queued for order {OrderId} with {Count} rejected items.",
                order.Id, rejectedItems.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to queue print decision email for order.");
        }
    }
}
