using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using EbayDesign.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EbayDesign.Application.Features.Designs.EventHandlers;

/// <summary>
/// When a design request transitions to PrintApproved, check if ALL design requests
/// for the order are PrintApproved (or beyond). If so, auto-transition the order to InDesign.
/// Also transitions each PrintApproved design request to InDesign status.
/// </summary>
public class AllPrintApprovedEventHandler : INotificationHandler<DesignRequestStatusChangedEvent>
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<AllPrintApprovedEventHandler> _logger;

    public AllPrintApprovedEventHandler(IApplicationDbContext context, ILogger<AllPrintApprovedEventHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task Handle(DesignRequestStatusChangedEvent notification, CancellationToken cancellationToken)
    {
        // Only care about transitions to PrintApproved
        if (notification.NewStatus != DesignRequestStatus.PrintApproved)
            return;

        var allDesignRequests = await _context.DesignRequests
            .Include(dr => dr.Files)
            .Where(dr => dr.OrderId == notification.OrderId)
            .ToListAsync(cancellationToken);

        // Check if all design requests are PrintApproved or further in the positive flow
        var allPrintApproved = allDesignRequests.All(dr =>
            dr.Status == DesignRequestStatus.PrintApproved
            || dr.Status == DesignRequestStatus.InDesign
            || dr.Status == DesignRequestStatus.WaitingApproval
            || dr.Status == DesignRequestStatus.Approved);

        if (!allPrintApproved || allDesignRequests.Count == 0)
            return;

        // Transition each PrintApproved design request to InDesign
        // and deactivate customer-uploaded files (design phase starts fresh)
        foreach (var dr in allDesignRequests.Where(dr => dr.Status == DesignRequestStatus.PrintApproved))
        {
            // Deactivate customer files — admin will upload new design files
            foreach (var file in dr.Files.Where(f => f.IsActive && f.UploadedBy == UploadedBy.Customer))
                file.IsActive = false;

            dr.TransitionTo(DesignRequestStatus.InDesign);
        }

        // Transition order to InDesign
        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.Id == notification.OrderId, cancellationToken);

        if (order != null && order.Status == OrderStatus.WaitingDesign)
        {
            order.TransitionTo(OrderStatus.InDesign);
            _logger.LogInformation(
                "All print reviews approved for order {OrderId}. Order transitioned to InDesign.",
                notification.OrderId);
        }
    }
}
