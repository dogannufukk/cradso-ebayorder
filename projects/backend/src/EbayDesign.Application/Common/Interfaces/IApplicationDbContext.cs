using EbayDesign.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Customer> Customers { get; }
    DbSet<Order> Orders { get; }
    DbSet<OrderItem> OrderItems { get; }
    DbSet<DesignRequest> DesignRequests { get; }
    DbSet<DesignFile> DesignFiles { get; }
    DbSet<Shipment> Shipments { get; }
    DbSet<AuditLog> AuditLogs { get; }
    DbSet<AdminUser> AdminUsers { get; }
    DbSet<EmailLog> EmailLogs { get; }
    DbSet<SystemSetting> SystemSettings { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
