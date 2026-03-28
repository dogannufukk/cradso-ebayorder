using EbayDesign.Domain.Common;
using EbayDesign.Domain.Enums;

namespace EbayDesign.Domain.Entities;

public class EmailLog : BaseEntity
{
    public string ToEmail { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string TemplateName { get; set; } = string.Empty;
    public string? TemplateModel { get; set; }
    public EmailStatus Status { get; set; } = EmailStatus.Pending;
    public int RetryCount { get; set; }
    public int MaxRetries { get; set; } = 3;
    public DateTime? NextRetryAt { get; set; }
    public DateTime? SentAt { get; set; }
    public string? ErrorMessage { get; set; }
    public string? RelatedEntityType { get; set; }
    public string? RelatedEntityId { get; set; }
}
