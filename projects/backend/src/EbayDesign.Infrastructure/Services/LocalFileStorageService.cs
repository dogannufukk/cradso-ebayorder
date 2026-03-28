using EbayDesign.Application.Common.Interfaces;

namespace EbayDesign.Infrastructure.Services;

public class LocalFileStorageService : IFileStorageService
{
    private readonly string _basePath;

    public LocalFileStorageService(string basePath)
    {
        _basePath = basePath;
        Directory.CreateDirectory(_basePath);
    }

    public async Task<FileUploadResult> UploadAsync(Stream file, string fileName, string containerPath,
        CancellationToken cancellationToken = default)
    {
        var fullPath = Path.Combine(_basePath, containerPath);
        Directory.CreateDirectory(fullPath);

        var filePath = Path.Combine(fullPath, fileName);
        await using var fileStream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(fileStream, cancellationToken);

        return new FileUploadResult($"{containerPath}/{fileName}", fileStream.Length);
    }

    public Task<Stream> DownloadAsync(string fileUrl, CancellationToken cancellationToken = default)
    {
        var filePath = Path.Combine(_basePath, fileUrl);
        Stream stream = new FileStream(filePath, FileMode.Open, FileAccess.Read);
        return Task.FromResult(stream);
    }

    public Task DeleteAsync(string fileUrl, CancellationToken cancellationToken = default)
    {
        var filePath = Path.Combine(_basePath, fileUrl);
        if (File.Exists(filePath))
            File.Delete(filePath);
        return Task.CompletedTask;
    }

    public string GeneratePreSignedUrl(string fileUrl, TimeSpan expiry)
    {
        return $"/files/{fileUrl}";
    }
}
