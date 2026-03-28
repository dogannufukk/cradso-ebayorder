using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Designs.Commands.RejectPrint;

public class RejectPrintCommandHandler : IRequestHandler<RejectPrintCommand>
{
    private readonly IApplicationDbContext _context;

    public RejectPrintCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(RejectPrintCommand request, CancellationToken cancellationToken)
    {
        var designRequest = await _context.DesignRequests
            .Include(dr => dr.Files)
            .FirstOrDefaultAsync(dr => dr.Id == request.DesignRequestId, cancellationToken)
            ?? throw new KeyNotFoundException($"Design request with ID {request.DesignRequestId} not found.");

        // Stamp rejection reason on the active file
        var activeFile = designRequest.Files.FirstOrDefault(f => f.IsActive);
        if (activeFile != null)
            activeFile.RejectionReason = request.Reason;

        designRequest.RejectionReason = request.Reason;
        designRequest.TransitionTo(DesignRequestStatus.PrintRejected);
        designRequest.GenerateApprovalToken();

        await _context.SaveChangesAsync(cancellationToken);
    }
}
