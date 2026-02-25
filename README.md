# CN-Asset-Manager

A full-stack web application for discovering AWS resources across multiple accounts and managing cloud and non-cloud assets for TISAX certification compliance.

## Quick Start

```bash
# Install dependencies
make install
make frontend-install

# Run migrations
make migrate

# Create admin user
make superuser

# Start Redis (requires Docker)
make redis

# Start backend, Celery worker, and frontend (in separate terminals)
make run
make celery
make frontend-dev
```

Then open http://localhost:5173 in your browser (frontend dev server proxies API to Django on :8000).

## Features

- **AWS Resource Discovery** - Automatically discover EC2, EKS, RDS, ElastiCache, ALB/NLB, Lambda, ECR, Cognito, OpenSearch, S3, CloudFront, Route53 resources across multiple AWS accounts and regions
- **Multi-Account Support** - Manage root and member accounts with STS cross-account role assumption
- **Asset Inventory** - Track both discovered cloud assets and manually added non-cloud assets (SaaS, on-premise, self-hosted)
- **TISAX Compliance Fields** - Data classification, GDPR relevance, personal data flags, backup and monitoring status
- **Filtering & Search** - Filter by type, service, criticality, status, account, region; full-text search
- **Bulk Operations** - Update owner, criticality, or data classification for multiple assets at once
- **Export** - CSV and Excel exports with multiple sheets (summary, by-service, by-account, full list)
- **Dashboard** - Overview with stats, charts, and recent discovery activity

## AWS IAM Permissions

The discovery role needs the following read-only permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "TISAXDiscoveryReadOnly",
            "Effect": "Allow",
            "Action": [
                "ec2:Describe*",
                "elasticloadbalancing:Describe*",
                "eks:ListClusters",
                "eks:DescribeCluster",
                "rds:DescribeDBClusters",
                "rds:DescribeDBInstances",
                "rds:ListTagsForResource",
                "elasticache:DescribeCacheClusters",
                "lambda:ListFunctions",
                "lambda:GetFunction",
                "lambda:ListTags",
                "ecr:DescribeRepositories",
                "ecr:ListImages",
                "cognito-idp:ListUserPools",
                "cognito-idp:DescribeUserPool",
                "es:ListDomainNames",
                "es:DescribeDomain",
                "opensearch:ListDomainNames",
                "opensearch:DescribeDomain",
                "opensearch:ListTags",
                "s3:ListAllMyBuckets",
                "s3:GetBucketLocation",
                "s3:GetBucketTagging",
                "cloudfront:ListDistributions",
                "cloudfront:ListTagsForResource",
                "route53:ListHostedZones",
                "route53:ListTagsForResource",
                "sts:AssumeRole",
                "sts:GetCallerIdentity",
                "organizations:ListAccounts",
                "organizations:DescribeOrganization"
            ],
            "Resource": "*"
        }
    ]
}
```

For member accounts, create a role named `OrganizationAccountAccessRole` (or customize per account) with the above policy and a trust relationship allowing the root account to assume it.

## Running Discovery

### Via Web UI
Click "Run Discovery" in the top navigation bar, or go to Discovery > Jobs and select an account.

### Via Management Command
```bash
# Discover all active accounts
python manage.py discover_aws

# Discover a specific account
python manage.py discover_aws --account-id 123456789012

# Dry run (count without saving)
python manage.py discover_aws --dry-run
```

## Adding AWS Accounts

1. Go to **AWS Accounts** > **Add Account**
2. Enter the 12-digit Account ID, name, type (Root/Member), and environment
3. Test the connection using the plug icon
4. Run discovery

## Exports

- Navigate to **Assets** and apply desired filters
- Click **Export CSV** or **Export Excel**
- Excel exports include: Summary, By Service, By Account, and Full List sheets

## Database Configuration

Set `DATABASE_URL` in your `.env` file. Defaults to SQLite if not set.

```bash
# SQLite (default)
DATABASE_URL=sqlite:////absolute/path/to/db.sqlite3

# PostgreSQL
DATABASE_URL=postgres://user:password@localhost:5432/cn_assets

# MySQL
DATABASE_URL=mysql://user:password@localhost:3306/cn_assets
```

For PostgreSQL, install the driver: `pip install psycopg2-binary`
For MySQL, install the driver: `pip install mysqlclient`

Then run: `make migrate`

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | (insecure default) | Django secret key |
| `DEBUG` | `False` | Enable debug mode |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Allowed host headers |
| `AWS_DEFAULT_REGION` | `eu-central-1` | Default region for discovery |
| `DATABASE_URL` | `sqlite:///...db/cn_assets.db` | Database connection URL (SQLite, PostgreSQL, or MySQL) |
| `DISCOVERY_CONCURRENT_REGIONS` | `5` | Max parallel region discovery threads |
| `CELERY_BROKER_URL` | `redis://localhost:6379/0` | Redis URL for Celery task queue |

## Technology Stack

- **Backend:** Python 3.11+, Django 4.2+, Django REST Framework
- **Frontend:** React 18, TypeScript, Vite
- **Task Queue:** Celery + Redis
- **AWS SDK:** boto3
- **Exports:** openpyxl (Excel), CSV
- **Database:** SQLite (default), PostgreSQL, or MySQL
