using EbayDesign.Domain.Common;
using EbayDesign.Domain.Enums;

namespace EbayDesign.Domain.Events;

public class DesignRequestStatusChangedEvent : DomainEvent
{
    public Guid DesignRequestId { get; }
    public Guid OrderId { get; }
    public DesignRequestStatus OldStatus { get; }
    public DesignRequestStatus NewStatus { get; }

    public DesignRequestStatusChangedEvent(Guid designRequestId, Guid orderId,
        DesignRequestStatus oldStatus, DesignRequestStatus newStatus)
    {
        DesignRequestId = designRequestId;
        OrderId = orderId;
        OldStatus = oldStatus;
        NewStatus = newStatus;
    }
}
