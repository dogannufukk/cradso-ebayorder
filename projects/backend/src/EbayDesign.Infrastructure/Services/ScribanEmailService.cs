using System.Net;
using System.Net.Mail;
using System.Reflection;
using System.Text.Json;
using EbayDesign.Application.Common.Interfaces;
using EbayDesign.Domain.Entities;
using EbayDesign.Domain.Enums;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Scriban;
using Scriban.Runtime;

namespace EbayDesign.Infrastructure.Services;

public class ScribanEmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<ScribanEmailService> _logger;
    private readonly IApplicationDbContext _context;
    private static readonly Assembly ResourceAssembly = typeof(ScribanEmailService).Assembly;

    public ScribanEmailService(
        IConfiguration configuration,
        ILogger<ScribanEmailService> logger,
        IApplicationDbContext context)
    {
        _configuration = configuration;
        _logger = logger;
        _context = context;
    }

    public async Task QueueAsync(string templateName, object model, string toEmail, string subject,
        string? relatedEntityType = null, string? relatedEntityId = null,
        CancellationToken cancellationToken = default)
    {
        var emailLog = new EmailLog
        {
            ToEmail = toEmail,
            Subject = subject,
            TemplateName = templateName,
            TemplateModel = JsonSerializer.Serialize(model),
            Status = EmailStatus.Pending,
            RetryCount = 0,
            MaxRetries = 3,
            RelatedEntityType = relatedEntityType,
            RelatedEntityId = relatedEntityId
        };

        _context.EmailLogs.Add(emailLog);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Email queued. Template: {Template}, To: {Email}, Subject: {Subject}, Id: {EmailLogId}",
            templateName, toEmail, subject, emailLog.Id);
    }

    public async Task ProcessEmailAsync(EmailLog emailLog, CancellationToken cancellationToken = default)
    {
        try
        {
            // Deserialize model from JSON
            object? model = null;
            if (!string.IsNullOrWhiteSpace(emailLog.TemplateModel))
            {
                model = JsonSerializer.Deserialize<Dictionary<string, object>>(emailLog.TemplateModel);
            }

            await SendAsync(emailLog.TemplateName, model ?? new { }, emailLog.ToEmail,
                emailLog.Subject, cancellationToken);

            emailLog.Status = EmailStatus.Sent;
            emailLog.SentAt = DateTime.UtcNow;
            emailLog.ErrorMessage = null;

            _logger.LogInformation("Email sent successfully. Id: {EmailLogId}, To: {Email}",
                emailLog.Id, emailLog.ToEmail);
        }
        catch (Exception ex)
        {
            emailLog.RetryCount++;
            emailLog.ErrorMessage = ex.Message.Length > 2000 ? ex.Message[..2000] : ex.Message;

            if (emailLog.RetryCount >= emailLog.MaxRetries)
            {
                emailLog.Status = EmailStatus.Failed;
                _logger.LogError(ex,
                    "Email permanently failed after {RetryCount} attempts. Id: {EmailLogId}, To: {Email}",
                    emailLog.RetryCount, emailLog.Id, emailLog.ToEmail);
            }
            else
            {
                emailLog.Status = EmailStatus.Pending;
                // Exponential backoff: 1min, 5min, 15min
                var delays = new[] { 1, 5, 15 };
                var delayMinutes = emailLog.RetryCount <= delays.Length
                    ? delays[emailLog.RetryCount - 1]
                    : delays[^1];
                emailLog.NextRetryAt = DateTime.UtcNow.AddMinutes(delayMinutes);

                _logger.LogWarning(ex,
                    "Email failed, will retry in {DelayMinutes}m. Id: {EmailLogId}, Attempt: {RetryCount}/{MaxRetries}",
                    delayMinutes, emailLog.Id, emailLog.RetryCount, emailLog.MaxRetries);
            }
        }
    }

    public async Task SendAsync(string templateName, object model, string toEmail, string subject,
        CancellationToken cancellationToken = default)
    {
        var templateContent = await LoadTemplateAsync(templateName);
        var htmlBody = await RenderTemplateAsync(templateContent, model);

        var smtpHost = _configuration["Smtp:Host"];
        var smtpPortStr = _configuration["Smtp:Port"];

        if (string.IsNullOrWhiteSpace(smtpHost) || string.IsNullOrWhiteSpace(smtpPortStr))
        {
            _logger.LogWarning(
                "SMTP is not configured. Email not sent. Template: {Template}, To: {Email}, Subject: {Subject}",
                templateName, toEmail, subject);
            _logger.LogDebug("Rendered email body for template {Template}:\n{Body}", templateName, htmlBody);
            return;
        }

        var smtpPort = int.Parse(smtpPortStr);
        var fromEmail = _configuration["Smtp:FromEmail"] ?? "noreply@ebaydesign.co.uk";
        var fromName = _configuration["Smtp:FromName"] ?? "eBay Design Orders";
        var username = _configuration["Smtp:Username"];
        var password = _configuration["Smtp:Password"];
        var enableSsl = _configuration.GetValue<bool>("Smtp:EnableSsl", true);

        using var smtpClient = new SmtpClient(smtpHost, smtpPort)
        {
            EnableSsl = enableSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network
        };

        if (!string.IsNullOrWhiteSpace(username) && !string.IsNullOrWhiteSpace(password))
        {
            smtpClient.Credentials = new NetworkCredential(username, password);
        }

        var mailMessage = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true
        };
        mailMessage.To.Add(new MailAddress(toEmail));

        await smtpClient.SendMailAsync(mailMessage, cancellationToken);

        _logger.LogInformation("SMTP email sent. Template: {Template}, To: {Email}, Subject: {Subject}",
            templateName, toEmail, subject);
    }

    private static async Task<string> LoadTemplateAsync(string templateName)
    {
        var resourceName = $"EbayDesign.Infrastructure.Templates.Email.{templateName}.html";
        var stream = ResourceAssembly.GetManifestResourceStream(resourceName);

        if (stream != null)
        {
            using var reader = new StreamReader(stream);
            return await reader.ReadToEndAsync();
        }

        var assemblyDir = Path.GetDirectoryName(ResourceAssembly.Location)!;
        var filePath = Path.Combine(assemblyDir, "Templates", "Email", $"{templateName}.html");

        if (File.Exists(filePath))
        {
            return await File.ReadAllTextAsync(filePath);
        }

        throw new FileNotFoundException(
            $"Email template '{templateName}' not found as embedded resource '{resourceName}' or file '{filePath}'.");
    }

    private static async Task<string> RenderTemplateAsync(string templateContent, object model)
    {
        var template = Template.Parse(templateContent);

        if (template.HasErrors)
        {
            var errors = string.Join("; ", template.Messages.Select(m => m.Message));
            throw new InvalidOperationException($"Scriban template parsing failed: {errors}");
        }

        var scriptObject = new ScriptObject();
        scriptObject.Import(model);

        var context = new TemplateContext();
        context.PushGlobal(scriptObject);

        return await template.RenderAsync(context);
    }
}
