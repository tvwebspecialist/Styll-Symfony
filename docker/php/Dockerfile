FROM php:8.2-fpm-alpine

# System deps
RUN apk add --no-cache \
    git \
    unzip \
    libpq-dev \
    libzip-dev \
    icu-dev \
    && docker-php-ext-install \
        pdo \
        pdo_pgsql \
        pgsql \
        zip \
        intl \
        opcache

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

COPY . .

ENV APP_ENV=prod

RUN composer install --no-interaction --optimize-autoloader --no-dev \
    && mkdir -p config/jwt \
    && chmod -R 777 var/

EXPOSE 9000
CMD ["php-fpm"]
