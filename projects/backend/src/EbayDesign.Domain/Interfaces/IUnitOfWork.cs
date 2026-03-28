namespace EbayDesign.Domain.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IOrderRepository Orders { get; }
    ICustomerRepository Customers { get; }
    IDesignRequestRepository DesignRequests { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
