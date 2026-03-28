using EbayDesign.Domain.Entities;

namespace EbayDesign.Domain.Interfaces;

public interface IOrderRepository : IRepository<Order>
{
    Task<Order?> GetByEbayOrderNoAsync(string ebayOrderNo, CancellationToken cancellationToken = default);
    Task<Order?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default);
    Task<(List<Order> Items, int TotalCount)> GetPaginatedAsync(
        int page, int pageSize, string? statusFilter = null, string? search = null,
        CancellationToken cancellationToken = default);
}
