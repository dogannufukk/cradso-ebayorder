using EbayDesign.Application.Features.Customers.Commands.CreateCustomer;
using EbayDesign.Application.Features.Customers.Commands.DeleteCustomer;
using EbayDesign.Application.Features.Customers.Commands.UpdateCustomer;
using EbayDesign.Application.Features.Customers.Queries.GetCustomerById;
using EbayDesign.Application.Features.Customers.Queries.GetCustomers;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace EbayDesign.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CustomersController : ControllerBase
{
    private readonly IMediator _mediator;

    public CustomersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<ActionResult<Guid>> Create([FromBody] CreateCustomerCommand command,
        CancellationToken cancellationToken)
    {
        var id = await _mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDirection = null,
        [FromQuery] string? customerName = null,
        [FromQuery] string? email = null,
        [FromQuery] string? mobilePhone = null,
        [FromQuery] string? city = null,
        [FromQuery] string? postCode = null,
        [FromQuery] string? country = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetCustomersQuery(page, pageSize, search,
            sortBy, sortDirection, customerName, email, mobilePhone, city, postCode, country), cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetCustomerByIdQuery(id), cancellationToken);
        if (result is null) return NotFound();
        return Ok(result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCustomerRequest request,
        CancellationToken cancellationToken)
    {
        await _mediator.Send(new UpdateCustomerCommand(
            id, request.CustomerName, request.CompanyName, request.Email,
            request.MobilePhone, request.Phone,
            request.AddressLine1, request.AddressLine2,
            request.City, request.County, request.PostCode, request.Country
        ), cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await _mediator.Send(new DeleteCustomerCommand(id), cancellationToken);
        return NoContent();
    }
}

public record UpdateCustomerRequest(
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
);
