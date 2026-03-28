using MediatR;

namespace EbayDesign.Application.Features.Settings.Commands.UpdateSetting;

public record UpdateSettingCommand(string Key, string Value) : IRequest;
