using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Application.Features.Designs.Queries.GetDesignsByOrder;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Designs.Queries.GetDesignRequestById;

public class GetDesignRequestByIdQueryHandler : IRequestHandler<GetDesignRequestByIdQuery, DesignRequestDto?>
{
    private readonly IApplicationDbContext _context;

    public GetDesignRequestByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<DesignRequestDto?> Handle(GetDesignRequestByIdQuery request,
        CancellationToken cancellationToken)
    {
        var dr = await _context.DesignRequests
            .AsNoTracking()
            .Include(d => d.OrderItem)
            .Include(d => d.Files)
            .FirstOrDefaultAsync(d => d.Id == request.Id, cancellationToken);

        if (dr is null) return null;

        return new DesignRequestDto(
            dr.Id, dr.OrderItemId, dr.OrderItem.SKU, dr.Type, dr.Status,
            dr.RejectionReason, dr.ApprovalToken, dr.TokenExpiresAt, dr.CreatedDate,
            dr.Files.OrderByDescending(f => f.Version).Select(f => new DesignFileDto(
                f.Id, f.FileName, f.FileType, f.FileUrl, f.FileSizeBytes,
                f.UploadedBy, f.Version, f.IsActive, f.RejectionReason, f.CreatedDate
            )).ToList()
        );
    }
}
