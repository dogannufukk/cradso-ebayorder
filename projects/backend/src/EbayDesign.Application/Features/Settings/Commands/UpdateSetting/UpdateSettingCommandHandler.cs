using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Settings.Commands.UpdateSetting;

public class UpdateSettingCommandHandler : IRequestHandler<UpdateSettingCommand>
{
    private readonly IApplicationDbContext _context;

    public UpdateSettingCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(UpdateSettingCommand request, CancellationToken cancellationToken)
    {
        var setting = await _context.SystemSettings
            .FirstOrDefaultAsync(s => s.Key == request.Key, cancellationToken);

        if (setting is not null)
        {
            setting.Value = request.Value;
        }
        else
        {
            _context.SystemSettings.Add(new SystemSetting
            {
                Id = Guid.NewGuid(),
                Key = request.Key,
                Value = request.Value
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}
