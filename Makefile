export UID := $(shell id -u)
export GID := $(shell id -g)

.PHONY: setup up down sh migrate fresh seed test pint logs install

setup:
	@if [ ! -f apps/api/.env ]; then cp apps/api/.env.example apps/api/.env; fi
	@if [ ! -f apps/web/.env ]; then cp apps/web/.env.example apps/web/.env; fi
	$(MAKE) install
	docker compose exec api php artisan key:generate

install: up
	docker compose exec api composer install
	docker compose exec web npm install

up:
	docker compose up -d --build

down:
	docker compose down

sh:
	docker compose exec api bash

migrate:
	docker compose exec api php artisan migrate

fresh:
	docker compose exec api php artisan migrate:fresh --seed

seed:
	docker compose exec api php artisan db:seed

test:
	docker compose exec api php artisan test

pint:
	docker compose exec api vendor/bin/pint

logs:
	docker compose logs -f
