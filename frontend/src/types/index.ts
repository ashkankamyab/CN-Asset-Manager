// Auth user
export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: 'superadmin' | 'admin' | 'readonly';
  is_superadmin: boolean;
}

// Paginated response from DRF
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// AWS Account
export interface AWSAccount {
  id: string;
  account_id: string;
  account_name: string;
  account_type: 'MANAGEMENT' | 'MEMBER';
  account_type_display: string;
  environment: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT' | 'SHARED';
  environment_display: string;
  organization_role_name: string;
  aws_access_key_id: string;
  aws_secret_access_key?: string;  // write-only, not returned by API
  management_account: string | null;
  management_account_name: string;
  discovery_regions: string[];
  is_active: boolean;
  last_discovery_at: string | null;
  estimated_monthly_cost: string | null;
  previous_month_cost: string | null;
  cost_updated_at: string | null;
  created_at: string;
  updated_at: string;
  asset_count: number;
}

// Asset Category
export interface AssetCategory {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
}

// Relationship
export interface AssetRelationship {
  id: number;
  relationship_type: 'DEPENDS_ON' | 'CONTAINS' | 'CONNECTS_TO' | 'MANAGED_BY';
  description: string;
  related_asset_id: string;
  related_asset_name: string;
  related_asset_pk: string;
}

// Asset list item (lightweight)
export interface AssetListItem {
  id: string;
  asset_id: string;
  name: string;
  asset_type: string;
  asset_type_display: string;
  aws_service_type: string;
  aws_service_type_display: string;
  aws_account: string | null;
  aws_account_name: string;
  aws_region: string;
  status: string;
  status_display: string;
  criticality: string;
  criticality_display: string;
  owner: string;
  category_name: string;
  created_at: string;
  last_seen_at: string | null;
}

// Asset detail (full)
export interface AssetDetail {
  id: string;
  asset_id: string;
  name: string;
  category: number | null;
  category_detail: AssetCategory | null;
  asset_type: string;
  asset_type_display: string;
  status: string;
  status_display: string;
  criticality: string;
  criticality_display: string;
  aws_account: string | null;
  aws_account_detail: AWSAccount | null;
  aws_region: string;
  aws_resource_id: string;
  aws_resource_arn: string;
  aws_service_type: string;
  aws_service_type_display: string;
  metadata: Record<string, unknown>;
  ip_addresses: string[];
  dns_names: string[];
  tags: Record<string, string>;
  owner: string;
  description: string;
  vendor: string;
  url: string;
  version: string;
  data_classification: string;
  data_classification_display: string;
  gdpr_relevant: boolean;
  contains_personal_data: boolean;
  backup_enabled: boolean;
  monitoring_enabled: boolean;
  notes: string;
  discovered_at: string | null;
  last_seen_at: string | null;
  is_manually_added: boolean;
  created_at: string;
  updated_at: string;
  outgoing_relationships: AssetRelationship[];
  incoming_relationships: AssetRelationship[];
}

// Discovery Job
export interface DiscoveryJob {
  id: string;
  aws_account: string | null;
  aws_account_name: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  started_at: string | null;
  completed_at: string | null;
  resources_discovered: number;
  resources_updated: number;
  resources_new: number;
  error_message: string;
  triggered_by_username: string;
  log_output: string;
  duration_seconds: number | null;
}

// Dashboard
export interface DashboardData {
  total_assets: number;
  total_accounts: number;
  critical_assets: number;
  last_discovery: string | null;
  total_monthly_cost: string | null;
  total_previous_month_cost: string | null;
  by_type: { asset_type: string; count: number }[];
  by_service: { aws_service_type: string; count: number }[];
  by_criticality: { criticality: string; count: number }[];
  by_status: { status: string; count: number }[];
  accounts: DashboardAccount[];
  recent_jobs: DashboardJob[];
}

export interface DashboardAccount {
  id: string;
  account_name: string;
  account_id: string;
  environment: string;
  last_discovery_at: string | null;
  asset_count: number;
  estimated_monthly_cost: string | null;
  previous_month_cost: string | null;
  cost_updated_at: string | null;
}

export interface DashboardJob {
  id: string;
  aws_account_name: string;
  status: string;
  resources_discovered: number;
  started_at: string | null;
  duration_seconds: number | null;
}

// Admin user (returned by admin API)
export interface AdminUser {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  role: 'superadmin' | 'admin' | 'readonly';
  is_superadmin: boolean;
  auth_source: 'local' | 'oidc';
  date_joined: string;
  last_login: string | null;
}

// Site settings
export interface SiteSettings {
  oidc_enabled: boolean;
  oidc_client_id: string;
  oidc_client_secret: string;
  oidc_authority_url: string;
  oidc_authorization_endpoint: string;
  oidc_token_endpoint: string;
  oidc_user_endpoint: string;
  oidc_jwks_endpoint: string;
  oidc_sign_algo: string;
  oidc_role_claim: string;
  oidc_admin_role_value: string;
  // Email
  email_backend: 'console' | 'smtp' | 'ses' | 'google';
  email_from_address: string;
  email_from_name: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_use_tls: boolean;
  smtp_use_ssl: boolean;
  ses_aws_region: string;
  ses_aws_access_key_id: string;
  ses_aws_secret_access_key: string;
  google_service_account_json: string;
  google_delegated_email: string;
  // General
  session_timeout_minutes: number;
}

// Filter options
export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterOptions {
  asset_types: FilterOption[];
  aws_service_types: FilterOption[];
  criticalities: FilterOption[];
  statuses: FilterOption[];
  data_classifications: FilterOption[];
  aws_accounts: FilterOption[];
  aws_regions: string[];
}
