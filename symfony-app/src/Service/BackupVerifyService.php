<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\BackupRun;
use Symfony\Component\Uid\Uuid;

/**
 * Verifies a PostgreSQL backup by restoring it to an isolated temp database.
 *
 * Requires pg_restore and rclone to be installed in the PHP container.
 * B2 credentials (B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET) must be set via env.
 */
final class BackupVerifyService
{
    private string $dbHost;
    private int $dbPort;
    private string $dbUser;
    private string $dbPassword;

    public function __construct(
        string $databaseUrl,
        private readonly string $b2KeyId,
        private readonly string $b2AppKey,
        private readonly string $b2Bucket,
        private readonly string $b2Prefix,
    ) {
        $parts = parse_url($databaseUrl);
        $this->dbHost = $parts['host'] ?? 'postgres';
        $this->dbPort = $parts['port'] ?? 5432;
        $this->dbUser = rawurldecode($parts['user'] ?? 'styll');
        $this->dbPassword = rawurldecode($parts['pass'] ?? '');
    }

    /**
     * @return array{success: bool, table_count: int, tables: string[], error: string|null}
     */
    public function verify(BackupRun $run, int $timeoutSeconds = 120): array
    {
        if ($run->getFileName() === null) {
            return $this->fail('BackupRun has no file_name');
        }
        if ($run->getStatus() !== 'success') {
            return $this->fail('Only successful backups can be verified');
        }
        if (!$this->b2KeyId || !$this->b2AppKey || !$this->b2Bucket) {
            return $this->fail('B2 credentials not configured (B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET)');
        }

        $tmpFile = sys_get_temp_dir() . '/bkpverify_' . bin2hex(random_bytes(8)) . '.dump';
        $tempDbName = 'styll_verify_' . substr(str_replace('-', '', (string) Uuid::v4()), 0, 12);

        try {
            // 1. Download from B2
            $this->downloadFromB2($run->getFileName(), $tmpFile, $timeoutSeconds);

            $adminPdo = $this->connectPdo('postgres');
            $adminPdo->exec(sprintf('CREATE DATABASE "%s"', $tempDbName));

            try {
                // 2. Restore into temp DB
                $cmd = [
                    'pg_restore',
                    '-h', $this->dbHost,
                    '-p', (string) $this->dbPort,
                    '-U', $this->dbUser,
                    '-d', $tempDbName,
                    '--no-owner',
                    '--no-acl',
                    $tmpFile,
                ];
                [$exitCode, , $stderr] = $this->runRaw($cmd, ['PGPASSWORD' => $this->dbPassword], $timeoutSeconds);

                // 3. Count tables regardless of exit code (pg_restore exits 1 for warnings)
                $tempPdo = $this->connectPdo($tempDbName);
                $stmt = $tempPdo->query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
                $tables = $stmt->fetchAll(\PDO::FETCH_COLUMN);
                $tableCount = count($tables);

                if ($exitCode !== 0 && $tableCount === 0) {
                    return $this->fail('pg_restore failed (exit ' . $exitCode . '): ' . substr($stderr, 0, 400));
                }

                return [
                    'success' => true,
                    'table_count' => $tableCount,
                    'tables' => $tables,
                    'error' => $exitCode !== 0 ? 'Restored with warnings: ' . substr($stderr, 0, 200) : null,
                ];
            } finally {
                // 4. Drop temp DB — always
                try {
                    $adminPdo->exec(sprintf(
                        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '%s'",
                        $tempDbName
                    ));
                    $adminPdo->exec(sprintf('DROP DATABASE IF EXISTS "%s"', $tempDbName));
                } catch (\Exception) {
                    // best-effort
                }
            }
        } catch (\RuntimeException $e) {
            return $this->fail($e->getMessage());
        } finally {
            if (file_exists($tmpFile)) {
                @unlink($tmpFile);
            }
        }
    }

    private function downloadFromB2(string $fileName, string $dest, int $timeout): void
    {
        $remote = 'styllb2:' . $this->b2Bucket;
        if ($this->b2Prefix !== '') {
            $remote .= '/' . rtrim($this->b2Prefix, '/');
        }
        $remote .= '/' . $fileName;

        $this->run(
            ['rclone', 'copyto', $remote, $dest, '--stats', '0'],
            [
                'RCLONE_CONFIG_STYLLB2_TYPE' => 'b2',
                'RCLONE_CONFIG_STYLLB2_ACCOUNT' => $this->b2KeyId,
                'RCLONE_CONFIG_STYLLB2_KEY' => $this->b2AppKey,
                'RCLONE_CONFIG_STYLLB2_HARD_DELETE' => 'true',
                'HOME' => sys_get_temp_dir(),
            ],
            $timeout,
            'B2 download failed'
        );
    }

    private function connectPdo(string $dbName): \PDO
    {
        $dsn = sprintf('pgsql:host=%s;port=%d;dbname=%s', $this->dbHost, $this->dbPort, $dbName);
        return new \PDO($dsn, $this->dbUser, $this->dbPassword, [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]);
    }

    private function run(array $cmd, array $env, int $timeout, string $ctx): void
    {
        [$exitCode, , $stderr] = $this->runRaw($cmd, $env, $timeout);
        if ($exitCode !== 0) {
            throw new \RuntimeException("{$ctx} (exit {$exitCode}): " . substr($stderr, 0, 400));
        }
    }

    /** @return array{int, string, string} [exitCode, stdout, stderr] */
    private function runRaw(array $cmd, array $env, int $timeout): array
    {
        $mergedEnv = array_merge(getenv() ?: [], $env);
        $pipes = [];
        $proc = proc_open(
            $cmd,
            [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $pipes,
            null,
            $mergedEnv
        );

        if (!is_resource($proc)) {
            throw new \RuntimeException('proc_open failed for: ' . implode(' ', $cmd));
        }

        fclose($pipes[0]);
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        $stdout = '';
        $stderr = '';
        $deadline = time() + $timeout;

        while (proc_get_status($proc)['running']) {
            $stdout .= (string) stream_get_contents($pipes[1]);
            $stderr .= (string) stream_get_contents($pipes[2]);
            if (time() > $deadline) {
                proc_terminate($proc, 9);
                fclose($pipes[1]);
                fclose($pipes[2]);
                proc_close($proc);
                throw new \RuntimeException('Command timed out after ' . $timeout . 's');
            }
            usleep(200_000);
        }

        $stdout .= (string) stream_get_contents($pipes[1]);
        $stderr .= (string) stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $exitCode = proc_close($proc);

        return [$exitCode, $stdout, $stderr];
    }

    /** @return array{success: false, table_count: 0, tables: array<never>, error: string} */
    private function fail(string $msg): array
    {
        return ['success' => false, 'table_count' => 0, 'tables' => [], 'error' => $msg];
    }
}
