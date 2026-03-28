using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Portal.Commands.PortalApprove;

public class PortalApproveCommandHandler : IRequestHandler<PortalApproveCommand>
{
    private readonly IApplicationDbContext _context;

    public PortalApproveCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(PortalApproveCommand request, CancellationToken cancellationToken)
    {
        var dr = await _context.DesignRequests
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

        if (dr.Status != DesignRequestStatus.WaitingApproval)
            throw new InvalidOperationException("This design is not waiting for approval.");

        dr.TransitionTo(DesignRequestStatus.Approved);
        // Keep token alive — portal uses any item's token to access all items

        await _context.SaveChangesAsync(cancellationToken);
    }
}
