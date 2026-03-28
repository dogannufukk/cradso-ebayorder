using EbayDesign.Application.Features.Designs.Commands.UploadDesignFile;
using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Portal.Commands.PortalUpload;

public class PortalUploadCommandHandler : IRequestHandler<PortalUploadCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly IMediator _mediator;

    public PortalUploadCommandHandler(IApplicationDbContext context, IMediator mediator)
    {
        _context = context;
        _mediator = mediator;
    }

    public async Task<Guid> Handle(PortalUploadCommand request, CancellationToken cancellationToken)
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

        return await _mediator.Send(new UploadDesignFileCommand(
            dr.Id, request.FileStream, request.FileName,
            request.FileType, request.FileSizeBytes, UploadedBy.Customer
        ), cancellationToken);
    }
}
