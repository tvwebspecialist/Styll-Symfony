<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\Profile;
use App\Entity\StaffMember;
use App\Entity\User;
use App\Repository\TenantRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(
    name: 'app:create-staff-user',
    description: 'Create a staff user with a hashed password and an active tenant membership.',
)]
final class CreateStaffUserCommand extends Command
{
    private const ALLOWED_ROLES = ['owner', 'manager', 'staff', 'receptionist'];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly UserRepository $userRepository,
        private readonly TenantRepository $tenantRepository,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('email', InputArgument::REQUIRED, 'Staff email address.')
            ->addArgument('password', InputArgument::REQUIRED, 'Plain-text password to hash.')
            ->addArgument('tenant-slug', InputArgument::REQUIRED, 'Existing tenant slug.')
            ->addArgument('role', InputArgument::OPTIONAL, 'Staff role.', 'owner')
            ->addOption('full-name', null, InputOption::VALUE_REQUIRED, 'Full name shown in the staff profile.')
            ->addOption('show-on-website', null, InputOption::VALUE_NONE, 'Expose the staff member in public landing pages.');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $email = strtolower(trim((string) $input->getArgument('email')));
        $password = (string) $input->getArgument('password');
        $tenantSlug = trim((string) $input->getArgument('tenant-slug'));
        $role = strtolower(trim((string) $input->getArgument('role')));
        $fullName = trim((string) ($input->getOption('full-name') ?? ''));
        $showOnWebsite = (bool) $input->getOption('show-on-website');

        if ($email === '' || $password === '' || $tenantSlug === '') {
            $io->error('Email, password and tenant slug are required.');

            return Command::INVALID;
        }

        if (!in_array($role, self::ALLOWED_ROLES, true)) {
            $io->error(sprintf(
                'Unsupported role "%s". Allowed roles: %s.',
                $role,
                implode(', ', self::ALLOWED_ROLES),
            ));

            return Command::INVALID;
        }

        if ($this->userRepository->findOneBy(['email' => $email]) instanceof User) {
            $io->error(sprintf('A user with email "%s" already exists.', $email));

            return Command::FAILURE;
        }

        $tenant = $this->tenantRepository->findOneBy(['slug' => $tenantSlug]);
        if ($tenant === null) {
            $io->error(sprintf('Tenant "%s" was not found.', $tenantSlug));

            return Command::FAILURE;
        }

        $user = (new User())
            ->setEmail($email)
            ->setRoles(['ROLE_STAFF']);
        $user->setPassword($this->passwordHasher->hashPassword($user, $password));

        $profile = (new Profile($user))
            ->setUserType('staff')
            ->setEmail($email)
            ->setFullName($fullName !== '' ? $fullName : $this->inferFullNameFromEmail($email))
            ->setTimezone($tenant->getTimezone())
            ->setOnboardingCompleted(true);

        $staffMember = (new StaffMember())
            ->setTenant($tenant)
            ->setProfile($profile)
            ->setRole($role)
            ->setShowOnWebsite($showOnWebsite);

        $this->em->persist($user);
        $this->em->persist($profile);
        $this->em->persist($staffMember);
        $this->em->flush();

        $io->success(sprintf(
            'Created staff user "%s" for tenant "%s" with role "%s".',
            $email,
            $tenantSlug,
            $role,
        ));
        $io->definitionList(
            ['user_id' => (string) $user->getId()],
            ['profile_id' => (string) $profile->getId()],
            ['staff_member_id' => (string) $staffMember->getId()],
        );

        return Command::SUCCESS;
    }

    private function inferFullNameFromEmail(string $email): string
    {
        $localPart = explode('@', $email, 2)[0] ?? $email;
        $label = preg_replace('/[^a-z0-9]+/i', ' ', $localPart);
        $normalized = trim((string) $label);

        if ($normalized === '') {
            return 'Staff User';
        }

        return mb_convert_case($normalized, \MB_CASE_TITLE, 'UTF-8');
    }
}
