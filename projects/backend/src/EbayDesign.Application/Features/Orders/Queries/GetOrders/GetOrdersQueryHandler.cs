using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Application.Common.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Orders.Queries.GetOrders;

public class GetOrdersQueryHandler : IRequestHandler<GetOrdersQuery, PaginatedList<OrderListDto>>
{
    private readonly IApplicationDbContext _context;

    public GetOrdersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<OrderListDto>> Handle(GetOrdersQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.Orders
            .AsNoTracking()
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .AsQueryable();

        // Status filter
        if (request.StatusFilter.HasValue)
            query = query.Where(o => o.Status == request.StatusFilter.Value);

        // Global search
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.ToLower();
            query = query.Where(o =>
                o.EbayOrderNo.ToLower().Contains(search) ||
                o.Customer.CustomerName.ToLower().Contains(search) ||
                o.Customer.Email.ToLower().Contains(search));
        }

        // Column filters
        if (!string.IsNullOrWhiteSpace(request.EbayOrderNo))
            query = query.Where(o => o.EbayOrderNo.ToLower().Contains(request.EbayOrderNo.ToLower()));

        if (!string.IsNullOrWhiteSpace(request.CustomerName))
            query = query.Where(o => o.Customer.CustomerName.ToLower().Contains(request.CustomerName.ToLower()));

        if (!string.IsNullOrWhiteSpace(request.CustomerEmail))
            query = query.Where(o => o.Customer.Email.ToLower().Contains(request.CustomerEmail.ToLower()));

        var totalCount = await query.CountAsync(cancellationToken);

        // Sorting
        query = request.SortBy?.ToLower() switch
        {
            "ebayorderno" => request.SortDirection == "asc"
                ? query.OrderBy(o => o.EbayOrderNo)
                : query.OrderByDescending(o => o.EbayOrderNo),
            "customername" => request.SortDirection == "asc"
                ? query.OrderBy(o => o.Customer.CustomerName)
                : query.OrderByDescending(o => o.Customer.CustomerName),
            "customeremail" => request.SortDirection == "asc"
                ? query.OrderBy(o => o.Customer.Email)
                : query.OrderByDescending(o => o.Customer.Email),
            "status" => request.SortDirection == "asc"
                ? query.OrderBy(o => o.Status)
                : query.OrderByDescending(o => o.Status),
            "createddate" => request.SortDirection == "asc"
                ? query.OrderBy(o => o.CreatedDate)
                : query.OrderByDescending(o => o.CreatedDate),
            _ => query.OrderByDescending(o => o.CreatedDate)
        };

        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(o => new OrderListDto(
                o.Id, o.EbayOrderNo, o.Customer.CustomerName, o.Customer.Email,
                o.Status, o.Items.Count, o.CreatedDate))
            .ToListAsync(cancellationToken);

        return new PaginatedList<OrderListDto>(items, totalCount, request.Page, request.PageSize);
    }
}
