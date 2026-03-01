# User Guide: Discovery

Discovery is the process of scanning AWS accounts to find and catalog cloud resources.

## Supported AWS Services

CN-Asset-Manager discovers resources from 15+ AWS services:

| Service | Type Key | Scope | Examples |
|---------|----------|-------|---------|
| EC2 | `EC2` | Regional | Instances (running, stopped) |
| VPC | `VPC` | Regional | Virtual private clouds |
| EKS | `EKS` | Regional | Kubernetes clusters |
| RDS | `RDS` | Regional | Database instances and clusters |
| ElastiCache | `ELASTICACHE` | Regional | Redis/Memcached clusters |
| ALB / NLB | `ALB`, `NLB` | Regional | Application and Network load balancers |
| Lambda | `LAMBDA` | Regional | Serverless functions |
| ECR | `ECR` | Regional | Container image repositories |
| Cognito | `COGNITO` | Regional | User pools |
| OpenSearch | `OPENSEARCH` | Regional | Search domains |
| MSK | `MSK` | Regional | Managed Kafka clusters |
| S3 | `S3` | Global | Storage buckets |
| CloudFront | `CLOUDFRONT` | Global | CDN distributions |
| Route 53 | `ROUTE53` | Global | DNS hosted zones |

### Discovery Execution

- **Global services** (S3, CloudFront, Route 53) are discovered sequentially from a single API call
- **Regional services** are discovered in parallel using a thread pool (default: 5 concurrent threads)
- Each account's configured regions are scanned independently

## Triggering Discovery

### From the UI

1. Go to the **Discovery** page
2. Optionally select a specific account from the dropdown (or leave blank for all accounts)
3. Click **Run Discovery** (admin role required)

A discovery job is created and the task is queued. The page auto-refreshes every 3 seconds while a job is active.

### From the CLI

```bash
# Discover all accounts
cd backend && python manage.py discover_aws

# Discover a specific account
cd backend && python manage.py discover_aws --account-id 123456789012

# Dry run (count resources without saving)
cd backend && python manage.py discover_aws --dry-run
```

### Scheduled Discovery

Configure automatic discovery from **Settings > Discovery Interval**:

| Interval | Behavior |
|----------|----------|
| Disabled | No automatic discovery (default) |
| Daily | Runs if last discovery was more than 24 hours ago |
| Weekly | Runs if last discovery was more than 7 days ago |
| Monthly | Runs if last discovery was more than 30 days ago |

A Celery Beat task (`check_scheduled_discovery`) runs every hour to check if discovery is due. If the interval threshold has been exceeded and no job is currently running, a new discovery is triggered automatically.

## Discovery Jobs

Each discovery run creates a **DiscoveryJob** record that tracks:

| Field | Description |
|-------|-------------|
| Status | `PENDING` → `RUNNING` → `COMPLETED` or `FAILED` |
| Account | The specific account, or "All Accounts" |
| Resources Discovered | Total resources found |
| Resources New | Newly created assets |
| Resources Updated | Existing assets updated |
| Duration | Time elapsed from start to completion |
| Triggered By | Username of the user who triggered the job |
| Log Output | Detailed log of the discovery process |
| Error Message | Error details if the job failed |

### Job Statuses

| Status | Icon | Description |
|--------|------|-------------|
| PENDING | — | Job created, waiting for a Celery worker |
| RUNNING | Spinner | Worker is actively discovering resources |
| COMPLETED | Green | Discovery finished successfully |
| FAILED | Red | Discovery encountered an error |

### Viewing Job Details

Click a job ID on the Discovery page to see the full detail view, including:
- Job metadata (status, account, timing, triggered by)
- Resource statistics (discovered, new, updated)
- Live log output (auto-scrolls during active jobs)

## How Asset Upsert Works

When a resource is discovered, the application tries to match it to an existing asset in this priority order:

1. **ARN match** — if the `aws_resource_arn` matches an existing asset
2. **Resource ID + Account + Region** — if the resource ID, account, and region match together
3. **Name + Account + Service Type** — if the name, account, and service type match together

If a match is found, the existing asset is **updated** (last_seen_at is refreshed). If no match is found, a **new** asset is created.

### Data Set on New Assets

- `asset_type` = `AWS_SERVICE`
- `status` = `ACTIVE`
- `discovered_at` = current timestamp
- `last_seen_at` = current timestamp
- `is_manually_added` = `False`
- All AWS-specific fields (ARN, resource ID, region, service type, tags, metadata, IPs, DNS names)

### Data Updated on Existing Assets

- `last_seen_at` = current timestamp
- `status`, `tags`, `metadata`, `ip_addresses`, `dns_names` — refreshed from AWS

## Cost Refresh

After each discovery run, a cost refresh task is automatically triggered. This calls AWS Cost Explorer to fetch:

- **Current month cost** — from the 1st of the current month to today
- **Previous month cost** — the full previous month

Costs are attributed to individual accounts by their 12-digit account ID and displayed on the Dashboard and Accounts pages.

You can also trigger a manual cost refresh from the **Accounts** page using the **Refresh Costs** button.

## Time Limits

| Task | Time Limit |
|------|-----------|
| Discovery (`run_discovery_task`) | 30 minutes |
| Cost Refresh (`refresh_costs_task`) | 5 minutes |

If a task exceeds its time limit, Celery terminates it and the job is marked as FAILED.

## Conflict Prevention

Only one discovery job can be active (PENDING or RUNNING) at a time. If you try to trigger discovery while a job is already in progress, the API returns HTTP 409 Conflict.
