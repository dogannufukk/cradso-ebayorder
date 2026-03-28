using EbayDesign.Application.Common.Models;
using EbayDesign.Domain.Enums;
using MediatR;

namespace EbayDesign.Application.Features.EmailLogs.Queries.GetEmailLogs;

public record GetEmailLogsQuery(
    int Page = 1,
    int PageSize = 20,
    string? Search = null,
    string? SortBy = null,
    string? SortDirection = null,
    EmailStatus? Status = null,
    string? ToEmail = null,
    string? Subject = null,
    string? TemplateName = null,
    string? RelatedEntityType = null,
    string? RelatedEntityId = null
) : IRequest<PaginatedList<EmailLogDto>>;

public record EmailLogDto(
    Guid Id,
    string ToEmail,
    string Subject,
    string TemplateName,
    EmailStatus Status,
    int RetryCount,
    int MaxRetries,
    DateTime? SentAt,
    string? ErrorMessage,
    string? RelatedEntityType,
    string? RelatedEntityId,
    DateTime CreatedDate
);
