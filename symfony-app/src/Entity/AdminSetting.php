<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\AdminSettingRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: AdminSettingRepository::class)]
#[ORM\Table(name: 'admin_settings')]
class AdminSetting
{
    #[ORM\Id]
    #[ORM\Column(type: 'text')]
    private string $key;

    #[ORM\Column(type: 'json', options: ['default' => '{}'])]
    private array $value = [];

    #[ORM\Column(name: 'updated_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $updatedAt;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'updated_by', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?User $updatedBy = null;

    public function __construct()
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getKey(): string { return $this->key; }
    public function setKey(string $key): static { $this->key = $key; return $this; }
    public function getValue(): array { return $this->value; }
    public function setValue(array $value): static { $this->value = $value; return $this; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
    public function setUpdatedAt(\DateTimeImmutable $updatedAt): static { $this->updatedAt = $updatedAt; return $this; }
    public function getUpdatedBy(): ?User { return $this->updatedBy; }
    public function setUpdatedBy(?User $updatedBy): static { $this->updatedBy = $updatedBy; return $this; }
}
