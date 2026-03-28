using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Portal.Commands.PortalPrepareUpload;

public class PortalPrepareUploadCommandHandler : IRequestHandler<PortalPrepareUploadCommand>
{
    private readonly IApplicationDbContext _context;

    public PortalPrepareUploadCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(PortalPrepareUploadCommand request, CancellationToken cancellationToken)
    {
        var dr = await _context.DesignRequests
            .Include(d => d.Files)
            .FirstOrDefaultAsync(d => d.ApprovalToken == request.Token, cancellationToken)
            ?? throw new KeyNotFoundException("Invalid or expired design link.");

        if (dr.Status == DesignRequestStatus.PrintRejected)
        {
            // Deactivate all old active files before new round begins
            foreach (var file in dr.Files.Where(f => f.IsActive))
                file.IsActive = false;

            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
