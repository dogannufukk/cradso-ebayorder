using EbayDesign.Domain.Common;
using EbayDesign.Domain.Enums;
using EbayDesign.Domain.Events;

namespace EbayDesign.Domain.Entities;

public class Order : BaseEntity
{
    public Guid CustomerId { get; set; }
    public string EbayOrderNo { get; set; } = string.Empty;
    public OrderStatus Status { get; set; } = OrderStatus.Draft;
    public string? Notes { get; set; }

    public Customer Customer { get; set; } = null!;
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
    public ICollection<DesignRequest> DesignRequests { get; set; } = new List<DesignRequest>();
    public Shipment? Shipment { get; set; }

    private static readonly Dictionary<(OrderStatus From, OrderStatus To), bool> _allowedTransitions = new()
    {
        { (OrderStatus.Draft, OrderStatus.WaitingDesign), true },
        { (OrderStatus.WaitingDesign, OrderStatus.InDesign), true },
        { (OrderStatus.InDesign, OrderStatus.WaitingApproval), true },
        { (OrderStatus.WaitingApproval, OrderStatus.Approved), true },
        { (OrderStatus.WaitingApproval, OrderStatus.Rejected), true },
        { (OrderStatus.Rejected, OrderStatus.InDesign), true },
        { (OrderStatus.Approved, OrderStatus.InProduction), true },
        { (OrderStatus.InProduction, OrderStatus.Shipped), true },
    };

    public void TransitionTo(OrderStatus newStatus)
    {
        if (!_allowedTransitions.ContainsKey((Status, newStatus)))
        {
            throw new InvalidOperationException(
                $"Cannot transition order from '{Status}' to '{newStatus}'.");
        }

        var oldStatus = Status;
        Status = newStatus;

        AddDomainEvent(new OrderStatusChangedEvent(Id, oldStatus, newStatus));

        if (newStatus == OrderStatus.Draft)
            AddDomainEvent(new OrderCreatedEvent(Id));
    }
}
