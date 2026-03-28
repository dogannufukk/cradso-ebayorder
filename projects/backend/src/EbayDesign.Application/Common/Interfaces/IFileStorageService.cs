namespace EbayDesign.Application.Common.Interfaces;

public interface IFileStorageService
{
    Task<FileUploadResult> UploadAsync(Stream file, string fileName, string containerPath, CancellationToken cancellationToken = default);
    Task<Stream> DownloadAsync(string fileUrl, CancellationToken cancellationToken = default);
    Task DeleteAsync(string fileUrl, CancellationToken cancellationToken = default);
    string GeneratePreSignedUrl(string fileUrl, TimeSpan expiry);
}

public record FileUploadResult(string FileUrl, long FileSizeBytes);
