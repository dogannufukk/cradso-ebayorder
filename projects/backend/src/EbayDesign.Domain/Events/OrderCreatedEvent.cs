using EbayDesign.Domain.Common;

namespace EbayDesign.Domain.Events;

public class OrderCreatedEvent : DomainEvent
{
    public Guid OrderId { get; }

    public OrderCreatedEvent(Guid orderId)
    {
        OrderId = orderId;
    }
}
