import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

import boto3
from botocore.config import Config
from django.conf import settings
from django.utils import timezone

from accounts.models import AWSAccount
from assets.models import Asset

logger = logging.getLogger(__name__)

BOTO_CONFIG = Config(
    retries={'max_attempts': 3, 'mode': 'adaptive'},
    connect_timeout=10,
    read_timeout=30,
)


class AWSResourceDiscoverer:
    def __init__(self, account: AWSAccount, root_session=None):
        self.account = account
        self.root_session = root_session or self._build_management_session()
        self.session = self._get_session_for_account()
        self.results = []
        self.errors = []

    def _build_management_session(self):
        """Build a session from management account credentials, falling back to default."""
        if self.account.account_type == AWSAccount.AccountType.MANAGEMENT:
            mgmt = self.account
        else:
            mgmt = self.account.management_account

        if mgmt and mgmt.aws_access_key_id and mgmt.aws_secret_access_key:
            return boto3.Session(
                aws_access_key_id=mgmt.aws_access_key_id,
                aws_secret_access_key=mgmt.aws_secret_access_key,
            )
        return boto3.Session()

    def _get_session_for_account(self):
        if self.account.account_type == AWSAccount.AccountType.MANAGEMENT:
            return self.root_session
        sts = self.root_session.client('sts', config=BOTO_CONFIG)
        role_arn = f"arn:aws:iam::{self.account.account_id}:role/{self.account.organization_role_name}"
        try:
            response = sts.assume_role(
                RoleArn=role_arn,
                RoleSessionName='TISAXAssetDiscovery',
                DurationSeconds=3600,
            )
            creds = response['Credentials']
            return boto3.Session(
                aws_access_key_id=creds['AccessKeyId'],
                aws_secret_access_key=creds['SecretAccessKey'],
                aws_session_token=creds['SessionToken'],
            )
        except Exception as e:
            logger.error(f"Failed to assume role for account {self.account.account_id}: {e}")
            raise

    def discover_all_regions(self):
        # Per-account override takes priority
        account_regions = getattr(self.account, 'discovery_regions', None)
        if account_regions:
            logger.info(f"Using account-level regions for {self.account.account_id}: {account_regions}")
            return list(account_regions)
        # Global setting fallback
        configured = getattr(settings, 'DISCOVERY_REGIONS', [])
        if configured:
            logger.info(f"Using configured regions: {configured}")
            return list(configured)
        # Last resort: dynamic EC2 describe-regions
        try:
            ec2 = self.session.client('ec2', region_name=settings.AWS_DEFAULT_REGION, config=BOTO_CONFIG)
            response = ec2.describe_regions(AllRegions=False)
            return [r['RegionName'] for r in response['Regions']]
        except Exception as e:
            logger.error(f"Failed to list regions: {e}")
            return [settings.AWS_DEFAULT_REGION]

    def discover_all_resources(self):
        all_resources = []
        # Global services first (not region-specific)
        for method in [self.discover_s3_buckets, self.discover_cloudfront_distributions, self.discover_route53_hosted_zones]:
            try:
                resources = method(self.session)
                all_resources.extend(resources)
            except Exception as e:
                self.errors.append(f"{method.__name__}: {e}")
                logger.error(f"Error in {method.__name__}: {e}")

        # Regional services
        regions = self.discover_all_regions()
        max_workers = getattr(settings, 'DISCOVERY_CONCURRENT_REGIONS', 5)

        def discover_region(region):
            region_resources = []
            regional_session = self.session
            regional_methods = [
                self.discover_ec2_instances,
                self.discover_vpcs,
                self.discover_eks_clusters,
                self.discover_rds_clusters,
                self.discover_rds_instances,
                self.discover_elasticache_clusters,
                self.discover_load_balancers,
                self.discover_lambda_functions,
                self.discover_ecr_repositories,
                self.discover_cognito_user_pools,
                self.discover_opensearch_domains,
                self.discover_msk_clusters,
            ]
            for method in regional_methods:
                try:
                    resources = method(regional_session, region)
                    region_resources.extend(resources)
                except Exception as e:
                    self.errors.append(f"{method.__name__} in {region}: {e}")
                    logger.debug(f"Error in {method.__name__} for {region}: {e}")
            return region_resources

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(discover_region, region): region for region in regions}
            for future in as_completed(futures):
                region = futures[future]
                try:
                    all_resources.extend(future.result())
                except Exception as e:
                    self.errors.append(f"Region {region}: {e}")
                    logger.error(f"Error discovering region {region}: {e}")

        return all_resources

    def _normalize_tags(self, tags_list):
        """Convert AWS tag list [{'Key': 'k', 'Value': 'v'}] to dict {'k': 'v'}."""
        if not tags_list:
            return {}
        if isinstance(tags_list, dict):
            return tags_list
        return {t.get('Key', ''): t.get('Value', '') for t in tags_list if isinstance(t, dict)}

    def _get_name_from_tags(self, tags_list, fallback=''):
        tags = self._normalize_tags(tags_list)
        return tags.get('Name', fallback)

    def discover_ec2_instances(self, session, region):
        resources = []
        ec2 = session.client('ec2', region_name=region, config=BOTO_CONFIG)
        paginator = ec2.get_paginator('describe_instances')
        for page in paginator.paginate():
            for reservation in page['Reservations']:
                for instance in reservation['Instances']:
                    tags = self._normalize_tags(instance.get('Tags', []))
                    name = tags.get('Name', instance['InstanceId'])
                    ips = []
                    dns = []
                    if instance.get('PublicIpAddress'):
                        ips.append(instance['PublicIpAddress'])
                    if instance.get('PrivateIpAddress'):
                        ips.append(instance['PrivateIpAddress'])
                    if instance.get('PublicDnsName'):
                        dns.append(instance['PublicDnsName'])
                    if instance.get('PrivateDnsName'):
                        dns.append(instance['PrivateDnsName'])

                    state = instance.get('State', {}).get('Name', 'unknown')
                    status = 'ACTIVE' if state == 'running' else 'INACTIVE' if state == 'stopped' else 'UNKNOWN'

                    resources.append({
                        'name': name,
                        'aws_service_type': 'EC2',
                        'aws_resource_id': instance['InstanceId'],
                        'aws_resource_arn': f"arn:aws:ec2:{region}:{self.account.account_id}:instance/{instance['InstanceId']}",
                        'aws_region': region,
                        'status': status,
                        'ip_addresses': ips,
                        'dns_names': dns,
                        'tags': tags,
                        'metadata': {
                            'instance_type': instance.get('InstanceType'),
                            'state': state,
                            'launch_time': str(instance.get('LaunchTime', '')),
                            'vpc_id': instance.get('VpcId'),
                            'subnet_id': instance.get('SubnetId'),
                            'ami_id': instance.get('ImageId'),
                            'platform': instance.get('Platform', 'linux'),
                            'architecture': instance.get('Architecture'),
                            'key_name': instance.get('KeyName'),
                        },
                    })
        return resources

    def discover_vpcs(self, session, region):
        resources = []
        ec2 = session.client('ec2', region_name=region, config=BOTO_CONFIG)
        response = ec2.describe_vpcs()
        for vpc in response['Vpcs']:
            tags = self._normalize_tags(vpc.get('Tags', []))
            name = tags.get('Name', vpc['VpcId'])
            resources.append({
                'name': name,
                'aws_service_type': 'VPC',
                'aws_resource_id': vpc['VpcId'],
                'aws_resource_arn': f"arn:aws:ec2:{region}:{self.account.account_id}:vpc/{vpc['VpcId']}",
                'aws_region': region,
                'status': 'ACTIVE' if vpc.get('State') == 'available' else 'UNKNOWN',
                'tags': tags,
                'metadata': {
                    'cidr_block': vpc.get('CidrBlock'),
                    'is_default': vpc.get('IsDefault', False),
                    'dhcp_options_id': vpc.get('DhcpOptionsId'),
                    'instance_tenancy': vpc.get('InstanceTenancy'),
                },
            })
        return resources

    def discover_eks_clusters(self, session, region):
        resources = []
        eks = session.client('eks', region_name=region, config=BOTO_CONFIG)
        try:
            cluster_names = eks.list_clusters()['clusters']
        except Exception:
            return resources
        for cluster_name in cluster_names:
            try:
                cluster = eks.describe_cluster(name=cluster_name)['cluster']
                tags = cluster.get('tags', {})
                resources.append({
                    'name': cluster_name,
                    'aws_service_type': 'EKS',
                    'aws_resource_id': cluster_name,
                    'aws_resource_arn': cluster.get('arn', ''),
                    'aws_region': region,
                    'status': 'ACTIVE' if cluster.get('status') == 'ACTIVE' else 'UNKNOWN',
                    'tags': tags,
                    'metadata': {
                        'version': cluster.get('version'),
                        'platform_version': cluster.get('platformVersion'),
                        'endpoint': cluster.get('endpoint'),
                        'role_arn': cluster.get('roleArn'),
                        'vpc_id': cluster.get('resourcesVpcConfig', {}).get('vpcId'),
                        'created_at': str(cluster.get('createdAt', '')),
                    },
                    'dns_names': [cluster.get('endpoint', '')] if cluster.get('endpoint') else [],
                })
            except Exception as e:
                logger.debug(f"Error describing EKS cluster {cluster_name}: {e}")
        return resources

    def discover_rds_clusters(self, session, region):
        resources = []
        rds = session.client('rds', region_name=region, config=BOTO_CONFIG)
        paginator = rds.get_paginator('describe_db_clusters')
        try:
            for page in paginator.paginate():
                for cluster in page['DBClusters']:
                    tags_response = cluster.get('TagList', [])
                    tags = self._normalize_tags(tags_response)
                    dns = []
                    if cluster.get('Endpoint'):
                        dns.append(cluster['Endpoint'])
                    if cluster.get('ReaderEndpoint'):
                        dns.append(cluster['ReaderEndpoint'])
                    resources.append({
                        'name': cluster['DBClusterIdentifier'],
                        'aws_service_type': 'RDS',
                        'aws_resource_id': cluster['DBClusterIdentifier'],
                        'aws_resource_arn': cluster.get('DBClusterArn', ''),
                        'aws_region': region,
                        'status': 'ACTIVE' if cluster.get('Status') == 'available' else 'UNKNOWN',
                        'dns_names': dns,
                        'tags': tags,
                        'metadata': {
                            'engine': cluster.get('Engine'),
                            'engine_version': cluster.get('EngineVersion'),
                            'storage_encrypted': cluster.get('StorageEncrypted'),
                            'multi_az': cluster.get('MultiAZ'),
                            'cluster_members': [m.get('DBInstanceIdentifier') for m in cluster.get('DBClusterMembers', [])],
                            'created_at': str(cluster.get('ClusterCreateTime', '')),
                        },
                    })
        except Exception as e:
            logger.debug(f"Error discovering RDS clusters in {region}: {e}")
        return resources

    def discover_rds_instances(self, session, region):
        resources = []
        rds = session.client('rds', region_name=region, config=BOTO_CONFIG)
        paginator = rds.get_paginator('describe_db_instances')
        try:
            for page in paginator.paginate():
                for db in page['DBInstances']:
                    if db.get('DBClusterIdentifier'):
                        continue  # skip cluster members, covered by discover_rds_clusters
                    tags = self._normalize_tags(db.get('TagList', []))
                    dns = []
                    if db.get('Endpoint', {}).get('Address'):
                        dns.append(db['Endpoint']['Address'])
                    resources.append({
                        'name': db['DBInstanceIdentifier'],
                        'aws_service_type': 'RDS',
                        'aws_resource_id': db['DBInstanceIdentifier'],
                        'aws_resource_arn': db.get('DBInstanceArn', ''),
                        'aws_region': region,
                        'status': 'ACTIVE' if db.get('DBInstanceStatus') == 'available' else 'UNKNOWN',
                        'dns_names': dns,
                        'tags': tags,
                        'metadata': {
                            'engine': db.get('Engine'),
                            'engine_version': db.get('EngineVersion'),
                            'instance_class': db.get('DBInstanceClass'),
                            'storage_type': db.get('StorageType'),
                            'allocated_storage': db.get('AllocatedStorage'),
                            'multi_az': db.get('MultiAZ'),
                            'storage_encrypted': db.get('StorageEncrypted'),
                            'created_at': str(db.get('InstanceCreateTime', '')),
                        },
                    })
        except Exception as e:
            logger.debug(f"Error discovering RDS instances in {region}: {e}")
        return resources

    def discover_elasticache_clusters(self, session, region):
        resources = []
        ec = session.client('elasticache', region_name=region, config=BOTO_CONFIG)
        paginator = ec.get_paginator('describe_cache_clusters')
        try:
            for page in paginator.paginate(ShowCacheNodeInfo=True):
                for cluster in page['CacheClusters']:
                    dns = []
                    if cluster.get('ConfigurationEndpoint', {}).get('Address'):
                        dns.append(cluster['ConfigurationEndpoint']['Address'])
                    for node in cluster.get('CacheNodes', []):
                        if node.get('Endpoint', {}).get('Address'):
                            dns.append(node['Endpoint']['Address'])
                    resources.append({
                        'name': cluster['CacheClusterId'],
                        'aws_service_type': 'ELASTICACHE',
                        'aws_resource_id': cluster['CacheClusterId'],
                        'aws_resource_arn': cluster.get('ARN', ''),
                        'aws_region': region,
                        'status': 'ACTIVE' if cluster.get('CacheClusterStatus') == 'available' else 'UNKNOWN',
                        'dns_names': dns,
                        'tags': {},
                        'metadata': {
                            'engine': cluster.get('Engine'),
                            'engine_version': cluster.get('EngineVersion'),
                            'cache_node_type': cluster.get('CacheNodeType'),
                            'num_cache_nodes': cluster.get('NumCacheNodes'),
                            'created_at': str(cluster.get('CacheClusterCreateTime', '')),
                        },
                    })
        except Exception as e:
            logger.debug(f"Error discovering ElastiCache in {region}: {e}")
        return resources

    def discover_load_balancers(self, session, region):
        resources = []
        elbv2 = session.client('elbv2', region_name=region, config=BOTO_CONFIG)
        paginator = elbv2.get_paginator('describe_load_balancers')
        try:
            for page in paginator.paginate():
                for lb in page['LoadBalancers']:
                    lb_type = lb.get('Type', 'application')
                    service_type = 'ALB' if lb_type == 'application' else 'NLB'
                    dns = [lb['DNSName']] if lb.get('DNSName') else []
                    # Get tags
                    tags = {}
                    try:
                        tag_resp = elbv2.describe_tags(ResourceArns=[lb['LoadBalancerArn']])
                        for desc in tag_resp.get('TagDescriptions', []):
                            tags = self._normalize_tags(desc.get('Tags', []))
                    except Exception:
                        pass
                    resources.append({
                        'name': lb['LoadBalancerName'],
                        'aws_service_type': service_type,
                        'aws_resource_id': lb['LoadBalancerName'],
                        'aws_resource_arn': lb.get('LoadBalancerArn', ''),
                        'aws_region': region,
                        'status': 'ACTIVE' if lb.get('State', {}).get('Code') == 'active' else 'UNKNOWN',
                        'dns_names': dns,
                        'tags': tags,
                        'metadata': {
                            'type': lb_type,
                            'scheme': lb.get('Scheme'),
                            'vpc_id': lb.get('VpcId'),
                            'availability_zones': [az.get('ZoneName') for az in lb.get('AvailabilityZones', [])],
                            'created_at': str(lb.get('CreatedTime', '')),
                        },
                    })
        except Exception as e:
            logger.debug(f"Error discovering load balancers in {region}: {e}")
        return resources

    def discover_lambda_functions(self, session, region):
        resources = []
        lam = session.client('lambda', region_name=region, config=BOTO_CONFIG)
        paginator = lam.get_paginator('list_functions')
        try:
            for page in paginator.paginate():
                for fn in page['Functions']:
                    tags = fn.get('Tags', {}) or {}
                    resources.append({
                        'name': fn['FunctionName'],
                        'aws_service_type': 'LAMBDA',
                        'aws_resource_id': fn['FunctionName'],
                        'aws_resource_arn': fn.get('FunctionArn', ''),
                        'aws_region': region,
                        'status': 'ACTIVE',
                        'tags': tags if isinstance(tags, dict) else {},
                        'metadata': {
                            'runtime': fn.get('Runtime'),
                            'handler': fn.get('Handler'),
                            'memory_size': fn.get('MemorySize'),
                            'timeout': fn.get('Timeout'),
                            'last_modified': fn.get('LastModified'),
                            'code_size': fn.get('CodeSize'),
                            'description': fn.get('Description'),
                        },
                    })
        except Exception as e:
            logger.debug(f"Error discovering Lambda functions in {region}: {e}")
        return resources

    def discover_ecr_repositories(self, session, region):
        resources = []
        ecr = session.client('ecr', region_name=region, config=BOTO_CONFIG)
        paginator = ecr.get_paginator('describe_repositories')
        try:
            for page in paginator.paginate():
                for repo in page['repositories']:
                    name = repo['repositoryName']
                    arn = repo.get('repositoryArn', '')
                    uri = repo.get('repositoryUri', '')
                    tags = {}
                    try:
                        tag_resp = ecr.list_tags_for_resource(resourceArn=arn)
                        tags = self._normalize_tags(tag_resp.get('tags', []))
                    except Exception:
                        pass
                    resources.append({
                        'name': name,
                        'aws_service_type': 'ECR',
                        'aws_resource_id': name,
                        'aws_resource_arn': arn,
                        'aws_region': region,
                        'url': f'https://{uri}' if uri else '',
                        'status': 'ACTIVE',
                        'dns_names': [uri] if uri else [],
                        'tags': tags,
                        'metadata': {
                            'repository_uri': uri,
                            'created_at': str(repo.get('createdAt', '')),
                        },
                    })
        except Exception as e:
            logger.debug(f"Error discovering ECR in {region}: {e}")
        return resources

    def discover_cognito_user_pools(self, session, region):
        resources = []
        cognito = session.client('cognito-idp', region_name=region, config=BOTO_CONFIG)
        try:
            pools = []
            kwargs = {'MaxResults': 60}
            while True:
                response = cognito.list_user_pools(**kwargs)
                pools.extend(response.get('UserPools', []))
                if 'NextToken' not in response:
                    break
                kwargs['NextToken'] = response['NextToken']
            for pool in pools:
                pool_id = pool['Id']
                try:
                    detail = cognito.describe_user_pool(UserPoolId=pool_id)['UserPool']
                    resources.append({
                        'name': pool['Name'],
                        'aws_service_type': 'COGNITO',
                        'aws_resource_id': pool_id,
                        'aws_resource_arn': detail.get('Arn', ''),
                        'aws_region': region,
                        'status': 'ACTIVE',
                        'tags': detail.get('UserPoolTags', {}),
                        'metadata': {
                            'estimated_users': detail.get('EstimatedNumberOfUsers'),
                            'mfa_configuration': detail.get('MfaConfiguration'),
                            'created_at': str(detail.get('CreationDate', '')),
                            'last_modified': str(detail.get('LastModifiedDate', '')),
                        },
                    })
                except Exception as e:
                    logger.debug(f"Error describing Cognito pool {pool_id}: {e}")
        except Exception as e:
            logger.debug(f"Error discovering Cognito in {region}: {e}")
        return resources

    def discover_opensearch_domains(self, session, region):
        resources = []
        opensearch = session.client('opensearch', region_name=region, config=BOTO_CONFIG)
        try:
            domain_names = opensearch.list_domain_names().get('DomainNames', [])
            for dn in domain_names:
                domain_name = dn['DomainName']
                try:
                    domain = opensearch.describe_domain(DomainName=domain_name)['DomainStatus']
                    dns = []
                    if domain.get('Endpoint'):
                        dns.append(domain['Endpoint'])
                    if domain.get('Endpoints'):
                        dns.extend(domain['Endpoints'].values())
                    # Get tags
                    tags = {}
                    if domain.get('ARN'):
                        try:
                            tag_resp = opensearch.list_tags(ARN=domain['ARN'])
                            tags = self._normalize_tags(tag_resp.get('TagList', []))
                        except Exception:
                            pass
                    resources.append({
                        'name': domain_name,
                        'aws_service_type': 'OPENSEARCH',
                        'aws_resource_id': domain_name,
                        'aws_resource_arn': domain.get('ARN', ''),
                        'aws_region': region,
                        'status': 'ACTIVE' if not domain.get('Deleted', False) else 'INACTIVE',
                        'dns_names': dns,
                        'tags': tags,
                        'metadata': {
                            'engine_version': domain.get('EngineVersion'),
                            'instance_type': domain.get('ClusterConfig', {}).get('InstanceType'),
                            'instance_count': domain.get('ClusterConfig', {}).get('InstanceCount'),
                            'ebs_enabled': domain.get('EBSOptions', {}).get('EBSEnabled'),
                            'encryption_at_rest': domain.get('EncryptionAtRestOptions', {}).get('Enabled'),
                            'created': domain.get('Created'),
                        },
                    })
                except Exception as e:
                    logger.debug(f"Error describing OpenSearch domain {domain_name}: {e}")
        except Exception as e:
            logger.debug(f"Error discovering OpenSearch in {region}: {e}")
        return resources

    def discover_msk_clusters(self, session, region):
        resources = []
        kafka = session.client('kafka', region_name=region, config=BOTO_CONFIG)
        try:
            paginator = kafka.get_paginator('list_clusters_v2')
            for page in paginator.paginate():
                for cluster in page.get('ClusterInfoList', []):
                    name = cluster.get('ClusterName', '')
                    arn = cluster.get('ClusterArn', '')
                    tags = cluster.get('Tags', {}) or {}
                    # Get broker endpoints if provisioned
                    dns = []
                    provisioned = cluster.get('Provisioned', {})
                    serverless = cluster.get('Serverless', {})
                    metadata = {
                        'cluster_type': cluster.get('ClusterType'),
                        'state': cluster.get('State'),
                        'created_at': str(cluster.get('CreationTime', '')),
                    }
                    if provisioned:
                        metadata.update({
                            'kafka_version': provisioned.get('CurrentBrokerSoftwareInfo', {}).get('KafkaVersion'),
                            'broker_type': provisioned.get('BrokerNodeGroupInfo', {}).get('InstanceType'),
                            'number_of_broker_nodes': provisioned.get('NumberOfBrokerNodes'),
                            'enhanced_monitoring': provisioned.get('EnhancedMonitoring'),
                            'storage_mode': provisioned.get('StorageMode'),
                        })
                    state = cluster.get('State', '')
                    status = 'ACTIVE' if state == 'ACTIVE' else 'INACTIVE' if state == 'DELETING' else 'UNKNOWN'
                    resources.append({
                        'name': name,
                        'aws_service_type': 'MSK',
                        'aws_resource_id': name,
                        'aws_resource_arn': arn,
                        'aws_region': region,
                        'status': status,
                        'dns_names': dns,
                        'tags': tags,
                        'metadata': metadata,
                    })
        except Exception as e:
            logger.debug(f"Error discovering MSK in {region}: {e}")
        return resources

    def discover_s3_buckets(self, session):
        resources = []
        s3 = session.client('s3', region_name=settings.AWS_DEFAULT_REGION, config=BOTO_CONFIG)
        try:
            buckets = s3.list_buckets().get('Buckets', [])
            for bucket in buckets:
                bucket_name = bucket.get('Name') or bucket.get('BucketName')
                region = settings.AWS_DEFAULT_REGION
                try:
                    loc = s3.get_bucket_location(Bucket=bucket_name)
                    region = loc.get('LocationConstraint') or 'us-east-1'
                except Exception:
                    pass
                tags = {}
                try:
                    tag_resp = s3.get_bucket_tagging(Bucket=bucket_name)
                    tags = self._normalize_tags(tag_resp.get('TagSet', []))
                except Exception:
                    pass
                dns = [f'{bucket_name}.s3.{region}.amazonaws.com']
                resources.append({
                    'name': bucket_name,
                    'aws_service_type': 'S3',
                    'aws_resource_id': bucket_name,
                    'aws_resource_arn': f"arn:aws:s3:::{bucket_name}",
                    'aws_region': region,
                    'url': f's3://{bucket_name}',
                    'dns_names': dns,
                    'status': 'ACTIVE',
                    'tags': tags,
                    'metadata': {
                        'created_at': str(bucket.get('CreationDate', '')),
                    },
                })
        except Exception as e:
            logger.debug(f"Error discovering S3 buckets: {e}")
        return resources

    def discover_cloudfront_distributions(self, session):
        resources = []
        cf = session.client('cloudfront', region_name='us-east-1', config=BOTO_CONFIG)
        try:
            paginator = cf.get_paginator('list_distributions')
            for page in paginator.paginate():
                dist_list = page.get('DistributionList', {})
                for dist in dist_list.get('Items', []):
                    dns = [dist['DomainName']] if dist.get('DomainName') else []
                    if dist.get('Aliases', {}).get('Items'):
                        dns.extend(dist['Aliases']['Items'])
                    tags = {}
                    try:
                        tag_resp = cf.list_tags_for_resource(Resource=dist['ARN'])
                        tags = self._normalize_tags(tag_resp.get('Tags', {}).get('Items', []))
                    except Exception:
                        pass
                    resources.append({
                        'name': dist.get('Comment', dist['Id']) or dist['Id'],
                        'aws_service_type': 'CLOUDFRONT',
                        'aws_resource_id': dist['Id'],
                        'aws_resource_arn': dist.get('ARN', ''),
                        'aws_region': 'global',
                        'status': 'ACTIVE' if dist.get('Enabled') else 'INACTIVE',
                        'dns_names': dns,
                        'tags': tags,
                        'metadata': {
                            'status': dist.get('Status'),
                            'price_class': dist.get('PriceClass'),
                            'http_version': dist.get('HttpVersion'),
                            'is_ipv6_enabled': dist.get('IsIPV6Enabled'),
                            'web_acl_id': dist.get('WebACLId'),
                        },
                    })
        except Exception as e:
            logger.debug(f"Error discovering CloudFront: {e}")
        return resources

    def discover_route53_hosted_zones(self, session):
        resources = []
        r53 = session.client('route53', region_name='us-east-1', config=BOTO_CONFIG)
        try:
            paginator = r53.get_paginator('list_hosted_zones')
            for page in paginator.paginate():
                for zone in page['HostedZones']:
                    zone_id = zone['Id'].split('/')[-1]
                    tags = {}
                    try:
                        tag_resp = r53.list_tags_for_resource(ResourceType='hostedzone', ResourceId=zone_id)
                        tags = self._normalize_tags(tag_resp.get('ResourceTagSet', {}).get('Tags', []))
                    except Exception:
                        pass
                    resources.append({
                        'name': zone['Name'].rstrip('.'),
                        'aws_service_type': 'ROUTE53',
                        'aws_resource_id': zone_id,
                        'aws_resource_arn': f"arn:aws:route53:::hostedzone/{zone_id}",
                        'aws_region': 'global',
                        'status': 'ACTIVE',
                        'tags': tags,
                        'metadata': {
                            'record_count': zone.get('ResourceRecordSetCount'),
                            'is_private': zone.get('Config', {}).get('PrivateZone', False),
                            'comment': zone.get('Config', {}).get('Comment', ''),
                        },
                    })
        except Exception as e:
            logger.debug(f"Error discovering Route53: {e}")
        return resources

    def upsert_asset(self, resource_dict, account):
        now = timezone.now()
        arn = resource_dict.get('aws_resource_arn', '')
        resource_id = resource_dict.get('aws_resource_id', '')
        region = resource_dict.get('aws_region', '')

        lookup = {}
        if arn:
            lookup = {'aws_resource_arn': arn}
        elif resource_id and region:
            lookup = {
                'aws_resource_id': resource_id,
                'aws_account': account,
                'aws_region': region,
            }
        else:
            lookup = {
                'name': resource_dict.get('name', ''),
                'aws_account': account,
                'aws_service_type': resource_dict.get('aws_service_type', ''),
            }

        defaults = {
            'name': resource_dict.get('name', ''),
            'asset_type': 'AWS_SERVICE',
            'aws_account': account,
            'aws_region': region,
            'aws_resource_id': resource_id,
            'aws_resource_arn': arn,
            'aws_service_type': resource_dict.get('aws_service_type', ''),
            'status': resource_dict.get('status', 'UNKNOWN'),
            'metadata': resource_dict.get('metadata', {}),
            'ip_addresses': resource_dict.get('ip_addresses', []),
            'dns_names': resource_dict.get('dns_names', []),
            'url': resource_dict.get('url', ''),
            'tags': resource_dict.get('tags', {}),
            'last_seen_at': now,
        }

        try:
            asset, created = Asset.objects.update_or_create(defaults=defaults, **lookup)
            if created:
                asset.discovered_at = now
                asset.save(update_fields=['discovered_at'])
            return asset, created
        except Asset.MultipleObjectsReturned:
            # Handle duplicates: update the first match
            asset = Asset.objects.filter(**lookup).first()
            for key, value in defaults.items():
                setattr(asset, key, value)
            asset.save()
            return asset, False
