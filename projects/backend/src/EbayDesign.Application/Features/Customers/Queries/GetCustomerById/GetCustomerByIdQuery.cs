using MediatR;

namespace EbayDesign.Application.Features.Customers.Queries.GetCustomerById;

public record GetCustomerByIdQuery(Guid Id) : IRequest<CustomerDetailDto?>;

public record CustomerDetailDto(
    Guid Id,
    string? CustomerName,
    string? EbayUsername,
    string Email,
    string? Phone,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? County,
    string? PostCode,
    string? Country,
    DateTime CreatedDate,
    int OrderCount
);
