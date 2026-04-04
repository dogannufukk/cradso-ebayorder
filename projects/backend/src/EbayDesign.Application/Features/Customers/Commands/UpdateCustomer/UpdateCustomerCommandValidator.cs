using FluentValidation;

namespace EbayDesign.Application.Features.Customers.Commands.UpdateCustomer;

public class UpdateCustomerCommandValidator : AbstractValidator<UpdateCustomerCommand>
{
    public UpdateCustomerCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();

        RuleFor(x => x)
            .Must(x => !string.IsNullOrWhiteSpace(x.CustomerName) || !string.IsNullOrWhiteSpace(x.EbayUsername))
            .WithMessage("Customer Name or Ebay Username is required.");

        RuleFor(x => x.CustomerName).MaximumLength(200);
        RuleFor(x => x.EbayUsername).MaximumLength(200);

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
