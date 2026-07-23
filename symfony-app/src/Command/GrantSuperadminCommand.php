<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\Profile;
use App\Entity\User;
use App\Repository\ProfileRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:grant-superadmin',
    description: 'Grant Symfony superadmin access to an existing user.',
)]
final class GrantSuperadminCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UserRepository $userRepository,
        private readonly ProfileRepository $profileRepository,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addArgument('email', InputArgument::REQUIRED, 'Existing user email.');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $email = mb_strtolower(trim((string) $input->getArgument('email')));

        if ($email === '') {
            $io->error('Email obbligatoria.');

            return Command::INVALID;
        }

        $user = $this->userRepository->findOneBy(['email' => $email]);
        if (!$user instanceof User) {
            $io->error(sprintf('Utente "%s" non trovato.', $email));

            return Command::FAILURE;
        }

        $profile = $this->profileRepository->find($user->getId());
        if (!$profile instanceof Profile) {
            $io->error(sprintf('Profilo per "%s" non trovato.', $email));

            return Command::FAILURE;
        }

        $roles = $user->getRoles();
        if (!in_array('ROLE_SUPERADMIN', $roles, true)) {
            $roles[] = 'ROLE_SUPERADMIN';
            $user->setRoles(array_values(array_unique($roles)));
        }

        $profile
            ->setEmail($user->getEmail())
            ->setIsSuperadmin(true);

        $this->em->flush();

        $io->success(sprintf('Utente "%s" promosso a superadmin Symfony.', $email));

        return Command::SUCCESS;
    }
}
