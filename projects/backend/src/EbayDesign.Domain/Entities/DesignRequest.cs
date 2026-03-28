using EbayDesign.Domain.Common;
using EbayDesign.Domain.Enums;
using EbayDesign.Domain.Events;

namespace EbayDesign.Domain.Entities;

public class DesignRequest : BaseEntity
{
    public Guid OrderId { get; set; }
    public Guid OrderItemId { get; set; }
    public DesignRequestType Type { get; set; }
    public DesignRequestStatus Status { get; set; } = DesignRequestStatus.WaitingUpload;
    public string? RejectionReason { get; set; }
    public string? ApprovalToken { get; set; }
    public DateTime? TokenExpiresAt { get; set; }
    public string? OtpCodeHash { get; set; }
    public DateTime? OtpExpiresAt { get; set; }
    public int OtpAttempts { get; set; }
    public DateTime? OtpVerifiedUntil { get; set; }

    public Order Order { get; set; } = null!;
    public OrderItem OrderItem { get; set; } = null!;
    public ICollection<DesignFile> Files { get; set; } = new List<DesignFile>();

    private static readonly Dictionary<(DesignRequestStatus From, DesignRequestStatus To), bool> _allowedTransitions = new()
    {
        { (DesignRequestStatus.WaitingUpload, DesignRequestStatus.CustomerUploaded), true },
        { (DesignRequestStatus.CustomerUploaded, DesignRequestStatus.PrintApproved), true },
        { (DesignRequestStatus.CustomerUploaded, DesignRequestStatus.PrintRejected), true },
        { (DesignRequestStatus.PrintRejected, DesignRequestStatus.CustomerUploaded), true },
        { (DesignRequestStatus.PrintApproved, DesignRequestStatus.InDesign), true },
        { (DesignRequestStatus.InDesign, DesignRequestStatus.WaitingApproval), true },
        { (DesignRequestStatus.WaitingApproval, DesignRequestStatus.Approved), true },
        { (DesignRequestStatus.WaitingApproval, DesignRequestStatus.Rejected), true },
        { (DesignRequestStatus.Rejected, DesignRequestStatus.InDesign), true },
    };

    public void TransitionTo(DesignRequestStatus newStatus)
    {
        if (!_allowedTransitions.ContainsKey((Status, newStatus)))
        {
            throw new InvalidOperationException(
                $"Cannot transition design request from '{Status}' to '{newStatus}'.");
        }

        var oldStatus = Status;
        Status = newStatus;

        AddDomainEvent(new DesignRequestStatusChangedEvent(Id, OrderId, oldStatus, newStatus));

        if (newStatus == DesignRequestStatus.Approved)
            AddDomainEvent(new DesignApprovedEvent(Id, OrderId));

        if (newStatus == DesignRequestStatus.Rejected)
            AddDomainEvent(new DesignRejectedEvent(Id, OrderId, RejectionReason));
    }

    public string GenerateOtp()
    {
        var code = Random.Shared.Next(100000, 999999).ToString();
        OtpCodeHash = Convert.ToBase64String(
            System.Security.Cryptography.SHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes(code)));
        OtpExpiresAt = DateTime.UtcNow.AddSeconds(60);
        OtpAttempts = 0;
        return code;
    }

    public bool ValidateOtp(string code)
    {
        if (OtpAttempts >= 5)
            throw new InvalidOperationException("Too many attempts. Please request a new code.");

        if (OtpExpiresAt == null || OtpExpiresAt < DateTime.UtcNow)
            throw new InvalidOperationException("Code has expired. Please request a new code.");

        OtpAttempts++;

        var hash = Convert.ToBase64String(
            System.Security.Cryptography.SHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes(code)));

        if (hash != OtpCodeHash)
            return false;

        // Valid - grant 30 min session
        OtpVerifiedUntil = DateTime.UtcNow.AddMinutes(30);
        OtpCodeHash = null;
        OtpExpiresAt = null;
        OtpAttempts = 0;
        return true;
    }

    public void GenerateApprovalToken(int expiryDays = 7)
    {
        var tokenBytes = new byte[32];
        using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
        rng.GetBytes(tokenBytes);
        ApprovalToken = Convert.ToBase64String(tokenBytes)
            .Replace("+", "-").Replace("/", "_").TrimEnd('=');
        TokenExpiresAt = DateTime.UtcNow.AddDays(expiryDays);
    }
}
