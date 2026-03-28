using EbayDesign.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Portal.Queries.GetPortalDesign;

public class GetPortalDesignQueryHandler : IRequestHandler<GetPortalDesignQuery, PortalDesignDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IFileStorageService _fileStorage;

    public GetPortalDesignQueryHandler(IApplicationDbContext context, IFileStorageService fileStorage)
    {
        _context = context;
        _fileStorage = fileStorage;
    }

    public async Task<PortalDesignDto> Handle(GetPortalDesignQuery request,
        CancellationToken cancellationToken)
    {
        var dr = await _context.DesignRequests
            .AsNoTracking()
            .Include(d => d.Order)
            .Include(d => d.OrderItem)
            .Include(d => d.Files)
            .FirstOrDefaultAsync(d => d.ApprovalToken == request.Token, cancellationToken)
            ?? throw new KeyNotFoundException("Invalid or expired design link.");

        if (dr.TokenExpiresAt.HasValue && dr.TokenExpiresAt.Value < DateTime.UtcNow)
            throw new InvalidOperationException("This design link has expired.");

        // Check if OTP is required
        var otpSetting = await _context.SystemSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == "portal.otp.required", cancellationToken);
        var otpRequired = otpSetting?.Value?.ToLower() == "true";

        if (otpRequired && (dr.OtpVerifiedUntil == null || dr.OtpVerifiedUntil < DateTime.UtcNow))
            throw new UnauthorizedAccessException("OTP verification required.");

        var activeFile = dr.Files.FirstOrDefault(f => f.IsActive);
        PortalDesignFileDto? fileDto = null;
        if (activeFile != null)
        {
            var previewUrl = _fileStorage.GeneratePreSignedUrl(activeFile.FileUrl, TimeSpan.FromHours(1));
            fileDto = new PortalDesignFileDto(
                activeFile.FileName, activeFile.FileType, previewUrl, activeFile.Version);
        }

        return new PortalDesignDto(
            dr.Id, dr.Order.EbayOrderNo, dr.OrderItem.SKU,
            dr.Type, dr.Status, dr.RejectionReason, fileDto
        );
    }
}
