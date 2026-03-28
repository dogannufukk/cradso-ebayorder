using MediatR;

namespace EbayDesign.Application.Features.Settings.Queries.GetSettings;

public record GetSettingsQuery : IRequest<List<SettingDto>>;

public record SettingDto(string Key, string Value, string? Description);
