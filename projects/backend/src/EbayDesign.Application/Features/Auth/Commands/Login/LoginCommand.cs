using MediatR;

namespace EbayDesign.Application.Features.Auth.Commands.Login;

public record LoginCommand(string Username, string Password) : IRequest<LoginResponse>;

public record LoginResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt);
