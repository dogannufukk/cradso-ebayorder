using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Application.Common.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Customers.Queries.GetCustomers;

public class GetCustomersQueryHandler : IRequestHandler<GetCustomersQuery, PaginatedList<CustomerDto>>
{
    private readonly IApplicationDbContext _context;

    public GetCustomersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<CustomerDto>> Handle(GetCustomersQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.Customers.AsNoTracking().AsQueryable();

        // Global search
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.ToLower();
            query = query.Where(c =>
                (c.CustomerName != null && c.CustomerName.ToLower().Contains(search)) ||
                (c.EbayUsername != null && c.EbayUsername.ToLower().Contains(search)) ||
                c.Email.ToLower().Contains(search));
        }

        // Column filters
        if (!string.IsNullOrWhiteSpace(request.CustomerName))
            query = query.Where(c => c.CustomerName != null && c.CustomerName.ToLower().Contains(request.CustomerName.ToLower()));

        if (!string.IsNullOrWhiteSpace(request.Email))
            query = query.Where(c => c.Email.ToLower().Contains(request.Email.ToLower()));

        if (!string.IsNullOrWhiteSpace(request.EbayUsername))
            query = query.Where(c => c.EbayUsername != null && c.EbayUsername.ToLower().Contains(request.EbayUsername.ToLower()));

        if (!string.IsNullOrWhiteSpace(request.City))
            query = query.Where(c => c.City != null && c.City.ToLower().Contains(request.City.ToLower()));

        if (!string.IsNullOrWhiteSpace(request.PostCode))
            query = query.Where(c => c.PostCode != null && c.PostCode.ToLower().Contains(request.PostCode.ToLower()));

        if (!string.IsNullOrWhiteSpace(request.Country))
            query = query.Where(c => c.Country != null && c.Country.ToLower().Contains(request.Country.ToLower()));

        var totalCount = await query.CountAsync(cancellationToken);

        // Sorting
        query = request.SortBy?.ToLower() switch
        {
            "customername" => request.SortDirection == "asc"
                ? query.OrderBy(c => c.CustomerName)
                : query.OrderByDescending(c => c.CustomerName),
            "email" => request.SortDirection == "asc"
                ? query.OrderBy(c => c.Email)
                : query.OrderByDescending(c => c.Email),
            "ebayusername" => request.SortDirection == "asc"
                ? query.OrderBy(c => c.EbayUsername)
                : query.OrderByDescending(c => c.EbayUsername),
            "city" => request.SortDirection == "asc"
                ? query.OrderBy(c => c.City)
                : query.OrderByDescending(c => c.City),
            "postcode" => request.SortDirection == "asc"
                ? query.OrderBy(c => c.PostCode)
                : query.OrderByDescending(c => c.PostCode),
            "country" => request.SortDirection == "asc"
                ? query.OrderBy(c => c.Country)
                : query.OrderByDescending(c => c.Country),
            "createddate" => request.SortDirection == "asc"
                ? query.OrderBy(c => c.CreatedDate)
                : query.OrderByDescending(c => c.CreatedDate),
            _ => query.OrderByDescending(c => c.CreatedDate)
        };

        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(c => new CustomerDto(
                c.Id, c.CustomerName, c.EbayUsername, c.Email, c.Phone,
                c.City, c.PostCode, c.Country, c.CreatedDate))
            .ToListAsync(cancellationToken);

        return new PaginatedList<CustomerDto>(items, totalCount, request.Page, request.PageSize);
    }
}
