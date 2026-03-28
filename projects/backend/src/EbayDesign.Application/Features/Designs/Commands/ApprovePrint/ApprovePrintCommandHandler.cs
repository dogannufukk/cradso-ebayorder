using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Designs.Commands.ApprovePrint;

public class ApprovePrintCommandHandler : IRequestHandler<ApprovePrintCommand>
{
    private readonly IApplicationDbContext _context;

    public ApprovePrintCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(ApprovePrintCommand request, CancellationToken cancellationToken)
    {
        var designRequest = await _context.DesignRequests
            .FirstOrDefaultAsync(dr => dr.Id == request.DesignRequestId, cancellationToken)
            ?? throw new KeyNotFoundException($"Design request with ID {request.DesignRequestId} not found.");

        designRequest.TransitionTo(DesignRequestStatus.PrintApproved);

        await _context.SaveChangesAsync(cancellationToken);
    }
}
