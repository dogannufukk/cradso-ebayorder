using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Designs.Commands.RejectDesign;

public class RejectDesignCommandHandler : IRequestHandler<RejectDesignCommand>
{
    private readonly IApplicationDbContext _context;

    public RejectDesignCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(RejectDesignCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new InvalidOperationException("Rejection reason is required.");

        var designRequest = await _context.DesignRequests
            .Include(dr => dr.Files)
            .FirstOrDefaultAsync(dr => dr.Id == request.DesignRequestId, cancellationToken)
            ?? throw new KeyNotFoundException($"Design request with ID {request.DesignRequestId} not found.");

        // Stamp rejection reason on the active file
        var activeFile = designRequest.Files.FirstOrDefault(f => f.IsActive);
        if (activeFile != null)
            activeFile.RejectionReason = request.Reason;

        designRequest.RejectionReason = request.Reason;
        designRequest.TransitionTo(DesignRequestStatus.Rejected);
        designRequest.ApprovalToken = null;
        designRequest.TokenExpiresAt = null;

        await _context.SaveChangesAsync(cancellationToken);
    }
}
