using EbayDesign.Application.Common.Models;
using MediatR;

namespace EbayDesign.Application.Features.Customers.Queries.GetCustomers;

public record GetCustomersQuery(
    int Page = 1,
    int PageSize = 20,
    string? Search = null,
    string? SortBy = null,
    string? SortDirection = null,
    string? CustomerName = null,
    string? Email = null,
    string? MobilePhone = null,
    string? City = null,
    string? PostCode = null,
    string? Country = null
) : IRequest<PaginatedList<CustomerDto>>;

public record CustomerDto(
    Guid Id,
    string? CustomerName,
    string? CompanyName,
    string Email,
    string? MobilePhone,
    string? Phone,
    string? City,
    string? PostCode,
    string? Country,
    DateTime CreatedDate
);
