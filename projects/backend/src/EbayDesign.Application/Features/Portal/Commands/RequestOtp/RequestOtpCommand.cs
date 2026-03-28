using MediatR;

namespace EbayDesign.Application.Features.Portal.Commands.RequestOtp;

public record RequestOtpCommand(string Token) : IRequest<RequestOtpResponse>;

public record RequestOtpResponse(string MaskedEmail);
