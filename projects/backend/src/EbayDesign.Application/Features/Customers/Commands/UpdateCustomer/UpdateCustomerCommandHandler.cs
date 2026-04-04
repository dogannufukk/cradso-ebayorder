using EbayDesign.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Customers.Commands.UpdateCustomer;

public class UpdateCustomerCommandHandler : IRequestHandler<UpdateCustomerCommand>
{
    private readonly IApplicationDbContext _context;

    public UpdateCustomerCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(UpdateCustomerCommand request, CancellationToken cancellationToken)
    {
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Customer with ID {request.Id} not found.");

        customer.CustomerName = request.CustomerName;
        customer.EbayUsername = request.EbayUsername;
        customer.Email = request.Email;
        customer.Phone = request.Phone;
        customer.AddressLine1 = request.AddressLine1;
        customer.AddressLine2 = request.AddressLine2;
        customer.City = request.City;
        customer.County = request.County;
        customer.PostCode = request.PostCode;
        customer.Country = request.Country ?? "United Kingdom";

        await _context.SaveChangesAsync(cancellationToken);
    }
}
