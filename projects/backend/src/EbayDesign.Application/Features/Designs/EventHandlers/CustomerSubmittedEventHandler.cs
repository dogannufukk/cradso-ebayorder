using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using EbayDesign.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EbayDesign.Application.Features.Designs.EventHandlers;

/// <summary>
/// When a customer submits files (CustomerUploaded), check if ALL items for the order
/// have been submitted. If so, send a single admin notification email.
/// </summary>
public class CustomerSubmittedEventHandler : INotificationHandler<DesignRequestStatusChangedEvent>
{
    private readonly IApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly ILogger<CustomerSubmittedEventHandler> _logger;

    public CustomerSubmittedEventHandler(
        IApplicationDbContext context,
        IEmailService emailService,
        ILogger<CustomerSubmittedEventHandler> logger)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task Handle(DesignRequestStatusChangedEvent notification, CancellationToken cancellationToken)
    {
        if (notification.NewStatus != DesignRequestStatus.CustomerUploaded)
            return;

        if (notification.OldStatus != DesignRequestStatus.WaitingUpload
            && notification.OldStatus != DesignRequestStatus.PrintRejected)
            return;

        try
        {
            // Check if ALL design requests for this order are now CustomerUploaded or beyond
            var allDesignRequests = await _context.DesignRequests
                .Include(dr => dr.OrderItem)
                .Where(dr => dr.OrderId == notification.OrderId)
                .ToListAsync(cancellationToken);

            var hasWaiting = allDesignRequests.Any(dr =>
                dr.Status == DesignRequestStatus.WaitingUpload);

            // If there are still items waiting for upload, don't send email yet
            if (hasWaiting) return;

            var submittedItems = allDesignRequests
                .Where(dr => dr.Status == DesignRequestStatus.CustomerUploaded)
                .ToList();

            if (submittedItems.Count == 0) return;

            var order = await _context.Orders
                .Include(o => o.Customer)
                .FirstOrDefaultAsync(o => o.Id == notification.OrderId, cancellationToken);

            if (order is null) return;

            var items = submittedItems.Select(dr => new
            {
                sku = dr.OrderItem?.SKU ?? "N/A"
            }).ToList();

            var model = new
            {
                customer_name = order.Customer.CustomerName,
                order_no = order.EbayOrderNo,
                item_count = submittedItems.Count
            };

            await _emailService.QueueAsync(
                "CustomerSubmittedForReview",
                model,
                "admin@ebaydesign.co.uk",
                $"Design Files Submitted for Review - Order {order.EbayOrderNo} ({submittedItems.Count} items)",
                "Order",
                order.Id.ToString(),
                cancellationToken);

            _logger.LogInformation(
                "Admin notification queued: all {Count} items submitted for order {OrderId}.",
                submittedItems.Count, order.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to queue customer submitted email for {DesignRequestId}.",
                notification.DesignRequestId);
        }
    }
}
