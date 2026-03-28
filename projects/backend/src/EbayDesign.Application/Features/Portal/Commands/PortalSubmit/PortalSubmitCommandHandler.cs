using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Portal.Commands.PortalSubmit;

public class PortalSubmitCommandHandler : IRequestHandler<PortalSubmitCommand>
{
    private readonly IApplicationDbContext _context;

    public PortalSubmitCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(PortalSubmitCommand request, CancellationToken cancellationToken)
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

        if (!dr.Files.Any(f => f.IsActive))
            throw new InvalidOperationException("Please upload at least one file before submitting.");

        dr.TransitionTo(DesignRequestStatus.CustomerUploaded);

        await _context.SaveChangesAsync(cancellationToken);
    }
}
