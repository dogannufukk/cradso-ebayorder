namespace EbayDesign.Application.Common.Interfaces;

public interface ITokenService
{
    string GenerateAccessToken(Guid userId, string username);
    string GenerateRefreshToken();
}
