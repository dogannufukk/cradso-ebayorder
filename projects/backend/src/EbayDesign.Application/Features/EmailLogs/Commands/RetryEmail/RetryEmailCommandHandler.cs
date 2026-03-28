using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.EmailLogs.Commands.RetryEmail;

public class RetryEmailCommandHandler : IRequestHandler<RetryEmailCommand>
{
    private readonly IApplicationDbContext _context;

    public RetryEmailCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(RetryEmailCommand request, CancellationToken cancellationToken)
    {
        var emailLog = await _context.EmailLogs
            .FirstOrDefaultAsync(e => e.Id == request.EmailLogId, cancellationToken)
            ?? throw new KeyNotFoundException($"Email log {request.EmailLogId} not found.");

        if (emailLog.Status != EmailStatus.Failed)
            throw new InvalidOperationException("Only failed emails can be retried.");

        emailLog.Status = EmailStatus.Pending;
        emailLog.RetryCount = 0;
        emailLog.NextRetryAt = null;
        emailLog.ErrorMessage = null;

        await _context.SaveChangesAsync(cancellationToken);
    }
}
