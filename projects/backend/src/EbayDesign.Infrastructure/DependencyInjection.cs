using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Infrastructure.Identity;
using EbayDesign.Infrastructure.Persistence;
using EbayDesign.Infrastructure.Persistence.Interceptors;
using EbayDesign.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace EbayDesign.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddScoped<AuditableEntityInterceptor>();

        services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            var interceptor = sp.GetRequiredService<AuditableEntityInterceptor>();
            options.UseSqlServer(
                configuration.GetConnectionString("DefaultConnection"),
                b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName))
                .AddInterceptors(interceptor);
        });

        services.AddScoped<IApplicationDbContext>(provider =>
            provider.GetRequiredService<ApplicationDbContext>());

        services.AddSingleton<IFileStorageService>(provider =>
            new LocalFileStorageService(
                configuration.GetValue<string>("FileStorage:BasePath") ?? "uploads"));

        services.AddScoped<IEmailService, ScribanEmailService>();
        services.AddHostedService<EmailSenderBackgroundService>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IRoyalMailService, MockRoyalMailService>();
        services.AddScoped<ITokenService, JwtTokenService>();

        return services;
    }
}
