<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\BackupRunRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: BackupRunRepository::class)]
#[ORM\Table(name: 'backup_run')]
#[ORM\HasLifecycleCallbacks]
class BackupRun
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\Column(name: 'started_at', type: 'datetimetz_immutable', nullable: true)]
    private ?\DateTimeImmutable $startedAt = null;

    #[ORM\Column(name: 'finished_at', type: 'datetimetz_immutable', nullable: true)]
    private ?\DateTimeImmutable $finishedAt = null;

    /** 'success' or 'failure' */
    #[ORM\Column(type: 'string', length: 20)]
    private string $status;

    #[ORM\Column(name: 'file_name', type: 'string', length: 500, nullable: true)]
    private ?string $fileName = null;

    #[ORM\Column(name: 'size_bytes', type: 'bigint', nullable: true)]
    private ?int $sizeBytes = null;

    #[ORM\Column(name: 'error_message', type: 'text', nullable: true)]
    private ?string $errorMessage = null;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }

    public function getStartedAt(): ?\DateTimeImmutable { return $this->startedAt; }
    public function setStartedAt(?\DateTimeImmutable $v): static { $this->startedAt = $v; return $this; }

    public function getFinishedAt(): ?\DateTimeImmutable { return $this->finishedAt; }
    public function setFinishedAt(?\DateTimeImmutable $v): static { $this->finishedAt = $v; return $this; }

    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): static { $this->status = $status; return $this; }

    public function getFileName(): ?string { return $this->fileName; }
    public function setFileName(?string $v): static { $this->fileName = $v; return $this; }

    public function getSizeBytes(): ?int { return $this->sizeBytes; }
    public function setSizeBytes(?int $v): static { $this->sizeBytes = $v; return $this; }

    public function getErrorMessage(): ?string { return $this->errorMessage; }
    public function setErrorMessage(?string $v): static { $this->errorMessage = $v; return $this; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }

    public function toArray(): array
    {
        return [
            'id' => (string) $this->id,
            'started_at' => $this->startedAt?->format(\DateTimeInterface::ATOM),
            'finished_at' => $this->finishedAt?->format(\DateTimeInterface::ATOM),
            'status' => $this->status,
            'file_name' => $this->fileName,
            'size_bytes' => $this->sizeBytes,
            'error_message' => $this->errorMessage,
            'created_at' => $this->createdAt->format(\DateTimeInterface::ATOM),
        ];
    }
}
