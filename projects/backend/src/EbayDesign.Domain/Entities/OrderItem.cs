using EbayDesign.Domain.Common;

namespace EbayDesign.Domain.Entities;

public class OrderItem : BaseEntity
{
    public Guid OrderId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
    public string? Description { get; set; }

    public Order Order { get; set; } = null!;
    public DesignRequest? DesignRequest { get; set; }
}
