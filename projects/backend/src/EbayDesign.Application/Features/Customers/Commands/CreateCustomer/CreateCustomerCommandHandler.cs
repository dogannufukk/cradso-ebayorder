using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Entities;
using MediatR;

namespace EbayDesign.Application.Features.Customers.Commands.CreateCustomer;

public class CreateCustomerCommandHandler : IRequestHandler<CreateCustomerCommand, Guid>
{
    private readonly IApplicationDbContext _context;

    public CreateCustomerCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(CreateCustomerCommand request, CancellationToken cancellationToken)
    {
        var customer = new Customer
        {
            CustomerName = request.CustomerName,
            CompanyName = request.CompanyName,
            Email = request.Email,
            MobilePhone = request.MobilePhone,
            Phone = request.Phone,
            AddressLine1 = request.AddressLine1,
            AddressLine2 = request.AddressLine2,
            City = request.City,
            County = request.County,
            PostCode = request.PostCode,
            Country = request.Country ?? "United Kingdom"
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync(cancellationToken);

        return customer.Id;
    }
}
