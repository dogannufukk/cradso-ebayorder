using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Portal.Commands.PortalDeleteFile;

public class PortalDeleteFileCommandHandler : IRequestHandler<PortalDeleteFileCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IFileStorageService _fileStorage;

    public PortalDeleteFileCommandHandler(IApplicationDbContext context, IFileStorageService fileStorage)
    {
        _context = context;
        _fileStorage = fileStorage;
    }

    public async Task Handle(PortalDeleteFileCommand request, CancellationToken cancellationToken)
    {
        var dr = await _context.DesignRequests
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

        // Only allow deletion when status permits uploads
        if (dr.Status != DesignRequestStatus.WaitingUpload && dr.Status != DesignRequestStatus.PrintRejected)
            throw new InvalidOperationException($"Cannot delete files when status is '{dr.Status}'.");

        var file = dr.Files.FirstOrDefault(f => f.Id == request.FileId && f.IsActive)
            ?? throw new KeyNotFoundException("File not found or already deleted.");

        // Delete from storage
        await _fileStorage.DeleteAsync(file.FileUrl, cancellationToken);

        // Remove from DB
        _context.DesignFiles.Remove(file);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
