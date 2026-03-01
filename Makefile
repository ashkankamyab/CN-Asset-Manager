.PHONY: install migrate run discover shell superuser frontend-install frontend-dev frontend-build redis celery helm-deps helm-lint helm-template helm-install helm-uninstall

install:
	cd backend && pip install -r requirements.txt

migrate:
	cd backend && python manage.py migrate

run:
	cd backend && python manage.py runserver

discover:
	cd backend && python manage.py discover_aws

shell:
	cd backend && python manage.py shell

superuser:
	cd backend && python manage.py createsuperuser

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

redis:
	docker compose up -d redis

celery:
	cd backend && celery -A config worker -l info

setup: install migrate frontend-install
	@echo "Setup complete. Run 'make run' to start the server."

# --- Helm ---
helm-deps:
	helm dependency build helm/cn-asset-manager

helm-lint:
	helm lint helm/cn-asset-manager

helm-template:
	helm template cn helm/cn-asset-manager

helm-install:
	helm install cn helm/cn-asset-manager

helm-uninstall:
	helm uninstall cn
