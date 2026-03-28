using EbayDesign.Domain.Enums;
using EbayDesign.Domain.Events;
using MediatR;
using Microsoft.Extensions.Logging;

namespace EbayDesign.Application.Features.Designs.EventHandlers;

public class DesignRequestCreatedEmailHandler : INotificationHandler<DesignRequestCreatedEvent>
{
    private readonly ILogger<DesignRequestCreatedEmailHandler> _logger;

    public DesignRequestCreatedEmailHandler(ILogger<DesignRequestCreatedEmailHandler> logger)
    {
        _logger = logger;
    }

    public Task Handle(DesignRequestCreatedEvent notification, CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Design request {DesignRequestId} created for order {OrderId}, type {Type}. Email will be sent on order submit.",
            notification.DesignRequestId, notification.OrderId, notification.Type);
        return Task.CompletedTask;
    }
}
