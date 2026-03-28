using EbayDesign.Domain.Events;
using MediatR;
using Microsoft.Extensions.Logging;

namespace EbayDesign.Application.Features.Orders.EventHandlers;

public class OrderCreatedEmailHandler : INotificationHandler<OrderCreatedEvent>
{
    private readonly ILogger<OrderCreatedEmailHandler> _logger;

    public OrderCreatedEmailHandler(ILogger<OrderCreatedEmailHandler> logger)
    {
        _logger = logger;
    }

    public Task Handle(OrderCreatedEvent notification, CancellationToken cancellationToken)
    {
        // Email sending will be implemented in future phases.
        // For now, we log the event for auditing purposes.
        _logger.LogInformation("Order created event received for OrderId {OrderId}. Email notification deferred to future phase.",
            notification.OrderId);

        return Task.CompletedTask;
    }
}
