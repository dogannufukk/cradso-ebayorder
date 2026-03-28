using EbayDesign.Domain.Entities;

namespace EbayDesign.Domain.Interfaces;

public interface ICustomerRepository : IRepository<Customer>
{
    Task<Customer?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<(List<Customer> Items, int TotalCount)> GetPaginatedAsync(
        int page, int pageSize, string? search = null,
        CancellationToken cancellationToken = default);
}
