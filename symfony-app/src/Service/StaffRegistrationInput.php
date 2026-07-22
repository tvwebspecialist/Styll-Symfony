<?php

declare(strict_types=1);

namespace App\Service;

final readonly class StaffRegistrationInput
{
    public function __construct(
        public string $email,
        public string $password,
        public string $businessName,
        public ?string $fullName = null,
        public ?string $businessType = null,
        public string $legalAcceptanceSource = \App\Entity\LegalAcceptanceEvent::SOURCE_EMAIL_PASSWORD_REGISTER,
        public string $registrationSource = 'self_service_symfony',
        public ?string $avatarUrl = null,
    ) {}
}
