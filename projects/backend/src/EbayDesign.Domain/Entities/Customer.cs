using EbayDesign.Domain.Common;

namespace EbayDesign.Domain.Entities;

public class Customer : BaseEntity
{
    public string? CustomerName { get; set; }
    public string? EbayUsername { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? County { get; set; }
    public string? PostCode { get; set; }
    public string Country { get; set; } = "United Kingdom";

    public ICollection<Order> Orders { get; set; } = new List<Order>();
}
