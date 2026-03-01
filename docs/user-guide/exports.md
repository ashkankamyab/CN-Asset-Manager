# User Guide: Exports

CN-Asset-Manager supports exporting the asset inventory to CSV and Excel formats.

## Exporting

1. Go to the **Assets** page
2. **Apply filters** to narrow down the results you want to export (optional but recommended)
3. Click **CSV** or **Excel** in the export toolbar

The export uses the same filters currently active on the page — what you see in the table is what gets exported.

## CSV Export

**Filename:** `tisax_assets.csv`

The CSV file contains one row per asset with these columns:

| Column | Description |
|--------|-------------|
| Asset ID | Auto-generated ID (ASSET-XXXX) |
| Name | Asset name |
| Type | Asset type (AWS_SERVICE, SELF_HOSTED, etc.) |
| AWS Service | AWS service type (EC2, RDS, S3, etc.) |
| AWS Account | Account name |
| Region | AWS region |
| Resource ID | AWS resource ID |
| ARN | AWS Resource Name |
| Status | ACTIVE, INACTIVE, etc. |
| Criticality | CRITICAL, HIGH, MEDIUM, LOW |
| Owner | Assigned owner |
| Department | Department |
| Version | Software version |
| Data Classification | PUBLIC, INTERNAL, CONFIDENTIAL, STRICTLY_CONFIDENTIAL |
| GDPR Relevant | Yes/No |
| Personal Data | Yes/No |
| Backup Enabled | Yes/No |
| Monitoring Enabled | Yes/No |
| Vendor | Vendor name |
| URL | Resource URL |
| IP Addresses | Comma-separated IPs |
| DNS Names | Comma-separated DNS names |
| Dependencies | Formatted relationship list |
| Description | Asset description |
| Notes | Additional notes |
| Last Audit Date&Time | ISO timestamp of last update |

## Excel Export

**Filename:** `tisax_assets.xlsx`

The Excel workbook contains four sheets:

### Sheet 1: Summary

Statistics overview:

- **By Service** — asset count per AWS service type
- **By Account** — asset count per AWS account
- **By Criticality** — asset count per criticality level

### Sheet 2: By Service

All assets grouped and sorted by AWS service type. Same columns as the CSV export.

### Sheet 3: By Account

All assets grouped and sorted by AWS account name. Same columns as the CSV export.

### Sheet 4: Full List

All assets in a flat list (same as CSV). Same columns as the CSV export.

### Formatting

- Header rows are bold white text on a dark blue background
- Column widths are auto-calculated based on content
- All sheets use the same column structure

## Dependencies Column Format

The Dependencies column in exports shows asset relationships as a formatted string. Each dependency includes the relationship type and target asset name.

## Filters Applied to Exports

The export endpoints accept the same query parameters as the asset list API:

| Parameter | Description |
|-----------|-------------|
| `search` | Full-text search |
| `asset_type` | Filter by asset type |
| `aws_service_type` | Filter by service |
| `criticality` | Filter by criticality |
| `status` | Filter by status |
| `aws_account` | Filter by account |
| `aws_region` | Filter by region |
| `department` | Filter by department |
| `exclude_asset_type` | Exclude specific types |
| `exclude_aws_service_type` | Exclude specific services |
| `exclude_criticality` | Exclude criticality levels |
| `exclude_status` | Exclude statuses |
| `exclude_aws_account` | Exclude accounts |
| `exclude_aws_region` | Exclude regions |

When you export from the UI, the current filter state is automatically passed to the export endpoint.
