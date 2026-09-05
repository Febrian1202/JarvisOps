#!/bin/sh
set -e

# Tunggu database siap bila DB_HOST disetel
if [ -n "$DB_HOST" ]; then
    echo "Checking database connection on $DB_HOST:$DB_PORT..."
    max_retries=30
    count=0
    until php -r "new PDO('mysql:host='.getenv('DB_HOST').';port='.getenv('DB_PORT').';dbname='.getenv('DB_DATABASE'), getenv('DB_USERNAME'), getenv('DB_PASSWORD'));" > /dev/null 2>&1 || [ $count -ge $max_retries ]; do
        echo "Database unavailable, waiting 2s... ($count/$max_retries)"
        sleep 2
        count=$((count + 1))
    done

    if [ $count -ge $max_retries ]; then
        echo "Error: Database connection timed out."
        exit 1
    fi
    echo "Database connected successfully."
fi

# Jalankan migrasi dan pemanasan cache hanya untuk container web API utama
if [ "$1" = "frankenphp" ]; then
    echo "Running production database migrations..."
    php artisan migrate --force

    echo "Optimizing framework configurations..."
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
fi

exec "$@"
