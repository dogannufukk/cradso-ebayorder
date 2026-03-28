using EbayDesign.Domain.Entities;

namespace EbayDesign.Application.Common.Interfaces;

public interface IEmailService
{
    Task SendAsync(string templateName, object model, string toEmail, string subject,
        CancellationToken cancellationToken = default);

    Task QueueAsync(string templateName, object model, string toEmail, string subject,
        string? relatedEntityType = null, string? relatedEntityId = null,
        CancellationToken cancellationToken = default);

    Task ProcessEmailAsync(EmailLog emailLog, CancellationToken cancellationToken = default);
}
