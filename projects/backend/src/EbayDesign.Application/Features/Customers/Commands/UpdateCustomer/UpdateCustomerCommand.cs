using MediatR;

namespace EbayDesign.Application.Features.Customers.Commands.UpdateCustomer;

public record UpdateCustomerCommand(
    Guid Id,
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
) : IRequest;
