# User Guide: AWS Accounts

AWS accounts are the starting point for asset discovery. CN-Asset-Manager supports AWS Organizations with management and member accounts.

## Account Types

| Type | Description | Credentials |
|------|-------------|-------------|
| **Management** | The root account in an AWS Organization. Has direct AWS credentials. | AWS access key + secret key stored in the application. |
| **Member** | A child account in an AWS Organization. Uses cross-account role assumption from its management account. | No direct credentials — assumes a role via the management account's credentials. |

## Adding a Management Account

1. Go to **AWS Accounts** and click **Add Account**
2. Fill in the fields:
   - **Account ID** — 12-digit AWS account ID
   - **Account Name** — display name
   - **Account Type** — select `Management`
   - **Environment** — `Production`, `Staging`, `Development`, or `Shared`
   - **AWS Access Key ID** — IAM user access key (see [AWS Permissions](../aws-permissions.md))
   - **AWS Secret Access Key** — IAM user secret key
   - **Discovery Regions** — select which regions to scan (defaults to `eu-central-1` and `us-east-1`)
3. Click **Save**
4. Click **Test Connection** to verify the credentials work

## Adding a Member Account

1. First, ensure the management account is already added
2. Go to **AWS Accounts** and click **Add Account**
3. Fill in the fields:
   - **Account ID** — 12-digit member account ID
   - **Account Name** — display name
   - **Account Type** — select `Member`
   - **Management Account** — select the parent management account
   - **Organization Role Name** — the IAM role name to assume in the member account (default: `OrganizationAccountAccessRole`)
   - **Environment** — select the appropriate environment
   - **Discovery Regions** — optionally override the regions to scan
4. Click **Save**

## Cross-Account Role Setup

For member accounts, the application assumes a role in the member account using the management account's credentials. This uses AWS STS `AssumeRole`.

### How It Works

```
Management Account (has credentials)
  → STS AssumeRole → Member Account Role
    → Discover resources in member account
```

### Default Role

AWS Organizations creates `OrganizationAccountAccessRole` in member accounts by default. If your organization uses a different role name, update the **Organization Role Name** field on the account.

### Custom Role

If you need a role with restricted permissions (recommended for production), create a custom role in the member account:

1. Create an IAM role in the member account with the [required permissions](../aws-permissions.md)
2. Set the trust policy to allow the management account to assume it:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "AWS": "arn:aws:iam::MANAGEMENT_ACCOUNT_ID:root"
         },
         "Action": "sts:AssumeRole"
       }
     ]
   }
   ```
3. Update the **Organization Role Name** on the member account to the custom role name

## Per-Account Region Overrides

Each account can have its own list of discovery regions. If no regions are specified, the application falls back to:

1. The `DISCOVERY_REGIONS` environment variable
2. All enabled regions from `ec2.describe_regions()`

To override, select the desired regions in the **Discovery Regions** multi-select when adding or editing the account.

Regions are grouped by geography:
- **North America**: us-east-1, us-east-2, us-west-1, us-west-2, ca-central-1
- **South America**: sa-east-1
- **Europe**: eu-west-1, eu-west-2, eu-west-3, eu-central-1, eu-central-2, eu-north-1, eu-south-1, eu-south-2
- **Africa**: af-south-1
- **Asia Pacific**: ap-east-1, ap-south-1, ap-south-2, ap-southeast-1, ap-southeast-2, ap-southeast-3, ap-northeast-1, ap-northeast-2, ap-northeast-3, me-south-1, me-central-1

## Testing Connections

Click **Test Connection** on any account row to verify connectivity:

- **Management accounts**: calls `sts:GetCallerIdentity` with the stored credentials
- **Member accounts**: attempts to assume the configured role from the management account, then calls `sts:GetCallerIdentity`

The result shows success/failure and any error messages.

## Cost Data

Cost data is fetched from AWS Cost Explorer via the management account. It shows:

- **Estimated Monthly Cost** — current month spend (1st of the month to today)
- **Previous Month Cost** — last full month's spend

Costs are refreshed automatically after each discovery run. You can also trigger a manual refresh from the Accounts page using the **Refresh Costs** button.

## Deactivating Accounts

Set an account to **Inactive** by editing it and unchecking **Is Active**. Inactive accounts are skipped during discovery but retain their associated assets.
