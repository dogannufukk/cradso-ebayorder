using EbayDesign.Domain.Entities;

namespace EbayDesign.Domain.Interfaces;

public interface IDesignRequestRepository : IRepository<DesignRequest>
{
    Task<DesignRequest?> GetByTokenAsync(string token, CancellationToken cancellationToken = default);
    Task<List<DesignRequest>> GetByOrderIdAsync(Guid orderId, CancellationToken cancellationToken = default);
    Task<DesignRequest?> GetByIdWithFilesAsync(Guid id, CancellationToken cancellationToken = default);
}
