from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from accounts.models import AWSAccount
from assets.models import DiscoveryJob
from discovery.aws_discoverer import AWSResourceDiscoverer


class Command(BaseCommand):
    help = 'Discover AWS resources across accounts'

    def add_arguments(self, parser):
        parser.add_argument('--account-id', type=str, help='Specific AWS account ID (12 digits)')
        parser.add_argument('--dry-run', action='store_true', help='Count resources without saving')

    def handle(self, *args, **options):
        account_id_filter = options.get('account_id')
        dry_run = options.get('dry_run', False)

        if account_id_filter:
            accounts = AWSAccount.objects.filter(account_id=account_id_filter, is_active=True)
            if not accounts.exists():
                raise CommandError(f'No active account found with ID {account_id_filter}')
        else:
            accounts = AWSAccount.objects.filter(is_active=True)

        if not accounts.exists():
            self.stderr.write('No active AWS accounts configured.')
            return

        job = None
        if not dry_run:
            job = DiscoveryJob.objects.create(
                status=DiscoveryJob.Status.RUNNING,
                started_at=timezone.now(),
            )

        total_discovered = 0
        total_new = 0
        total_updated = 0

        for account in accounts:
            self.stdout.write(f'\nDiscovering: {account.account_name} ({account.account_id})')
            try:
                discoverer = AWSResourceDiscoverer(account)
                resources = discoverer.discover_all_resources()
                self.stdout.write(f'  Found {len(resources)} resources')

                if dry_run:
                    total_discovered += len(resources)
                    by_service = {}
                    for r in resources:
                        svc = r.get('aws_service_type', 'OTHER')
                        by_service[svc] = by_service.get(svc, 0) + 1
                    for svc, count in sorted(by_service.items()):
                        self.stdout.write(f'    {svc}: {count}')
                else:
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
                    self.stdout.write(f'  New: {new_count}, Updated: {updated_count}')

                if discoverer.errors:
                    for err in discoverer.errors:
                        self.stderr.write(f'  Warning: {err}')

            except Exception as e:
                self.stderr.write(self.style.ERROR(f'  Error: {e}'))

        if job:
            job.status = DiscoveryJob.Status.COMPLETED
            job.resources_discovered = total_discovered
            job.resources_new = total_new
            job.resources_updated = total_updated
            job.completed_at = timezone.now()
            job.save()

        prefix = '[DRY RUN] ' if dry_run else ''
        self.stdout.write(self.style.SUCCESS(
            f'\n{prefix}Discovery complete: {total_discovered} resources found, '
            f'{total_new} new, {total_updated} updated'
        ))
