using EbayDesign.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Features.Customers.Queries.GetCustomerById;

public class GetCustomerByIdQueryHandler : IRequestHandler<GetCustomerByIdQuery, CustomerDetailDto?>
{
    private readonly IApplicationDbContext _context;

    public GetCustomerByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CustomerDetailDto?> Handle(GetCustomerByIdQuery request,
        CancellationToken cancellationToken)
    {
        var customer = await _context.Customers
            .AsNoTracking()
            .Include(c => c.Orders)
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

        if (customer is null) return null;

        return new CustomerDetailDto(
            customer.Id, customer.CustomerName, customer.CompanyName, customer.Email,
            customer.MobilePhone, customer.Phone,
            customer.AddressLine1, customer.AddressLine2,
            customer.City, customer.County, customer.PostCode, customer.Country,
            customer.CreatedDate, customer.Orders.Count
        );
    }
}
