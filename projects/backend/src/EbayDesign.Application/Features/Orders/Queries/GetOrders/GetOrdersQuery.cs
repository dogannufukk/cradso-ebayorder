using EbayDesign.Application.Common.Models;
using EbayDesign.Domain.Enums;
using MediatR;

namespace EbayDesign.Application.Features.Orders.Queries.GetOrders;

public record GetOrdersQuery(
    int Page = 1,
    int PageSize = 20,
    OrderStatus? StatusFilter = null,
    string? Search = null,
    string? SortBy = null,
    string? SortDirection = null,
    string? EbayOrderNo = null,
    string? CustomerName = null,
    string? CustomerEmail = null
) : IRequest<PaginatedList<OrderListDto>>;

public record OrderListDto(
    Guid Id,
    string EbayOrderNo,
    string CustomerName,
    string CustomerEmail,
    OrderStatus Status,
    int ItemCount,
    DateTime CreatedDate
);
