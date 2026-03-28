using EbayDesign.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Portal.Commands.VerifyOtp;

public class VerifyOtpCommandHandler : IRequestHandler<VerifyOtpCommand, VerifyOtpResponse>
{
    private readonly IApplicationDbContext _context;

    public VerifyOtpCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<VerifyOtpResponse> Handle(VerifyOtpCommand request, CancellationToken cancellationToken)
    {
        var designRequest = await _context.DesignRequests
            .FirstOrDefaultAsync(d => d.ApprovalToken == request.Token, cancellationToken)
            ?? throw new KeyNotFoundException("Invalid or expired design link.");

        if (designRequest.TokenExpiresAt.HasValue && designRequest.TokenExpiresAt.Value < DateTime.UtcNow)
            throw new InvalidOperationException("This design link has expired.");

        if (!designRequest.ValidateOtp(request.OtpCode))
            throw new InvalidOperationException("Invalid code.");

        await _context.SaveChangesAsync(cancellationToken);

        return new VerifyOtpResponse(true, designRequest.OtpVerifiedUntil!.Value);
    }
}
