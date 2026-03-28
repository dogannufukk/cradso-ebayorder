using FluentValidation;

namespace EbayDesign.Application.Features.Shipments.Commands.CreateShipment;

public class CreateShipmentCommandValidator : AbstractValidator<CreateShipmentCommand>
{
    public CreateShipmentCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .NotEmpty().WithMessage("Order ID is required.");

        RuleFor(x => x.DeliveryType)
            .IsInEnum().WithMessage("Invalid delivery type.");
    }
}
