using EbayDesign.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Portal.Commands.RequestOtp;

public class RequestOtpCommandHandler : IRequestHandler<RequestOtpCommand, RequestOtpResponse>
{
    private readonly IApplicationDbContext _context;
    private readonly IEmailService _emailService;

    public RequestOtpCommandHandler(IApplicationDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
    }

    public async Task<RequestOtpResponse> Handle(RequestOtpCommand request, CancellationToken cancellationToken)
    {
        var designRequest = await _context.DesignRequests
            .Include(d => d.Order)
                .ThenInclude(o => o.Customer)
            .FirstOrDefaultAsync(d => d.ApprovalToken == request.Token, cancellationToken)
            ?? throw new KeyNotFoundException("Invalid or expired design link.");

        if (designRequest.TokenExpiresAt.HasValue && designRequest.TokenExpiresAt.Value < DateTime.UtcNow)
            throw new InvalidOperationException("This design link has expired.");

        var code = designRequest.GenerateOtp();

        var customer = designRequest.Order.Customer;

        await _emailService.QueueAsync(
            "OtpVerification",
            new { otp_code = code, customer_name = customer.CustomerName },
            customer.Email!,
            "Your Verification Code",
            "DesignRequest",
            designRequest.Id.ToString(),
            cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return new RequestOtpResponse(MaskEmail(customer.Email!));
    }

    private static string MaskEmail(string email)
    {
        var parts = email.Split('@');
        var local = parts[0];
        if (local.Length <= 2)
            return local[0] + new string('*', Math.Max(local.Length - 1, 1)) + "@" + parts[1];
        return local[0] + new string('*', local.Length - 2) + local[^1] + "@" + parts[1];
    }
}
