using EbayDesign.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EbayDesign.Application.Common.Helpers;

public static class AdminNotificationHelper
{
    public static async Task<List<string>> GetNotificationEmailsAsync(
        IApplicationDbContext context, CancellationToken cancellationToken)
    {
        var setting = await context.SystemSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == "notification.emails", cancellationToken);

        if (setting == null || string.IsNullOrWhiteSpace(setting.Value))
            return new List<string>();

        return setting.Value
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(e => e.Contains('@'))
            .ToList();
    }

    public static async Task SendAdminNotificationAsync(
        IApplicationDbContext context,
        IEmailService emailService,
        IAppSettings appSettings,
        string orderId,
        string orderNo,
        string customerName,
        string actionTitle,
        string actionDetail,
        int? itemCount = null,
        string? rejectionReason = null,
        CancellationToken cancellationToken = default)
    {
        var emails = await GetNotificationEmailsAsync(context, cancellationToken);
        if (emails.Count == 0) return;

        var model = new
        {
            action_title = actionTitle,
            action_detail = actionDetail,
            customer_name = customerName,
            order_no = orderNo,
            item_count = itemCount,
            rejection_reason = rejectionReason,
            order_url = $"{appSettings.BaseUrl}/Order/Detail/{orderId}"
        };

        foreach (var email in emails)
        {
            await emailService.QueueAsync(
                "AdminNotification",
                model,
                email,
                $"{actionTitle} - Order {orderNo}",
                "Order",
                orderId,
                cancellationToken);
        }
    }
}
