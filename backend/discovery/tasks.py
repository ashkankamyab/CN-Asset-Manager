import logging

from assets.models import DiscoveryJob
from discovery.celery_tasks import run_discovery_task

logger = logging.getLogger(__name__)


def run_discovery(account_id=None, user=None):
    """Run AWS resource discovery. If account_id is None, discover all active accounts."""
    job = DiscoveryJob.objects.create(
        aws_account_id=account_id,
        status=DiscoveryJob.Status.PENDING,
        triggered_by=user,
    )

    run_discovery_task.delay(str(job.id))
    return job
