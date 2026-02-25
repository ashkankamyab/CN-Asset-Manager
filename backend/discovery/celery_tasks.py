import logging

from celery import shared_task
from django.utils import timezone

from accounts.models import AWSAccount
from assets.models import DiscoveryJob

logger = logging.getLogger(__name__)


@shared_task(acks_late=True, time_limit=1800)
def run_discovery_task(job_id):
    """Execute a discovery job inside the Celery worker."""
    from discovery.aws_discoverer import AWSResourceDiscoverer

    job = DiscoveryJob.objects.get(pk=job_id)
    job.status = DiscoveryJob.Status.RUNNING
    job.started_at = timezone.now()
    job.save(update_fields=['status', 'started_at'])

    total_discovered = 0
    total_new = 0
    total_updated = 0
    log_lines = []

    try:
        if job.aws_account_id:
            accounts = AWSAccount.objects.filter(id=job.aws_account_id, is_active=True)
        else:
            accounts = AWSAccount.objects.filter(is_active=True)

        if not accounts.exists():
            job.status = DiscoveryJob.Status.FAILED
            job.error_message = 'No active accounts found'
            job.completed_at = timezone.now()
            job.save()
            return

        for account in accounts:
            log_lines.append(f"Starting discovery for {account.account_name} ({account.account_id})")
            try:
                discoverer = AWSResourceDiscoverer(account)
                resources = discoverer.discover_all_resources()
                log_lines.append(f"  Found {len(resources)} resources")

                new_count = 0
                updated_count = 0
                for resource in resources:
                    asset, created = discoverer.upsert_asset(resource, account)
                    if created:
                        new_count += 1
                    else:
                        updated_count += 1

                total_discovered += len(resources)
                total_new += new_count
                total_updated += updated_count

                account.last_discovery_at = timezone.now()
                account.save(update_fields=['last_discovery_at'])

                log_lines.append(f"  New: {new_count}, Updated: {updated_count}")

                if discoverer.errors:
                    for err in discoverer.errors:
                        log_lines.append(f"  Warning: {err}")

            except Exception as e:
                log_lines.append(f"  ERROR: {e}")
                logger.error(f"Discovery failed for {account.account_id}: {e}")

        job.status = DiscoveryJob.Status.COMPLETED
        job.resources_discovered = total_discovered
        job.resources_new = total_new
        job.resources_updated = total_updated
        job.log_output = '\n'.join(log_lines)
        job.completed_at = timezone.now()
        job.save()

    except Exception as e:
        job.status = DiscoveryJob.Status.FAILED
        job.error_message = str(e)
        job.log_output = '\n'.join(log_lines)
        job.completed_at = timezone.now()
        job.save()
        logger.error(f"Discovery job failed: {e}")


@shared_task(time_limit=300)
def refresh_costs_task():
    """Refresh account costs inside the Celery worker."""
    from accounts.cost_explorer import refresh_account_costs

    return refresh_account_costs()
