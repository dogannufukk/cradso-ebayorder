using EbayDesign.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Designs.Queries.GetDesignsByOrder;

public class GetDesignsByOrderQueryHandler : IRequestHandler<GetDesignsByOrderQuery, List<DesignRequestDto>>
{
    private readonly IApplicationDbContext _context;

    public GetDesignsByOrderQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<DesignRequestDto>> Handle(GetDesignsByOrderQuery request,
        CancellationToken cancellationToken)
    {
        var designRequests = await _context.DesignRequests
            .AsNoTracking()
            .Where(dr => dr.OrderId == request.OrderId)
            .Include(dr => dr.OrderItem)
            .Include(dr => dr.Files)
            .OrderBy(dr => dr.CreatedDate)
            .ToListAsync(cancellationToken);

        return designRequests.Select(dr => new DesignRequestDto(
            dr.Id,
            dr.OrderItemId,
            dr.OrderItem.SKU,
            dr.Type,
            dr.Status,
            dr.RejectionReason,
            dr.ApprovalToken,
            dr.TokenExpiresAt,
            dr.CreatedDate,
            dr.Files.OrderByDescending(f => f.Version).Select(f => new DesignFileDto(
                f.Id, f.FileName, f.FileType, f.FileUrl, f.FileSizeBytes,
                f.UploadedBy, f.Version, f.IsActive, f.RejectionReason, f.CreatedDate
            )).ToList()
        )).ToList();
    }
}
