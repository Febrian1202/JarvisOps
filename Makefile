export UID := $(shell id -u)
export GID := $(shell id -g)

.PHONY: up down sh migrate fresh seed test pint logs

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
