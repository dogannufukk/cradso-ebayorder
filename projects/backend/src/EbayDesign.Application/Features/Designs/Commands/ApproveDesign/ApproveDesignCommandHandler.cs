using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Designs.Commands.ApproveDesign;

public class ApproveDesignCommandHandler : IRequestHandler<ApproveDesignCommand>
{
    private readonly IApplicationDbContext _context;

    public ApproveDesignCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(ApproveDesignCommand request, CancellationToken cancellationToken)
    {
        var designRequest = await _context.DesignRequests
            .FirstOrDefaultAsync(dr => dr.Id == request.DesignRequestId, cancellationToken)
            ?? throw new KeyNotFoundException($"Design request with ID {request.DesignRequestId} not found.");

        designRequest.TransitionTo(DesignRequestStatus.Approved);
        designRequest.ApprovalToken = null;
        designRequest.TokenExpiresAt = null;

        await _context.SaveChangesAsync(cancellationToken);
    }
}
