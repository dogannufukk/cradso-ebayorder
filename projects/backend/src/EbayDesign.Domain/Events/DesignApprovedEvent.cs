using EbayDesign.Domain.Common;

namespace EbayDesign.Domain.Events;

public class DesignApprovedEvent : DomainEvent
{
    public Guid DesignRequestId { get; }
    public Guid OrderId { get; }

    public DesignApprovedEvent(Guid designRequestId, Guid orderId)
    {
        DesignRequestId = designRequestId;
        OrderId = orderId;
    }
}
