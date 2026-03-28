using MediatR;

namespace EbayDesign.Application.Features.EmailLogs.Commands.RetryEmail;

public record RetryEmailCommand(Guid EmailLogId) : IRequest;
