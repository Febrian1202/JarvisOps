# Stage 1: Build vendor & dependencies
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts

# Stage 2: Runtime Image
FROM dunglas/frankenphp:1-php8.4

RUN install-php-extensions \
    pdo_mysql \
    gd \
    zip \
    intl \
    bcmath \
    opcache

WORKDIR /app

# Salin konfigurasi PHP production
RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

# Salin vendor dari stage 1
COPY --from=vendor /app/vendor /app/vendor

# Salin aplikasi
COPY . /app

# Buat direktori storage yang dibutuhkan dan set permission
RUN mkdir -p /app/storage/app/private \
    /app/storage/app/public \
    /app/storage/framework/cache/data \
    /app/storage/framework/sessions \
    /app/storage/framework/views \
    /app/storage/logs \
    /app/bootstrap/cache && \
    chown -R www-data:www-data /app/storage /app/bootstrap/cache && \
    chmod -R 775 /app/storage /app/bootstrap/cache && \
    chmod +x /app/docker-entrypoint.sh

ENV SERVER_NAME="http://:8000"
ENV APP_ENV=production
ENV APP_DEBUG=false

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile"]
