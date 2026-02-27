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

        def flush_logs():
            job.log_output = '\n'.join(log_lines)
            job.save(update_fields=['log_output'])

        for account in accounts:
            log_lines.append(f"Starting discovery for {account.account_name} ({account.account_id})")
            flush_logs()
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

                flush_logs()

            except Exception as e:
                log_lines.append(f"  ERROR: {e}")
                logger.error(f"Discovery failed for {account.account_id}: {e}")
                flush_logs()

        job.status = DiscoveryJob.Status.COMPLETED
        job.resources_discovered = total_discovered
        job.resources_new = total_new
        job.resources_updated = total_updated
        log_lines.append('Refreshing account costs...')
        job.log_output = '\n'.join(log_lines)
        job.completed_at = timezone.now()
        job.save()

        # Refresh costs after successful discovery
        refresh_costs_task.delay()

    except Exception as e:
        job.status = DiscoveryJob.Status.FAILED
        job.error_message = str(e)
        job.log_output = '\n'.join(log_lines)
        job.completed_at = timezone.now()
        job.save()
        logger.error(f"Discovery job failed: {e}")


@shared_task
def check_scheduled_discovery():
    """Hourly beat task: trigger discovery if the configured interval has elapsed."""
    from datetime import timedelta

    from authentication.models import SiteSettings

    settings = SiteSettings.load()
    interval = settings.discovery_interval

    if interval == SiteSettings.DiscoveryInterval.DISABLED:
        logger.info('Scheduled discovery is disabled, skipping.')
        return

    # Skip if a job is already pending or running
    if DiscoveryJob.objects.filter(
        status__in=[DiscoveryJob.Status.PENDING, DiscoveryJob.Status.RUNNING],
    ).exists():
        logger.info('Discovery job already in progress, skipping scheduled check.')
        return

    # Determine threshold based on interval
    thresholds = {
        SiteSettings.DiscoveryInterval.DAILY: timedelta(days=1),
        SiteSettings.DiscoveryInterval.WEEKLY: timedelta(days=7),
        SiteSettings.DiscoveryInterval.MONTHLY: timedelta(days=30),
    }
    delta = thresholds[interval]
    threshold = timezone.now() - delta

    # Find latest successful job
    last_job = (
        DiscoveryJob.objects
        .filter(status=DiscoveryJob.Status.COMPLETED)
        .order_by('-completed_at')
        .first()
    )

    if last_job and last_job.completed_at and last_job.completed_at >= threshold:
        logger.info('Last discovery completed at %s, still within %s interval.', last_job.completed_at, interval)
        return

    logger.info('Triggering scheduled discovery (interval=%s).', interval)
    from discovery.tasks import run_discovery
    run_discovery(account_id=None, user=None)


@shared_task(time_limit=300)
def refresh_costs_task():
    """Refresh account costs inside the Celery worker."""
    from accounts.cost_explorer import refresh_account_costs

    return refresh_account_costs()
