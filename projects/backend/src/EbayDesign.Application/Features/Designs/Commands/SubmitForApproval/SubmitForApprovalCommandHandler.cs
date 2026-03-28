using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Designs.Commands.SubmitForApproval;

public class SubmitForApprovalCommandHandler : IRequestHandler<SubmitForApprovalCommand>
{
    private readonly IApplicationDbContext _context;

    public SubmitForApprovalCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(SubmitForApprovalCommand request, CancellationToken cancellationToken)
    {
        var designRequest = await _context.DesignRequests
            .Include(dr => dr.Files)
            .FirstOrDefaultAsync(dr => dr.Id == request.DesignRequestId, cancellationToken)
            ?? throw new KeyNotFoundException($"Design request with ID {request.DesignRequestId} not found.");

        if (!designRequest.Files.Any(f => f.IsActive))
            throw new InvalidOperationException("Cannot submit for approval without an active design file.");

        designRequest.GenerateApprovalToken();
        designRequest.TransitionTo(DesignRequestStatus.WaitingApproval);

        await _context.SaveChangesAsync(cancellationToken);
    }
}
