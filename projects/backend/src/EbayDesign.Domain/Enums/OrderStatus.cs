namespace EbayDesign.Domain.Enums;

public enum OrderStatus
{
    Draft = 0,
    WaitingDesign = 1,
    InDesign = 2,
    WaitingApproval = 3,
    Approved = 4,
    Rejected = 5,
    InProduction = 6,
    Shipped = 7
}
