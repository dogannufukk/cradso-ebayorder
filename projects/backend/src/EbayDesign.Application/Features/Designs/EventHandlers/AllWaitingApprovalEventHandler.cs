using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using EbayDesign.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EbayDesign.Application.Features.Designs.EventHandlers;

/// <summary>
/// When a design request transitions to WaitingApproval, check if ALL design requests
/// for the order are WaitingApproval (or beyond). If so, auto-transition the order to WaitingApproval.
/// </summary>
public class AllWaitingApprovalEventHandler : INotificationHandler<DesignRequestStatusChangedEvent>
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<AllWaitingApprovalEventHandler> _logger;

    public AllWaitingApprovalEventHandler(IApplicationDbContext context, ILogger<AllWaitingApprovalEventHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task Handle(DesignRequestStatusChangedEvent notification, CancellationToken cancellationToken)
    {
        if (notification.NewStatus != DesignRequestStatus.WaitingApproval)
            return;

        var allDesignRequests = await _context.DesignRequests
            .Where(dr => dr.OrderId == notification.OrderId)
            .ToListAsync(cancellationToken);

        var allWaitingOrBeyond = allDesignRequests.All(dr =>
            dr.Status == DesignRequestStatus.WaitingApproval
            || dr.Status == DesignRequestStatus.Approved);

        if (!allWaitingOrBeyond || allDesignRequests.Count == 0)
            return;

        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.Id == notification.OrderId, cancellationToken);

        if (order != null && order.Status == OrderStatus.InDesign)
        {
            order.TransitionTo(OrderStatus.WaitingApproval);
            _logger.LogInformation(
                "All designs submitted for approval for order {OrderId}. Order transitioned to WaitingApproval.",
                notification.OrderId);
        }
    }
}
