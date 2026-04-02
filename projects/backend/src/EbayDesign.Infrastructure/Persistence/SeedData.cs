using EbayDesign.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace EbayDesign.Infrastructure.Persistence;

public static class SeedData
{
    public static async Task InitializeAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        await context.Database.MigrateAsync();

        if (!await context.AdminUsers.AnyAsync())
        {
            context.AdminUsers.Add(new AdminUser
            {
                Id = Guid.NewGuid(),
                Username = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                FullName = "System Administrator",
                IsActive = true,
                CreatedDate = DateTime.UtcNow
            });
            await context.SaveChangesAsync();
        }

        if (!await context.SystemSettings.AnyAsync())
        {
            context.SystemSettings.AddRange(
                new SystemSetting
                {
                    Id = Guid.NewGuid(),
                    Key = "portal.otp.required",
                    Value = "true",
                    Description = "Require OTP verification for customer portal access",
                    CreatedDate = DateTime.UtcNow
                },
                new SystemSetting
                {
                    Id = Guid.NewGuid(),
                    Key = "notification.emails",
                    Value = "",
                    Description = "Comma-separated email addresses to receive admin notifications",
                    CreatedDate = DateTime.UtcNow
                }
            );
            await context.SaveChangesAsync();
        }

        // Ensure notification.emails setting exists (for existing databases)
        if (!await context.SystemSettings.AnyAsync(s => s.Key == "notification.emails"))
        {
            context.SystemSettings.Add(new SystemSetting
            {
                Id = Guid.NewGuid(),
                Key = "notification.emails",
                Value = "",
                Description = "Comma-separated email addresses to receive admin notifications",
                CreatedDate = DateTime.UtcNow
            });
            await context.SaveChangesAsync();
        }
    }
}
