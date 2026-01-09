"""
Management command to fix duplicate project memberships.
"""
from django.core.management.base import BaseCommand
from django.db.models import Count
from projects.models import ProjectMembership


class Command(BaseCommand):
    help = 'Remove duplicate project memberships (keep oldest)'

    def handle(self, *args, **options):
        # Find duplicates
        duplicates = (
            ProjectMembership.objects
            .values('project_id', 'user_id')
            .annotate(count=Count('id'))
            .filter(count__gt=1)
        )
        
        self.stdout.write(f'Found {duplicates.count()} duplicate membership pairs')
        
        fixed_count = 0
        for dup in duplicates:
            memberships = list(
                ProjectMembership.objects
                .filter(
                    project_id=dup['project_id'],
                    user_id=dup['user_id']
                )
                .order_by('created_at')
            )
            
            if len(memberships) > 1:
                # Keep first (oldest), delete rest
                to_delete = memberships[1:]
                for m in to_delete:
                    self.stdout.write(
                        f'Deleting duplicate: Project {m.project_id}, User {m.user_id}, ID {m.id}'
                    )
                    m.delete()
                    fixed_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'Fixed {fixed_count} duplicate memberships')
        )
