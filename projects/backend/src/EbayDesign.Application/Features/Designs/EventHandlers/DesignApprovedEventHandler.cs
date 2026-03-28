using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using EbayDesign.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EbayDesign.Application.Features.Designs.EventHandlers;

/// <summary>
/// When a design is approved, check if ALL designs for the order are approved.
/// If so, auto-transition order to Approved.
/// No email is sent here — production start email is sent when admin clicks "Start Production".
/// </summary>
public class DesignApprovedEventHandler : INotificationHandler<DesignApprovedEvent>
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<DesignApprovedEventHandler> _logger;

    public DesignApprovedEventHandler(
        IApplicationDbContext context,
        ILogger<DesignApprovedEventHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task Handle(DesignApprovedEvent notification, CancellationToken cancellationToken)
    {
        var allDesignRequests = await _context.DesignRequests
            .Where(dr => dr.OrderId == notification.OrderId)
            .ToListAsync(cancellationToken);

        var allApproved = allDesignRequests.All(dr => dr.Status == DesignRequestStatus.Approved);

        if (allApproved && allDesignRequests.Count > 0)
        {
            var order = await _context.Orders
                .FirstOrDefaultAsync(o => o.Id == notification.OrderId, cancellationToken);

            if (order != null && order.Status == OrderStatus.WaitingApproval)
            {
                order.TransitionTo(OrderStatus.Approved);
                _logger.LogInformation("All designs approved for order {OrderId}. Order auto-transitioned to Approved.",
                    notification.OrderId);
            }
        }
    }
}
