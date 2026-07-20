# Deploy checklist VPS — Symfony skeleton

Questa checklist contiene solo comandi/template. Non inserire valori reali in Git.

## 1. Preparazione directory e dipendenze

```bash
cd /var/www/styll/symfony-app
composer install --no-dev --optimize-autoloader
mkdir -p config/jwt var/cache var/log var/share
chmod 750 var var/cache var/log var/share
```

## 2. Generazione segreti reali sulla VPS

Eseguire questi comandi solo sulla VPS:

```bash
umask 077
APP_SECRET="$(openssl rand -hex 32)"
POSTGRES_PASSWORD="$(openssl rand -base64 48 | tr -d '\n')"
JWT_PASSPHRASE="$(openssl rand -hex 32)"
MERCURE_JWT_SECRET="$(openssl rand -hex 32)"
```

Creare la keypair JWT produzione sulla VPS:

```bash
mkdir -p config/jwt
chmod 700 config/jwt
APP_ENV=prod \
JWT_SECRET_KEY="$PWD/config/jwt/private.pem" \
JWT_PUBLIC_KEY="$PWD/config/jwt/public.pem" \
JWT_PASSPHRASE="$JWT_PASSPHRASE" \
php bin/console lexik:jwt:generate-keypair --overwrite --no-interaction
chmod 600 config/jwt/private.pem
chmod 644 config/jwt/public.pem
```

## 3. Creazione file ambiente reale

Creare il file ambiente reale fuori da Git, sostituendo domini e proxy:

```bash
cat > ../.env <<EOF
APP_ENV=prod
APP_DEBUG=0
APP_SECRET=$APP_SECRET
POSTGRES_DB=styll
POSTGRES_USER=styll
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_PASSPHRASE=$JWT_PASSPHRASE
MERCURE_JWT_SECRET=$MERCURE_JWT_SECRET
MERCURE_PUBLIC_URL=https://CHANGE_ME_PRODUCTION_API_DOMAIN/.well-known/mercure
MERCURE_CORS_ORIGINS=https://CHANGE_ME_PRODUCTION_FRONTEND_DOMAIN
EOF
chmod 600 ../.env
```

Se Symfony viene eseguito fuori dal container PHP, creare anche `.env.local` in `symfony-app/`:

```bash
cat > .env.local <<EOF
APP_ENV=prod
APP_DEBUG=0
APP_SECRET=$APP_SECRET
DATABASE_URL=postgresql://styll:$POSTGRES_PASSWORD@127.0.0.1:5432/styll?serverVersion=16&charset=utf8
JWT_SECRET_KEY=%kernel.project_dir%/config/jwt/private.pem
JWT_PUBLIC_KEY=%kernel.project_dir%/config/jwt/public.pem
JWT_PASSPHRASE=$JWT_PASSPHRASE
MERCURE_URL=http://mercure/.well-known/mercure
MERCURE_PUBLIC_URL=https://CHANGE_ME_PRODUCTION_API_DOMAIN/.well-known/mercure
MERCURE_JWT_SECRET=$MERCURE_JWT_SECRET
MERCURE_CORS_ORIGINS=https://CHANGE_ME_PRODUCTION_FRONTEND_DOMAIN
EOF
chmod 600 .env.local
```

## 4. Bootstrap database e servizi

Da root repository sulla VPS:

```bash
cd /var/www/styll
docker compose up -d postgres
docker compose logs --no-color postgres
docker compose up -d php nginx mercure
docker compose ps
```

Verificare che gli init script abbiano creato sia `styll` sia `styll_test`:

```bash
docker compose exec postgres psql -U styll -d styll -c '\dt'
docker compose exec postgres psql -U styll -d styll_test -c '\dt'
```

## 5. Check Symfony produzione

```bash
cd /var/www/styll/symfony-app
APP_ENV=prod php bin/console cache:clear
APP_ENV=prod php bin/console doctrine:schema:validate --skip-sync
APP_ENV=prod php bin/console debug:router | grep -E 'api_login|api_clients'
```

## 6. Check sicurezza prima del go-live

```bash
git log --all --full-history -- "**/jwt/*" --oneline
find config/jwt -type f -maxdepth 1 -exec ls -l {} \;
grep -R "CHANGE_ME" ../.env .env.local
```

Il deploy reale richiede approvazione umana per dominio, DNS, TLS, reverse proxy e valori finali dei provider esterni.
