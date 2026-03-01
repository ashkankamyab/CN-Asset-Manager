# User Guide: Assets

Assets are the core data model in CN-Asset-Manager. Every discovered AWS resource and every manually tracked item is stored as an asset.

## Asset Types

| Type | Key | Description |
|------|-----|-------------|
| AWS Service | `AWS_SERVICE` | Resources discovered from AWS accounts |
| Self-Hosted | `SELF_HOSTED` | On-premises or self-managed cloud services |
| SaaS | `SAAS` | Third-party software-as-a-service tools |
| On-Premise | `ON_PREMISE` | Physical or traditional infrastructure |

## Asset Fields

### General

| Field | Description |
|-------|-------------|
| Asset ID | Auto-generated identifier (format: `ASSET-XXXX`) |
| Name | Resource name (from AWS Name tag or service identifier) |
| Asset Type | One of: AWS_SERVICE, SELF_HOSTED, SAAS, ON_PREMISE |
| Category | Optional grouping (user-defined categories with icon and color) |
| Status | ACTIVE, INACTIVE, DECOMMISSIONED, UNKNOWN |
| Criticality | CRITICAL, HIGH, MEDIUM, LOW |
| Owner | Person or team responsible |
| Department | Organizational department |
| Vendor | Software or service vendor |
| Version | Software version |
| URL | Link to the resource or documentation |
| Description | Free-text description |
| Notes | Additional notes |

### AWS-Specific

| Field | Description |
|-------|-------------|
| AWS Account | The account this resource belongs to |
| AWS Region | The region where the resource lives |
| AWS Resource ID | Service-specific ID (e.g., `i-0abc123`, `vpc-xyz`) |
| AWS Resource ARN | Full Amazon Resource Name |
| AWS Service Type | EC2, EKS, RDS, S3, LAMBDA, etc. (see [Discovery](discovery.md)) |

### Network

| Field | Description |
|-------|-------------|
| IP Addresses | List of private and public IPs |
| DNS Names | List of DNS hostnames |

### Tags and Metadata

| Field | Description |
|-------|-------------|
| Tags | Key-value pairs from AWS resource tags |
| Metadata | Service-specific metadata (JSON) — instance type, engine version, etc. |

### Compliance

| Field | Type | Description |
|-------|------|-------------|
| Data Classification | Choice | PUBLIC, INTERNAL, CONFIDENTIAL, STRICTLY_CONFIDENTIAL |
| GDPR Relevant | Boolean | Whether the resource processes GDPR-relevant data |
| Contains Personal Data | Boolean | Whether the resource stores personal data |
| Backup Enabled | Boolean | Whether backups are configured |
| Monitoring Enabled | Boolean | Whether monitoring is active |

### Timestamps

| Field | Description |
|-------|-------------|
| Discovered At | When the asset was first found by discovery |
| Last Seen At | When the asset was last confirmed by discovery |
| Created At | Database record creation time |
| Updated At | Last database update time |
| Is Manually Added | Whether the asset was added by a user (not discovered) |

## Viewing Assets

The **Assets** page shows a paginated table with 50 assets per page. The table includes:

- Checkbox (for bulk selection)
- Asset ID, Name (with hover card preview)
- Service/Type, Criticality badge, Status badge
- Created date, Last seen date
- Account name, Region, Owner, Department
- Edit button (admin only)

### Hover Cards

Hovering over an asset name shows a preview card with key details: type, service, account, region, status, criticality, ARN, and IPs.

### Detail View

Click an asset row to see the full detail page with all fields organized into sections:

1. General Information
2. AWS Details
3. Compliance & Security
4. Network (IPs and DNS)
5. Tags
6. Metadata (JSON)
7. Outgoing Relationships
8. Incoming Relationships
9. Notes

## Filtering

### Include Filters

| Filter | Description |
|--------|-------------|
| Search | Full-text search across name, asset ID, ARN, and resource ID |
| Asset Type | Filter by AWS_SERVICE, SELF_HOSTED, SAAS, ON_PREMISE |
| AWS Service | Filter by specific service (EC2, RDS, S3, etc.) |
| Criticality | Filter by CRITICAL, HIGH, MEDIUM, LOW |
| Status | Filter by ACTIVE, INACTIVE, DECOMMISSIONED, UNKNOWN |
| AWS Account | Filter by specific account |
| Region | Filter by AWS region |

### Exclude Filters

You can also **exclude** specific values from results:

| Exclude Filter | Description |
|----------------|-------------|
| Exclude Services | Hide specific service types from results |
| Exclude Types | Hide specific asset types |
| Exclude Criticalities | Hide specific criticality levels |
| Exclude Statuses | Hide specific statuses |

### Filter Behavior

- Filters are applied as AND conditions (all must match)
- Exclude filters remove matching items from the results
- Filters persist in the browser session (restored on page reload)
- The active filter count is shown as a badge
- Clear individual filters or all filters at once

### Sorting

Click any column header to sort. Click again to reverse the sort direction. Default sort: newest first (`-created_at`).

## Creating Assets

Admin users can manually add assets:

1. Go to **Assets** and click **Add Asset**
2. Fill in the required fields (name, type)
3. Optionally set AWS details, compliance fields, tags, IPs, and DNS names
4. Click **Save**

Manually added assets have `is_manually_added = True` and are not affected by discovery.

## Editing Assets

Admin users can edit any asset by clicking the **Edit** button. All fields are editable, including compliance metadata, tags, and relationships.

## Decommissioning

To decommission an asset:

1. Open the asset detail page
2. Click **Decommission** (admin only)
3. The asset's status is set to `DECOMMISSIONED`

Decommissioned assets are hidden from the default asset list (which filters to non-decommissioned assets).

## Bulk Operations

Select multiple assets using the checkboxes, then use the bulk action toolbar:

### Bulk Update

Update these fields on all selected assets at once:

| Field | Options |
|-------|---------|
| Owner | Free text |
| Criticality | CRITICAL, HIGH, MEDIUM, LOW |
| Data Classification | PUBLIC, INTERNAL, CONFIDENTIAL, STRICTLY_CONFIDENTIAL |

### Bulk Add Dependency

Create a relationship from all selected assets to a single target asset:

1. Select the source assets
2. Choose the relationship type: DEPENDS_ON, CONTAINS, CONNECTS_TO, or MANAGED_BY
3. Search and select the target asset
4. The relationship is created for each selected asset

## Relationships

Assets can be linked together with typed relationships:

| Type | Meaning |
|------|---------|
| DEPENDS_ON | Source depends on the target to function |
| CONTAINS | Source contains or includes the target |
| CONNECTS_TO | Source connects to the target (network, API, etc.) |
| MANAGED_BY | Source is managed by the target |

Each relationship has:
- Source and target asset
- Relationship type
- Optional description

Relationships are shown in the asset detail page as outgoing (this asset → other) and incoming (other → this asset).

### Adding Relationships

On the asset edit form:
1. In the Relationships section, search for a target asset
2. Select the relationship type
3. Optionally add a description
4. Save the asset

### Deleting Relationships

On the asset edit form, click the delete button next to any relationship to remove it.

## Categories

Asset categories provide optional grouping with visual customization:

| Field | Description |
|-------|-------------|
| Name | Category name (unique) |
| Description | What this category represents |
| Icon | Bootstrap Icons class (e.g., `bi-cloud`) |
| Color | Color code for the category badge |

Categories are managed via the API and can be assigned to any asset.
