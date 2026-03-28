using EbayDesign.Domain.Common;

namespace EbayDesign.Domain.Events;

public class DesignRejectedEvent : DomainEvent
{
    public Guid DesignRequestId { get; }
    public Guid OrderId { get; }
    public string? Reason { get; }

    public DesignRejectedEvent(Guid designRequestId, Guid orderId, string? reason)
    {
        DesignRequestId = designRequestId;
        OrderId = orderId;
        Reason = reason;
    }
}
