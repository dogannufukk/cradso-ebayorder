using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Application.Common.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.EmailLogs.Queries.GetEmailLogs;

public class GetEmailLogsQueryHandler : IRequestHandler<GetEmailLogsQuery, PaginatedList<EmailLogDto>>
{
    private readonly IApplicationDbContext _context;

    public GetEmailLogsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<EmailLogDto>> Handle(GetEmailLogsQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.EmailLogs.AsNoTracking().AsQueryable();

        // Status filter
        if (request.Status.HasValue)
            query = query.Where(e => e.Status == request.Status.Value);

        // Global search
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.ToLower();
            query = query.Where(e =>
                e.ToEmail.ToLower().Contains(search) ||
                e.Subject.ToLower().Contains(search) ||
                e.TemplateName.ToLower().Contains(search));
        }

        // Column filters
        if (!string.IsNullOrWhiteSpace(request.ToEmail))
            query = query.Where(e => e.ToEmail.ToLower().Contains(request.ToEmail.ToLower()));

        if (!string.IsNullOrWhiteSpace(request.Subject))
            query = query.Where(e => e.Subject.ToLower().Contains(request.Subject.ToLower()));

        if (!string.IsNullOrWhiteSpace(request.TemplateName))
            query = query.Where(e => e.TemplateName.ToLower().Contains(request.TemplateName.ToLower()));

        if (!string.IsNullOrWhiteSpace(request.RelatedEntityType))
            query = query.Where(e => e.RelatedEntityType != null &&
                e.RelatedEntityType.ToLower().Contains(request.RelatedEntityType.ToLower()));

        if (!string.IsNullOrWhiteSpace(request.RelatedEntityId))
            query = query.Where(e => e.RelatedEntityId != null &&
                e.RelatedEntityId.Contains(request.RelatedEntityId));

        var totalCount = await query.CountAsync(cancellationToken);

        // Sorting
        query = request.SortBy?.ToLower() switch
        {
            "toemail" => request.SortDirection == "asc"
                ? query.OrderBy(e => e.ToEmail) : query.OrderByDescending(e => e.ToEmail),
            "subject" => request.SortDirection == "asc"
                ? query.OrderBy(e => e.Subject) : query.OrderByDescending(e => e.Subject),
            "templatename" => request.SortDirection == "asc"
                ? query.OrderBy(e => e.TemplateName) : query.OrderByDescending(e => e.TemplateName),
            "status" => request.SortDirection == "asc"
                ? query.OrderBy(e => e.Status) : query.OrderByDescending(e => e.Status),
            "retrycount" => request.SortDirection == "asc"
                ? query.OrderBy(e => e.RetryCount) : query.OrderByDescending(e => e.RetryCount),
            "sentat" => request.SortDirection == "asc"
                ? query.OrderBy(e => e.SentAt) : query.OrderByDescending(e => e.SentAt),
            "createddate" => request.SortDirection == "asc"
                ? query.OrderBy(e => e.CreatedDate) : query.OrderByDescending(e => e.CreatedDate),
            _ => query.OrderByDescending(e => e.CreatedDate)
        };

        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(e => new EmailLogDto(
                e.Id, e.ToEmail, e.Subject, e.TemplateName,
                e.Status, e.RetryCount, e.MaxRetries,
                e.SentAt, e.ErrorMessage,
                e.RelatedEntityType, e.RelatedEntityId,
                e.CreatedDate))
            .ToListAsync(cancellationToken);

        return new PaginatedList<EmailLogDto>(items, totalCount, request.Page, request.PageSize);
    }
}
