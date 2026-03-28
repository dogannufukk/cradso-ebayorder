using EbayDesign.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Settings.Queries.GetSettings;

public class GetSettingsQueryHandler : IRequestHandler<GetSettingsQuery, List<SettingDto>>
{
    private readonly IApplicationDbContext _context;

    public GetSettingsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<SettingDto>> Handle(GetSettingsQuery request, CancellationToken cancellationToken)
    {
        return await _context.SystemSettings
            .AsNoTracking()
            .Select(s => new SettingDto(s.Key, s.Value, s.Description))
            .ToListAsync(cancellationToken);
    }
}
