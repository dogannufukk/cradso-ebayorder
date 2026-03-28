using MediatR;

namespace EbayDesign.Application.Features.Customers.Commands.CreateCustomer;

public record CreateCustomerCommand(
    string? CustomerName,
    string? CompanyName,
    string Email,
    string? MobilePhone,
    string? Phone,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? County,
    string? PostCode,
    string? Country
) : IRequest<Guid>;
