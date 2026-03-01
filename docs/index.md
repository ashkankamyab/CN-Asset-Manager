# CN-Asset-Manager Documentation

**Cloud Native Asset Manager** is an AWS cloud asset discovery and cost management tool. It automatically discovers resources across multiple AWS accounts, tracks asset inventory with compliance metadata, and provides cost visibility — all through a modern web interface.

## Features

- **AWS Resource Discovery** — automatically discovers 15+ AWS service types across multiple accounts and regions
- **Multi-Account Support** — manage AWS Organizations with management and member accounts, cross-account role assumption
- **Asset Inventory** — centralized view of all cloud and non-cloud assets with filtering, search, and bulk operations
- **Cost Management** — per-account cost tracking via AWS Cost Explorer with month-over-month comparison
- **Compliance Tracking** — data classification, GDPR relevance, backup/monitoring flags per asset
- **Export** — CSV and multi-sheet Excel exports with applied filters
- **Dashboard** — at-a-glance statistics, charts, and recent activity
- **Role-Based Access** — superadmin, admin, and read-only roles with optional OIDC SSO
- **Scheduled Discovery** — automated daily, weekly, or monthly discovery runs
- **Email Notifications** — password reset via SMTP, AWS SES, or Google Workspace

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](architecture.md) | System architecture, tech stack, and data flow |
| [Getting Started](getting-started.md) | Local development setup and first run |
| [Configuration](configuration.md) | All environment variables and runtime settings |
| **Deployment** | |
| [Docker Compose](deployment/docker-compose.md) | Production deployment with Docker Compose |
| [Kubernetes](deployment/kubernetes.md) | Helm chart deployment with all options |
| **User Guide** | |
| [AWS Accounts](user-guide/accounts.md) | Managing AWS accounts and credentials |
| [Discovery](user-guide/discovery.md) | Running and scheduling asset discovery |
| [Assets](user-guide/assets.md) | Asset inventory, filtering, and bulk operations |
| [Exports](user-guide/exports.md) | CSV and Excel export |
| [Administration](user-guide/administration.md) | User management, OIDC, email, settings |
| **Reference** | |
| [API Reference](api-reference.md) | Full REST API documentation |
| [AWS Permissions](aws-permissions.md) | IAM policy and cross-account role setup |
| [Development](development.md) | Contributing, project structure, and CI/CD |
