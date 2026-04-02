using EbayDesign.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;

namespace EbayDesign.Infrastructure.Services;

public class AppSettings : IAppSettings
{
    public string BaseUrl { get; }

    public AppSettings(IConfiguration configuration)
    {
        BaseUrl = (configuration.GetValue<string>("App:BaseUrl") ?? "https://localhost:7178").TrimEnd('/');
    }
}
