using EbayDesign.Application.Common.Helpers;
using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using EbayDesign.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EbayDesign.Application.Features.Designs.EventHandlers;

/// <summary>
/// When a design is approved, check if ALL designs for the order are approved.
/// If so, auto-transition order to Approved and notify admins.
/// </summary>
public class DesignApprovedEventHandler : INotificationHandler<DesignApprovedEvent>
{
    private readonly IApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IAppSettings _appSettings;
    private readonly ILogger<DesignApprovedEventHandler> _logger;

    public DesignApprovedEventHandler(
        IApplicationDbContext context,
        IEmailService emailService,
        IAppSettings appSettings,
        ILogger<DesignApprovedEventHandler> logger)
    {
        _context = context;
        _emailService = emailService;
        _appSettings = appSettings;
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
                .Include(o => o.Customer)
                .FirstOrDefaultAsync(o => o.Id == notification.OrderId, cancellationToken);

            if (order != null && order.Status == OrderStatus.WaitingApproval)
            {
                order.TransitionTo(OrderStatus.Approved);
                _logger.LogInformation("All designs approved for order {OrderId}. Order auto-transitioned to Approved.",
                    notification.OrderId);

                // Notify admins
                await AdminNotificationHelper.SendAdminNotificationAsync(
                    _context, _emailService, _appSettings,
                    order.Id.ToString(), order.EbayOrderNo, order.Customer.CustomerName ?? "",
                    "All Designs Approved",
                    $"Customer has approved all {allDesignRequests.Count} design(s). Order is ready for production.",
                    allDesignRequests.Count,
                    cancellationToken: cancellationToken);
            }
        }
    }
}
