using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using EbayDesign.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace EbayDesign.Infrastructure.Services;

public class EmailSenderBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<EmailSenderBackgroundService> _logger;
    private static readonly TimeSpan PollingInterval = TimeSpan.FromSeconds(15);

    public EmailSenderBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<EmailSenderBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Email sender background service started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingEmailsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in email sender background service loop.");
            }

            await Task.Delay(PollingInterval, stoppingToken);
        }

        _logger.LogInformation("Email sender background service stopped.");
    }

    private async Task ProcessPendingEmailsAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

        var now = DateTime.UtcNow;

        var pendingEmails = await context.EmailLogs
            .Where(e =>
                (e.Status == EmailStatus.Pending && (e.NextRetryAt == null || e.NextRetryAt <= now)) ||
                (e.Status == EmailStatus.Sending)) // stuck in Sending state
            .OrderBy(e => e.CreatedDate)
            .Take(10)
            .ToListAsync(cancellationToken);

        if (pendingEmails.Count == 0) return;

        _logger.LogInformation("Processing {Count} pending email(s).", pendingEmails.Count);

        foreach (var emailLog in pendingEmails)
        {
            emailLog.Status = EmailStatus.Sending;
            await context.SaveChangesAsync(cancellationToken);

            await emailService.ProcessEmailAsync(emailLog, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);
        }
    }
}
