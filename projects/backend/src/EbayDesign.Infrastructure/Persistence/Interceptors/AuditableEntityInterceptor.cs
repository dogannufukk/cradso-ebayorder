using System.Text.Json;
using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace EbayDesign.Infrastructure.Persistence.Interceptors;

public class AuditableEntityInterceptor : SaveChangesInterceptor
{
    private readonly ICurrentUserService _currentUserService;

    public AuditableEntityInterceptor(ICurrentUserService currentUserService)
    {
        _currentUserService = currentUserService;
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        var context = eventData.Context;
        if (context is null)
            return base.SavingChangesAsync(eventData, result, cancellationToken);

        var auditEntries = new List<AuditLog>();
        var username = _currentUserService.Username ?? "System";
        var now = DateTime.UtcNow;

        foreach (var entry in context.ChangeTracker.Entries())
        {
            // Skip AuditLog entities to avoid infinite loop
            if (entry.Entity is AuditLog)
                continue;

            if (entry.State is not (EntityState.Added or EntityState.Modified or EntityState.Deleted))
                continue;

            var entityName = entry.Entity.GetType().Name;
            var entityId = GetEntityId(entry);

            var auditLog = new AuditLog
            {
                EntityName = entityName,
                EntityId = entityId,
                Action = entry.State switch
                {
                    EntityState.Added => "Created",
                    EntityState.Modified => "Modified",
                    EntityState.Deleted => "Deleted",
                    _ => entry.State.ToString()
                },
                Changes = GetChangesJson(entry),
                PerformedBy = username,
                PerformedAt = now
            };

            auditEntries.Add(auditLog);
        }

        if (auditEntries.Count > 0)
        {
            context.Set<AuditLog>().AddRange(auditEntries);
        }

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private static string GetEntityId(Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry entry)
    {
        var idProperty = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "Id");
        if (idProperty?.CurrentValue is not null)
            return idProperty.CurrentValue.ToString()!;

        return string.Empty;
    }

    private static string GetChangesJson(Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry entry)
    {
        var serializerOptions = new JsonSerializerOptions
        {
            WriteIndented = false
        };

        switch (entry.State)
        {
            case EntityState.Added:
            {
                var values = new Dictionary<string, object?>();
                foreach (var property in entry.Properties)
                {
                    values[property.Metadata.Name] = property.CurrentValue;
                }
                return JsonSerializer.Serialize(values, serializerOptions);
            }

            case EntityState.Modified:
            {
                var changes = new Dictionary<string, object?>();
                foreach (var property in entry.Properties)
                {
                    if (!property.IsModified)
                        continue;

                    changes[property.Metadata.Name] = new
                    {
                        OldValue = property.OriginalValue,
                        NewValue = property.CurrentValue
                    };
                }
                return JsonSerializer.Serialize(changes, serializerOptions);
            }

            case EntityState.Deleted:
            {
                var entityId = GetEntityId(entry);
                return JsonSerializer.Serialize(new { Id = entityId }, serializerOptions);
            }

            default:
                return "{}";
        }
    }
}
