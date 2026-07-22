<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpKernel\KernelInterface;

final class AdminImageStorageService
{
    private const MAX_UPLOAD_BYTES = 1048576;
    private const ALLOWED_BUCKETS = ['tenants', 'locations', 'avatars'];
    private const MIME_TO_EXTENSION = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    public function __construct(
        private readonly KernelInterface $kernel,
        private readonly RequestStack $requestStack,
        private readonly Filesystem $filesystem,
    ) {}

    public function store(UploadedFile $file, string $bucket, string $pathPrefix): string
    {
        $normalizedBucket = strtolower(trim($bucket));
        if (!in_array($normalizedBucket, self::ALLOWED_BUCKETS, true)) {
            throw new \InvalidArgumentException('Bucket non valido.');
        }

        $size = $file->getSize() ?? 0;
        if ($size > self::MAX_UPLOAD_BYTES) {
            throw new \InvalidArgumentException('File troppo grande (max 1 MB dopo compressione).');
        }

        $mimeType = $this->detectMimeType($file);
        $extension = self::MIME_TO_EXTENSION[$mimeType] ?? null;
        if ($extension === null) {
            throw new \InvalidArgumentException('Formato file non supportato. Usa JPG, PNG, WEBP o GIF.');
        }

        $safePrefix = preg_replace('/[^a-zA-Z0-9_-]/', '', $pathPrefix) ?: 'misc';
        $relativeDirectory = sprintf('uploads/admin/%s/%s', $normalizedBucket, $safePrefix);
        $absoluteDirectory = $this->kernel->getProjectDir().'/public/'.$relativeDirectory;
        $filename = sprintf('%s-%s.%s', date('YmdHis'), bin2hex(random_bytes(4)), $extension);

        $this->filesystem->mkdir($absoluteDirectory);
        $file->move($absoluteDirectory, $filename);

        return $this->buildPublicUrl($relativeDirectory.'/'.$filename);
    }

    private function buildPublicUrl(string $relativePath): string
    {
        $path = '/'.ltrim($relativePath, '/');
        $request = $this->requestStack->getCurrentRequest();

        if ($request !== null) {
            return rtrim($request->getSchemeAndHttpHost(), '/').$path;
        }

        $fallbackBaseUrl = $_ENV['SYMFONY_API_URL'] ?? $_ENV['NEXT_PUBLIC_SYMFONY_API_URL'] ?? null;
        if (is_string($fallbackBaseUrl) && $fallbackBaseUrl !== '') {
            return rtrim($fallbackBaseUrl, '/').$path;
        }

        return $path;
    }

    private function detectMimeType(UploadedFile $file): string
    {
        $finfo = new \finfo(\FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file->getPathname());

        if (is_string($mimeType) && $mimeType !== '') {
            return $mimeType;
        }

        return $file->getClientMimeType() ?? '';
    }
}
