<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\StaffServiceRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: StaffServiceRepository::class)]
#[ORM\Table(name: 'staff_services')]
#[ORM\UniqueConstraint(name: 'uniq_staff_service', columns: ['staff_id', 'service_id'])]
class StaffService
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\ManyToOne(targetEntity: StaffMember::class)]
    #[ORM\JoinColumn(name: 'staff_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private StaffMember $staff;

    #[ORM\ManyToOne(targetEntity: Service::class)]
    #[ORM\JoinColumn(name: 'service_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Service $service;

    public function __construct()
    {
        $this->id = Uuid::v4();
    }

    public function getId(): Uuid { return $this->id; }
    public function getTenant(): Tenant { return $this->tenant; }
    public function setTenant(Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getStaff(): StaffMember { return $this->staff; }
    public function setStaff(StaffMember $staff): static { $this->staff = $staff; return $this; }
    public function getService(): Service { return $this->service; }
    public function setService(Service $service): static { $this->service = $service; return $this; }
}
