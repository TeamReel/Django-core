# Generated manually for B17 Contextual Notification Service

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('accounts', '0001_initial'),
        ('organisations', '0001_initial'),
        ('projects', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='RoutingRule',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('event_type', models.CharField(db_index=True, help_text="Event type pattern (e.g., 'project.updated', 'task.assigned')", max_length=255)),
                ('scope', models.CharField(choices=[('global', 'Global'), ('org', 'Organisation'), ('project', 'Project')], help_text='Rule application scope', max_length=20)),
                ('target_role', models.CharField(blank=True, help_text="Target role (e.g., 'org_admin', 'project_member')", max_length=50, null=True)),
                ('priority', models.IntegerField(choices=[(0, 'Low'), (1, 'Normal'), (2, 'High'), (3, 'Urgent')], default=1, help_text='Event priority for notification')),
                ('channel', models.CharField(choices=[('in_app', 'In-App'), ('email', 'Email'), ('push', 'Push')], help_text='Delivery channel', max_length=20)),
                ('is_enabled', models.BooleanField(db_index=True, default=True, help_text='Whether this rule is active')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, help_text='User who created this rule', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_routing_rules', to=settings.AUTH_USER_MODEL)),
                ('organisation', models.ForeignKey(blank=True, db_index=True, help_text='Organisation (NULL for global rules)', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notification_routing_rules', to='organisations.organisation')),
                ('project', models.ForeignKey(blank=True, help_text='Project (NULL for org/global rules)', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notification_routing_rules', to='projects.project')),
            ],
            options={
                'verbose_name': 'Routing Rule',
                'verbose_name_plural': 'Routing Rules',
                'db_table': 'contextual_notifications_routingrule',
                'ordering': ['-priority', 'event_type'],
            },
        ),
        migrations.CreateModel(
            name='NotificationPreference',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('event_type', models.CharField(db_index=True, help_text="Event type (e.g., 'project.updated', 'task.assigned')", max_length=255)),
                ('channel', models.CharField(choices=[('in_app', 'In-App'), ('email', 'Email'), ('push', 'Push')], help_text='Delivery channel', max_length=20)),
                ('enabled', models.BooleanField(default=True, help_text='Whether user wants to receive this notification type')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(db_index=True, help_text='User who owns this preference', on_delete=django.db.models.deletion.CASCADE, related_name='notification_preferences', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Notification Preference',
                'verbose_name_plural': 'Notification Preferences',
                'db_table': 'contextual_notifications_notificationpreference',
                'ordering': ['user', 'event_type', 'channel'],
            },
        ),
        migrations.CreateModel(
            name='OrganisationNotificationPolicy',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('policy_type', models.CharField(choices=[('default', 'Default')], default='default', help_text='Policy type (for future extensibility)', max_length=50)),
                ('quiet_hours_enabled', models.BooleanField(default=False, help_text='Enable quiet hours rate limiting')),
                ('quiet_hours_start', models.TimeField(blank=True, help_text='Quiet hours start time (e.g., 22:00)', null=True)),
                ('quiet_hours_end', models.TimeField(blank=True, help_text='Quiet hours end time (e.g., 08:00)', null=True)),
                ('quiet_hours_timezone', models.CharField(default='UTC', help_text='Timezone for quiet hours (pytz timezone name)', max_length=63)),
                ('quiet_hours_rate_limit', models.IntegerField(default=10, help_text='Max notifications per minute during quiet hours')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('organisation', models.OneToOneField(help_text='Organisation (one policy per org)', on_delete=django.db.models.deletion.CASCADE, related_name='notification_policy', to='organisations.organisation')),
            ],
            options={
                'verbose_name': 'Organisation Notification Policy',
                'verbose_name_plural': 'Organisation Notification Policies',
                'db_table': 'contextual_notifications_organisationnotificationpolicy',
                'ordering': ['organisation'],
            },
        ),
        migrations.AddIndex(
            model_name='routingrule',
            index=models.Index(fields=['event_type', 'organisation'], name='contextual_routing_ev_event_t_idx'),
        ),
        migrations.AddIndex(
            model_name='routingrule',
            index=models.Index(fields=['event_type', 'scope'], name='contextual_routing_ev_event_s_idx'),
        ),
        migrations.AddConstraint(
            model_name='routingrule',
            constraint=models.CheckConstraint(check=models.Q(('scope', 'global'), ('organisation__isnull', True), ('project__isnull', True), _connector='AND') | models.Q(('scope', 'org'), ('organisation__isnull', False), ('project__isnull', True), _connector='AND') | models.Q(('scope', 'project'), ('organisation__isnull', False), ('project__isnull', False), _connector='AND'), name='routing_rule_scope_consistency'),
        ),
        migrations.AddConstraint(
            model_name='routingrule',
            constraint=models.UniqueConstraint(fields=('event_type', 'scope', 'organisation', 'project', 'target_role', 'channel'), name='routing_rule_unique_constraint'),
        ),
        migrations.AddIndex(
            model_name='notificationpreference',
            index=models.Index(fields=['user', 'event_type', 'channel'], name='contextual_notific_user_id_event_t_idx'),
        ),
        migrations.AddConstraint(
            model_name='notificationpreference',
            constraint=models.UniqueConstraint(fields=('user', 'event_type', 'channel'), name='notification_preference_unique_constraint'),
        ),
        migrations.AddConstraint(
            model_name='organisationnotificationpolicy',
            constraint=models.CheckConstraint(check=models.Q(('quiet_hours_enabled', False)) | models.Q(('quiet_hours_enabled', True), ('quiet_hours_start__isnull', False), ('quiet_hours_end__isnull', False), _connector='AND'), name='org_policy_quiet_hours_consistency'),
        ),
    ]
