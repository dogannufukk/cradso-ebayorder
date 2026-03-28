namespace EbayDesign.Domain.Enums;

public enum DesignRequestStatus
{
    WaitingUpload = 0,
    CustomerUploaded = 1,   // customer uploaded, waiting admin print review
    PrintRejected = 2,      // admin said not suitable for print
    PrintApproved = 3,      // admin said suitable, will start design
    InDesign = 4,
    WaitingApproval = 5,
    Approved = 6,
    Rejected = 7
}
