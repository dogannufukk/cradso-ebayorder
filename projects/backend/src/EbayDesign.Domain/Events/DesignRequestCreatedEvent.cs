using EbayDesign.Domain.Common;
using EbayDesign.Domain.Enums;

namespace EbayDesign.Domain.Events;

public class DesignRequestCreatedEvent : DomainEvent
{
    public Guid DesignRequestId { get; }
    public Guid OrderId { get; }
    public DesignRequestType Type { get; }

    public DesignRequestCreatedEvent(Guid designRequestId, Guid orderId, DesignRequestType type)
    {
        DesignRequestId = designRequestId;
        OrderId = orderId;
        Type = type;
    }
}
