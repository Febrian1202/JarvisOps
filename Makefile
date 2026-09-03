export UID := $(shell id -u)
export GID := $(shell id -g)

.PHONY: setup up down sh sh-web migrate fresh seed test pint logs install \
        test-api test-web lint-web typecheck-web build-web test-all check

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

sh-web:
	docker compose exec web sh

migrate:
	docker compose exec api php artisan migrate

fresh:
	docker compose exec api php artisan migrate:fresh --seed

seed:
	docker compose exec api php artisan db:seed

test: test-api

test-api:
	docker compose exec api php artisan test

test-web:
	docker compose exec web npm run test

lint-web:
	docker compose exec web npm run lint

typecheck-web:
	docker compose exec web npm run typecheck

build-web:
	docker compose exec web npm run build

test-all: test-api test-web

check: test-api pint lint-web typecheck-web test-web

pint:
	docker compose exec api vendor/bin/pint

logs:
	docker compose logs -f

