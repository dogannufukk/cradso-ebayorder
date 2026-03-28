using MediatR;

namespace EbayDesign.Application.Features.Portal.Commands.VerifyOtp;

public record VerifyOtpCommand(string Token, string OtpCode) : IRequest<VerifyOtpResponse>;

public record VerifyOtpResponse(bool Verified, DateTime ExpiresAt);
