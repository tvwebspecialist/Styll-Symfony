<?php

use Symfony\Component\Dotenv\Dotenv;

require dirname(__DIR__).'/vendor/autoload.php';

$projectDir = dirname(__DIR__);

if (method_exists(Dotenv::class, 'bootEnv')) {
    (new Dotenv())->bootEnv($projectDir.'/.env');
}

ensureTestJwtKeypair($projectDir);

if ($_SERVER['APP_DEBUG']) {
    umask(0000);
}

function ensureTestJwtKeypair(string $projectDir): void
{
    $appEnv = $_SERVER['APP_ENV'] ?? $_ENV['APP_ENV'] ?? null;
    if ('test' !== $appEnv) {
        return;
    }

    if (!extension_loaded('openssl')) {
        throw new RuntimeException('The OpenSSL extension is required to generate the JWT test keypair.');
    }

    $keyDir = $projectDir.'/var/jwt/test';
    $privateKeyPath = $keyDir.'/private.pem';
    $publicKeyPath = $keyDir.'/public.pem';
    $lockPath = $projectDir.'/var/jwt/test/.keypair.lock';

    if (isUsableKeypair($privateKeyPath, $publicKeyPath)) {
        return;
    }

    if (!is_dir($keyDir) && !mkdir($keyDir, 0700, true) && !is_dir($keyDir)) {
        throw new RuntimeException(sprintf('Unable to create JWT test key directory "%s".', $keyDir));
    }

    $lockHandle = fopen($lockPath, 'c');
    if (false === $lockHandle) {
        throw new RuntimeException(sprintf('Unable to create JWT test key lock file "%s".', $lockPath));
    }

    try {
        if (!flock($lockHandle, LOCK_EX)) {
            throw new RuntimeException(sprintf('Unable to acquire JWT test key lock "%s".', $lockPath));
        }

        if (isUsableKeypair($privateKeyPath, $publicKeyPath)) {
            return;
        }

        $keyResource = openssl_pkey_new([
            'private_key_bits' => 2048,
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
        ]);

        if (false === $keyResource) {
            throw new RuntimeException('Unable to generate the JWT test private key.');
        }

        if (!openssl_pkey_export($keyResource, $privateKey)) {
            throw new RuntimeException('Unable to export the JWT test private key.');
        }

        $details = openssl_pkey_get_details($keyResource);
        $publicKey = is_array($details) && isset($details['key']) && is_string($details['key'])
            ? $details['key']
            : null;

        if (null === $publicKey) {
            throw new RuntimeException('Unable to derive the JWT test public key.');
        }

        if (false === file_put_contents($privateKeyPath, $privateKey)) {
            throw new RuntimeException(sprintf('Unable to write the JWT test private key to "%s".', $privateKeyPath));
        }

        if (false === file_put_contents($publicKeyPath, $publicKey)) {
            throw new RuntimeException(sprintf('Unable to write the JWT test public key to "%s".', $publicKeyPath));
        }

        chmod($keyDir, 0700);
        chmod($privateKeyPath, 0600);
        chmod($publicKeyPath, 0644);
    } finally {
        flock($lockHandle, LOCK_UN);
        fclose($lockHandle);
    }
}

function isUsableKeypair(string $privateKeyPath, string $publicKeyPath): bool
{
    if (!is_file($privateKeyPath) || !is_file($publicKeyPath)) {
        return false;
    }

    return false !== openssl_pkey_get_private('file://'.$privateKeyPath)
        && false !== openssl_pkey_get_public('file://'.$publicKeyPath);
}
