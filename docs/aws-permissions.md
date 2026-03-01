# AWS Permissions

CN-Asset-Manager requires read-only AWS permissions to discover resources and fetch cost data.

## IAM Policy

Create an IAM policy with the following permissions and attach it to the IAM user (for management accounts) or IAM role (for member accounts):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AssetDiscovery",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeVpcs",
        "ec2:DescribeRegions",
        "eks:ListClusters",
        "eks:DescribeCluster",
        "rds:DescribeDBInstances",
        "rds:DescribeDBClusters",
        "rds:ListTagsForResource",
        "elasticache:DescribeCacheClusters",
        "elasticache:ListTagsForResource",
        "elasticloadbalancing:DescribeLoadBalancers",
        "elasticloadbalancing:DescribeTags",
        "lambda:ListFunctions",
        "ecr:DescribeRepositories",
        "ecr:ListTagsForResource",
        "cognito-idp:ListUserPools",
        "cognito-idp:DescribeUserPool",
        "es:ListDomainNames",
        "es:DescribeDomains",
        "es:ListTags",
        "s3:ListAllMyBuckets",
        "s3:GetBucketLocation",
        "s3:GetBucketTagging",
        "cloudfront:ListDistributions",
        "cloudfront:ListTagsForResource",
        "route53:ListHostedZones",
        "route53:ListTagsForResource",
        "kafka:ListClustersV2",
        "kafka:ListTags",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CostExplorer",
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CrossAccountAssume",
      "Effect": "Allow",
      "Action": [
        "sts:AssumeRole"
      ],
      "Resource": "arn:aws:iam::*:role/OrganizationAccountAccessRole"
    }
  ]
}
```

## Permission Groups Explained

### Asset Discovery

| Permission | Used For |
|-----------|----------|
| `ec2:DescribeInstances` | Discover EC2 instances (IDs, types, IPs, tags) |
| `ec2:DescribeVpcs` | Discover VPCs (CIDR blocks, tags) |
| `ec2:DescribeRegions` | List available AWS regions for discovery |
| `eks:ListClusters`, `eks:DescribeCluster` | Discover EKS Kubernetes clusters |
| `rds:DescribeDBInstances`, `rds:DescribeDBClusters` | Discover RDS databases and clusters |
| `rds:ListTagsForResource` | Read RDS resource tags |
| `elasticache:DescribeCacheClusters` | Discover ElastiCache Redis/Memcached clusters |
| `elasticache:ListTagsForResource` | Read ElastiCache resource tags |
| `elasticloadbalancing:DescribeLoadBalancers` | Discover ALB and NLB load balancers |
| `elasticloadbalancing:DescribeTags` | Read load balancer tags |
| `lambda:ListFunctions` | Discover Lambda functions |
| `ecr:DescribeRepositories` | Discover ECR container repositories |
| `ecr:ListTagsForResource` | Read ECR resource tags |
| `cognito-idp:ListUserPools`, `cognito-idp:DescribeUserPool` | Discover Cognito user pools |
| `es:ListDomainNames`, `es:DescribeDomains` | Discover OpenSearch domains |
| `es:ListTags` | Read OpenSearch resource tags |
| `s3:ListAllMyBuckets`, `s3:GetBucketLocation` | Discover S3 buckets and their regions |
| `s3:GetBucketTagging` | Read S3 bucket tags |
| `cloudfront:ListDistributions` | Discover CloudFront CDN distributions |
| `cloudfront:ListTagsForResource` | Read CloudFront resource tags |
| `route53:ListHostedZones` | Discover Route 53 DNS hosted zones |
| `route53:ListTagsForResource` | Read Route 53 resource tags |
| `kafka:ListClustersV2`, `kafka:ListTags` | Discover MSK (Managed Kafka) clusters |
| `sts:GetCallerIdentity` | Verify credentials and test connections |

### Cost Explorer

| Permission | Used For |
|-----------|----------|
| `ce:GetCostAndUsage` | Fetch monthly cost data per account |

This permission is only needed on the **management account** (the payer account in AWS Organizations). Cost data is broken down by linked account ID.

### Cross-Account Access

| Permission | Used For |
|-----------|----------|
| `sts:AssumeRole` | Assume a role in member accounts for discovery |

The resource ARN `arn:aws:iam::*:role/OrganizationAccountAccessRole` allows assuming the default organization role in any member account. Restrict the `*` to specific account IDs for tighter security:

```json
"Resource": [
  "arn:aws:iam::111111111111:role/OrganizationAccountAccessRole",
  "arn:aws:iam::222222222222:role/OrganizationAccountAccessRole"
]
```

## Management Account Setup

For the management account (the account with direct credentials):

1. **Create an IAM user** (programmatic access only):
   ```
   User name: cn-asset-manager-discovery
   ```

2. **Attach the IAM policy** above to the user

3. **Generate access keys** and store the Access Key ID and Secret Access Key

4. **Enter the credentials** in CN-Asset-Manager when adding the management account

### Security Recommendations

- Use a dedicated IAM user with only the required permissions
- Rotate access keys regularly
- Consider using IAM roles with external ID for additional security
- Monitor API calls with CloudTrail

## Member Account Setup

For member accounts in the organization:

### Option 1: Default Organization Role

If member accounts were created through AWS Organizations, they already have the `OrganizationAccountAccessRole` role. No additional setup is needed — just add the member account in CN-Asset-Manager and select the management account.

### Option 2: Custom Role

For tighter permissions or non-organization accounts:

1. **Create an IAM role** in the member account:
   ```
   Role name: cn-asset-manager-discovery
   ```

2. **Attach the discovery policy** (from above, without the CrossAccountAssume statement)

3. **Set the trust policy** to allow the management account:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "AWS": "arn:aws:iam::MANAGEMENT_ACCOUNT_ID:root"
         },
         "Action": "sts:AssumeRole",
         "Condition": {}
       }
     ]
   }
   ```
   Replace `MANAGEMENT_ACCOUNT_ID` with the 12-digit management account ID.

4. **Update the account in CN-Asset-Manager** — set the **Organization Role Name** to `cn-asset-manager-discovery`

### Adding an External ID (Optional)

For additional security, add an external ID condition to the trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::MANAGEMENT_ACCOUNT_ID:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "your-external-id"
        }
      }
    }
  ]
}
```

## Minimal Permissions

If you only need to discover a subset of services, you can reduce the policy to include only the relevant permissions. For example, to discover only EC2 and RDS:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeRegions",
        "rds:DescribeDBInstances",
        "rds:DescribeDBClusters",
        "rds:ListTagsForResource",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

Services without the required permissions will be silently skipped during discovery.
