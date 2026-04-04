using EbayDesign.Application.Features.Customers.Commands.CreateCustomer;
using EbayDesign.Application.Features.Customers.Commands.DeleteCustomer;
using EbayDesign.Application.Features.Customers.Commands.UpdateCustomer;
using EbayDesign.Application.Features.Customers.Queries.GetCustomerById;
using EbayDesign.Application.Features.Customers.Queries.GetCustomers;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EbayDesign.Api.Controllers.Mvc;

[Authorize]
public class CustomerController : Controller
{
    private readonly IMediator _mediator;

    public CustomerController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // Page: Customer List
    public IActionResult Index()
    {
        return View();
    }

    // Page: Customer Detail
    public async Task<IActionResult> Detail(Guid id, CancellationToken ct)
    {
        var customer = await _mediator.Send(new GetCustomerByIdQuery(id), ct);
        if (customer == null) return NotFound();
        return View(customer);
    }

    // AJAX: Get customers list
    [HttpGet]
    public async Task<IActionResult> List(int page = 1, int pageSize = 20,
        string? search = null, string? sortBy = null, string? sortDirection = null,
        string? customerName = null, string? email = null, string? ebayUsername = null,
        string? city = null, string? postCode = null, string? country = null,
        CancellationToken ct = default)
    {
        var result = await _mediator.Send(new GetCustomersQuery(page, pageSize, search, sortBy, sortDirection, customerName, email, ebayUsername, city, postCode, country), ct);
        return Json(result);
    }

    // AJAX: Create customer
    [HttpPost]
    public async Task<IActionResult> CreateCustomer([FromBody] CreateCustomerCommand command, CancellationToken ct)
    {
        var id = await _mediator.Send(command, ct);
        return Json(new { id });
    }

    // AJAX: Update customer
    [HttpPut]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCustomerRequest request, CancellationToken ct)
    {
        await _mediator.Send(new UpdateCustomerCommand(id, request.CustomerName, request.EbayUsername,
            request.Email, request.Phone, request.AddressLine1, request.AddressLine2,
            request.City, request.County, request.PostCode, request.Country), ct);
        return Json(new { success = true });
    }

    // AJAX: Delete customer
    [HttpDelete]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new DeleteCustomerCommand(id), ct);
        return Json(new { success = true });
    }

    public record UpdateCustomerRequest(
        string? CustomerName, string? EbayUsername, string Email,
        string? Phone, string? AddressLine1, string? AddressLine2,
        string? City, string? County, string? PostCode, string? Country);
}
