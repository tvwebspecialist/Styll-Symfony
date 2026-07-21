<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use App\Repository\ClientImportJobRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

#[ApiResource(
    operations: [
        new GetCollection(),
    ],
    normalizationContext: ['groups' => ['client_import_job:read']],
)]
#[ORM\Entity(repositoryClass: ClientImportJobRepository::class)]
#[ORM\Table(name: 'client_import_jobs')]
#[ORM\Index(name: 'idx_client_import_jobs_tenant', columns: ['tenant_id', 'created_at'])]
class ClientImportJob
{
    public const SOURCE_FRESHA = 'fresha';
    public const SOURCE_TREATWELL = 'treatwell';
    public const SOURCE_BOOKSY = 'booksy';
    public const SOURCE_CSV_GENERIC = 'csv_generic';

    public const STATUS_COMPLETED = 'completed';
    public const STATUS_PARTIAL = 'partial';
    public const STATUS_FAILED = 'failed';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups(['client_import_job:read'])]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(name: 'initiated_by', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Profile $initiatedBy = null;

    #[ORM\Column(type: 'string', length: 50, nullable: true)]
    #[Groups(['client_import_job:read'])]
    private ?string $source = null;

    #[ORM\Column(type: 'string', length: 500, nullable: true)]
    #[Groups(['client_import_job:read'])]
    private ?string $filename = null;

    #[ORM\Column(name: 'total_rows', type: 'integer', options: ['default' => 0])]
    #[Groups(['client_import_job:read'])]
    private int $totalRows = 0;

    #[ORM\Column(name: 'imported_count', type: 'integer', options: ['default' => 0])]
    #[Groups(['client_import_job:read'])]
    private int $importedCount = 0;

    #[ORM\Column(name: 'skipped_count', type: 'integer', options: ['default' => 0])]
    #[Groups(['client_import_job:read'])]
    private int $skippedCount = 0;

    #[ORM\Column(name: 'error_count', type: 'integer', options: ['default' => 0])]
    #[Groups(['client_import_job:read'])]
    private int $errorCount = 0;

    #[ORM\Column(name: 'merged_count', type: 'integer', options: ['default' => 0])]
    #[Groups(['client_import_job:read'])]
    private int $mergedCount = 0;

    #[ORM\Column(type: 'json', options: ['default' => '[]'])]
    #[Groups(['client_import_job:read'])]
    private array $errors = [];

    #[ORM\Column(type: 'string', length: 20, options: ['default' => self::STATUS_COMPLETED])]
    #[Groups(['client_import_job:read'])]
    private string $status = self::STATUS_COMPLETED;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    #[Groups(['client_import_job:read'])]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getTenant(): Tenant { return $this->tenant; }
    public function setTenant(Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getInitiatedBy(): ?Profile { return $this->initiatedBy; }
    public function setInitiatedBy(?Profile $initiatedBy): static { $this->initiatedBy = $initiatedBy; return $this; }
    public function getSource(): ?string { return $this->source; }
    public function setSource(?string $source): static { $this->source = $source; return $this; }
    public function getFilename(): ?string { return $this->filename; }
    public function setFilename(?string $filename): static { $this->filename = $filename; return $this; }
    public function getTotalRows(): int { return $this->totalRows; }
    public function setTotalRows(int $totalRows): static { $this->totalRows = $totalRows; return $this; }
    public function getImportedCount(): int { return $this->importedCount; }
    public function setImportedCount(int $importedCount): static { $this->importedCount = $importedCount; return $this; }
    public function getSkippedCount(): int { return $this->skippedCount; }
    public function setSkippedCount(int $skippedCount): static { $this->skippedCount = $skippedCount; return $this; }
    public function getErrorCount(): int { return $this->errorCount; }
    public function setErrorCount(int $errorCount): static { $this->errorCount = $errorCount; return $this; }
    public function getMergedCount(): int { return $this->mergedCount; }
    public function setMergedCount(int $mergedCount): static { $this->mergedCount = $mergedCount; return $this; }
    public function getErrors(): array { return $this->errors; }
    public function setErrors(array $errors): static { $this->errors = $errors; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): static { $this->status = $status; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
