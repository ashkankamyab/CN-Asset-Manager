# CN-Asset-Manager

AWS cloud asset discovery and cost management tool for TISAX certification compliance.

Automatically discovers 15+ AWS service types across multiple accounts, tracks asset inventory with compliance metadata, and provides cost visibility through a modern web interface.

## Quick Start

```bash
make setup          # install deps + migrate
make superuser      # create admin user
make redis          # start Redis (Docker)
make run            # start Django (terminal 1)
make celery         # start Celery worker (terminal 2)
make frontend-dev   # start Vite dev server (terminal 3)
```

Open http://localhost:5173 — default login: `superadmin` / `changeme`

## Deploy

**Docker Compose:**
```bash
docker compose up -d
```

**Kubernetes (Helm):**
```bash
helm install cn oci://ghcr.io/ashkankamyab/cn-asset-manager/cn-asset-manager \
  --version 0.1.0 --set app.secretKey="your-secret"
```

## Documentation

Full documentation is available on the **[Wiki](https://github.com/ashkankamyab/CN-Asset-Manager/wiki)** and in the [`docs/`](docs/) directory:

- [Architecture](https://github.com/ashkankamyab/CN-Asset-Manager/wiki/Architecture) — tech stack, system diagram, data flow
- [Getting Started](https://github.com/ashkankamyab/CN-Asset-Manager/wiki/Getting-Started) — prerequisites, setup, first run
- [Configuration](https://github.com/ashkankamyab/CN-Asset-Manager/wiki/Configuration) — environment variables, runtime settings
- [Docker Compose](https://github.com/ashkankamyab/CN-Asset-Manager/wiki/Deployment-Docker-Compose) — production deployment
- [Kubernetes](https://github.com/ashkankamyab/CN-Asset-Manager/wiki/Deployment-Kubernetes) — Helm chart with all options
- [API Reference](https://github.com/ashkankamyab/CN-Asset-Manager/wiki/API-Reference) — full REST API docs
- [AWS Permissions](https://github.com/ashkankamyab/CN-Asset-Manager/wiki/AWS-Permissions) — IAM policy, cross-account roles
- [User Guide](https://github.com/ashkankamyab/CN-Asset-Manager/wiki/User-Guide-Accounts) — accounts, discovery, assets, exports, admin
- [Development](https://github.com/ashkankamyab/CN-Asset-Manager/wiki/Development) — contributing, project structure, CI/CD
