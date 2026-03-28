using System.Net;
using System.Text.Json;
using FluentValidation;

namespace EbayDesign.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, message) = exception switch
        {
            ValidationException validationEx => (
                HttpStatusCode.BadRequest,
                new ErrorResponse("Validation Error",
                    validationEx.Errors.Select(e => e.ErrorMessage).ToList())),

            KeyNotFoundException => (
                HttpStatusCode.NotFound,
                new ErrorResponse("Not Found", new List<string> { exception.Message })),

            InvalidOperationException => (
                HttpStatusCode.Conflict,
                new ErrorResponse("Invalid Operation", new List<string> { exception.Message })),

            UnauthorizedAccessException => (
                HttpStatusCode.Unauthorized,
                new ErrorResponse("Unauthorized", new List<string> { "Access denied." })),

            _ => (
                HttpStatusCode.InternalServerError,
                new ErrorResponse("Internal Server Error", new List<string> { "An unexpected error occurred." }))
        };

        if (statusCode == HttpStatusCode.InternalServerError)
            _logger.LogError(exception, "Unhandled exception occurred");
        else
            _logger.LogWarning(exception, "Handled exception: {Message}", exception.Message);

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var json = JsonSerializer.Serialize(message, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
        await context.Response.WriteAsync(json);
    }
}

public record ErrorResponse(string Title, List<string> Errors);
