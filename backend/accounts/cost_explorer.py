"""
Fetch per-account costs from AWS Cost Explorer.

Cost Explorer must be called from the management/payer account.
It groups costs by LINKED_ACCOUNT to get per-account breakdowns.
"""
import logging
from datetime import date, timedelta
from decimal import Decimal

import boto3
from botocore.config import Config
from django.utils import timezone

from .models import AWSAccount

logger = logging.getLogger(__name__)

BOTO_CONFIG = Config(
    retries={'max_attempts': 3, 'mode': 'adaptive'},
    connect_timeout=10,
    read_timeout=30,
)


def _get_management_session():
    """Get a boto3 session from the first active management account."""
    mgmt = AWSAccount.objects.filter(
        account_type=AWSAccount.AccountType.MANAGEMENT,
        is_active=True,
    ).first()
    if not mgmt:
        raise RuntimeError('No active management account configured.')
    if mgmt.aws_access_key_id and mgmt.aws_secret_access_key:
        return boto3.Session(
            aws_access_key_id=mgmt.aws_access_key_id,
            aws_secret_access_key=mgmt.aws_secret_access_key,
        )
    return boto3.Session()


def _fetch_costs(ce_client, start: str, end: str):
    """Call GetCostAndUsage grouped by linked account. Returns {account_id: Decimal}."""
    costs = {}
    kwargs = {
        'TimePeriod': {'Start': start, 'End': end},
        'Granularity': 'MONTHLY',
        'Metrics': ['UnblendedCost'],
        'GroupBy': [{'Type': 'DIMENSION', 'Key': 'LINKED_ACCOUNT'}],
    }

    while True:
        resp = ce_client.get_cost_and_usage(**kwargs)
        for group_set in resp.get('ResultsByTime', []):
            for group in group_set.get('Groups', []):
                acct_id = group['Keys'][0]
                amount = Decimal(group['Metrics']['UnblendedCost']['Amount'])
                costs[acct_id] = costs.get(acct_id, Decimal('0')) + amount

        token = resp.get('NextPageToken')
        if token:
            kwargs['NextPageToken'] = token
        else:
            break

    return costs


def refresh_account_costs():
    """Fetch current-month and previous-month costs and update all accounts."""
    session = _get_management_session()
    ce = session.client('ce', region_name='us-east-1', config=BOTO_CONFIG)

    today = date.today()
    current_month_start = today.replace(day=1).isoformat()
    current_month_end = today.isoformat()

    prev_month_end = today.replace(day=1)
    prev_month_start = (prev_month_end - timedelta(days=1)).replace(day=1).isoformat()
    prev_month_end_str = prev_month_end.isoformat()

    logger.info('Fetching current month costs (%s to %s)', current_month_start, current_month_end)
    current_costs = _fetch_costs(ce, current_month_start, current_month_end)

    logger.info('Fetching previous month costs (%s to %s)', prev_month_start, prev_month_end_str)
    previous_costs = _fetch_costs(ce, prev_month_start, prev_month_end_str)

    now = timezone.now()
    updated = 0
    for account in AWSAccount.objects.filter(is_active=True):
        account.estimated_monthly_cost = current_costs.get(account.account_id)
        account.previous_month_cost = previous_costs.get(account.account_id)
        account.cost_updated_at = now
        account.save(update_fields=['estimated_monthly_cost', 'previous_month_cost', 'cost_updated_at'])
        updated += 1

    logger.info('Updated costs for %d accounts', updated)
    return {
        'updated': updated,
        'current_month': {k: str(v) for k, v in current_costs.items()},
        'previous_month': {k: str(v) for k, v in previous_costs.items()},
    }
