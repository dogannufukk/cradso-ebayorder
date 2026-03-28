using FluentValidation;

namespace EbayDesign.Application.Features.Customers.Commands.CreateCustomer;

public class CreateCustomerCommandValidator : AbstractValidator<CreateCustomerCommand>
{
    public CreateCustomerCommandValidator()
    {
        RuleFor(x => x)
            .Must(x => !string.IsNullOrWhiteSpace(x.CustomerName) || !string.IsNullOrWhiteSpace(x.CompanyName))
            .WithMessage("Customer Name or Company Name is required.");

        RuleFor(x => x.CustomerName).MaximumLength(200);
        RuleFor(x => x.CompanyName).MaximumLength(200);

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("A valid email is required.")
            .MaximumLength(200);

        RuleFor(x => x.AddressLine1)
            .NotEmpty().WithMessage("Address Line 1 is required.")
            .MaximumLength(300);

        RuleFor(x => x.City)
            .NotEmpty().WithMessage("Town / City is required.")
            .MaximumLength(100);

        RuleFor(x => x.PostCode)
            .NotEmpty().WithMessage("Postcode is required.")
            .MaximumLength(10);

        RuleFor(x => x.Country)
            .NotEmpty().WithMessage("Country is required.")
            .MaximumLength(100);
    }
}
