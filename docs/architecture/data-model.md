# Database Schema

> Auto-generated: 2026-03-12 11:21:01

**Database**: postgresql (switchback.proxy.rlwy.net)

## FK Relationship Summary

| Model | FK Field | Target |
|-------|----------|--------|
| accounts.User | `active_context` | accounts.UserActiveContext |
| accounts.UserActiveContext | `user` | accounts.User |
| accounts.UserActiveContext | `organisation` | organisations.Organisation |
| accounts.UserActiveContext | `club` | projects.Project |
| accounts.UserActiveContext | `team` | projects.Project |
| accounts.UserActiveContext | `season` | activities.Period |
| accounts.UserActiveContext | `competition` | activities.Period |
| accounts.UserActiveContext | `match` | activities.Activity |
| accounts.UserActiveContext | `membership` | projects.ProjectMembership |
| activities.Activity | `project` | projects.Project |
| activities.Activity | `period` | activities.Period |
| activities.Activity | `opponent_project` | projects.Project |
| activities.Activity | `created_by` | accounts.User |
| activities.ActivityEvent | `activity` | activities.Activity |
| activities.ActivityEvent | `member` | organisations.Membership |
| activities.ActivityEvent | `related_member` | organisations.Membership |
| activities.ActivityEvent | `team_project` | projects.Project |
| activities.ActivityEvent | `created_by` | accounts.User |
| activities.Participation | `activity` | activities.Activity |
| activities.Participation | `period` | activities.Period |
| activities.Participation | `member` | organisations.Membership |
| activities.Participation | `created_by` | accounts.User |
| activities.Period | `organisation` | organisations.Organisation |
| activities.Period | `project` | projects.Project |
| activities.Period | `parent_period` | activities.Period |
| activities.Period | `sport` | sport_configuration.Sport |
| activities.Period | `created_by` | accounts.User |
| audit.AuditEvent | `user` | accounts.User |
| audit.AuditEvent | `organization` | organisations.Organisation |
| audit.AuditEvent | `project` | projects.Project |
| branding.BrandAsset | `profile` | branding.BrandProfile |
| branding.BrandAsset | `file` | files.FileAsset |
| branding.BrandProfile | `organisation` | organisations.Organisation |
| branding.BrandProfile | `project` | projects.Project |
| branding.BrandProfile | `created_by` | accounts.User |
| branding.BrandProfile | `updated_by` | accounts.User |
| branding.DesignToken | `profile` | branding.BrandProfile |
| content_generation.ContentApproval | `content_item` | content_generation.ContentItem |
| content_generation.ContentApproval | `reviewer` | accounts.User |
| content_generation.ContentItem | `template` | content_generation.ContentTemplate |
| content_generation.ContentItem | `project` | projects.Project |
| content_generation.ContentItem | `activity` | activities.Activity |
| content_generation.ContentItem | `output_file` | files.FileAsset |
| content_generation.ContentItem | `created_by` | accounts.User |
| content_generation.ContentTemplate | `organisation` | organisations.Organisation |
| content_generation.ContentTemplate | `project` | projects.Project |
| content_generation.ContentTemplate | `created_by` | accounts.User |
| content_generation.ContentTemplate | `sport` | sport_configuration.Sport |
| content_generation.ContentTemplate | `formation` | sport_configuration.Formation |
| contextual_notifications.NotificationPreference | `user` | accounts.User |
| contextual_notifications.OrganisationNotificationPolicy | `organisation` | organisations.Organisation |
| contextual_notifications.RoutingRule | `organisation` | organisations.Organisation |
| contextual_notifications.RoutingRule | `project` | projects.Project |
| contextual_notifications.RoutingRule | `created_by` | accounts.User |
| credits.CreditsBalance | `organisation` | organisations.Organisation |
| credits.ProjectCreditsBalance | `project` | projects.Project |
| credits.UserCreditsBalance | `organisation` | organisations.Organisation |
| credits.UserCreditsBalance | `user` | accounts.User |
| files.FileAsset | `organization` | organisations.Organisation |
| files.FileAsset | `uploaded_by` | accounts.User |
| generative.GenerationOutput | `request` | generative.GenerationRequest |
| generative.GenerationRequest | `output` | generative.GenerationOutput |
| generative.GenerationRequest | `template` | generative.GenerationTemplate |
| generative.GenerationRequest | `requester` | accounts.User |
| generative.GenerationRequest | `project` | projects.Project |
| generative.GenerationTemplate | `organisation` | organisations.Organisation |
| generative.GenerationTemplate | `parent_template` | generative.GenerationTemplate |
| generative.GenerationTemplate | `created_by` | accounts.User |
| medialib.Collection | `project` | projects.Project |
| medialib.Collection | `created_by` | accounts.User |
| medialib.CollectionMembership | `collection` | medialib.Collection |
| medialib.CollectionMembership | `media_item` | medialib.MediaItem |
| medialib.MediaItem | `project` | projects.Project |
| medialib.MediaItem | `file` | files.FileAsset |
| medialib.MediaItem | `created_by` | accounts.User |
| medialib.MediaItem | `activity` | activities.Activity |
| medialib.MediaItem | `generation_request` | generative.GenerationRequest |
| medialib.MediaItemRelation | `media_item` | medialib.MediaItem |
| medialib.MediaItemRelation | `content_type` | contenttypes.ContentType |
| medialib.MediaItemRelation | `created_by` | accounts.User |
| medialib.MediaTag | `project` | projects.Project |
| medialib.MediaThumbnail | `media_item` | medialib.MediaItem |
| medialib.MediaThumbnail | `file` | files.FileAsset |
| navigation.UserFavorite | `user` | accounts.User |
| navigation.UserFavorite | `content_type` | contenttypes.ContentType |
| navigation.UserRecent | `user` | accounts.User |
| navigation.UserRecent | `content_type` | contenttypes.ContentType |
| notifications.DeliveryAttempt | `notification` | notifications.Notification |
| notifications.Notification | `type` | notifications.NotificationType |
| notifications.Notification | `recipient_user` | accounts.User |
| notifications.NotificationType | `retry_policy` | notifications.RetryPolicy |
| organisations.Membership | `user` | accounts.User |
| organisations.Membership | `organisation` | organisations.Organisation |
| organisations.Membership | `invited_by` | accounts.User |
| organisations.Organisation | `credits_balance` | credits.CreditsBalance |
| organisations.Organisation | `notification_policy` | contextual_notifications.OrganisationNotificationPolicy |
| organisations.Organisation | `creator` | accounts.User |
| organisations.Organisation | `sport` | sport_configuration.Sport |
| permissions.RoleAssignment | `user` | accounts.User |
| permissions.RoleAssignment | `role` | permissions.Role |
| permissions.RoleAssignment | `target_organization` | organisations.Organisation |
| permissions.RoleAssignment | `target_project` | projects.Project |
| permissions.RoleAssignment | `assigned_by` | accounts.User |
| projects.Project | `project_credits_balance` | credits.ProjectCreditsBalance |
| projects.Project | `organisation` | organisations.Organisation |
| projects.Project | `creator` | accounts.User |
| projects.Project | `parent_project` | projects.Project |
| projects.Project | `sport` | sport_configuration.Sport |
| projects.ProjectFunctionalRoleAssignment | `project` | projects.Project |
| projects.ProjectFunctionalRoleAssignment | `user` | accounts.User |
| projects.ProjectInvite | `project` | projects.Project |
| projects.ProjectInvite | `invited_by` | accounts.User |
| projects.ProjectMembership | `project` | projects.Project |
| projects.ProjectMembership | `user` | accounts.User |
| projects.ProjectMembership | `period` | activities.Period |
| projects.ProjectMembershipPromotion | `project` | projects.Project |
| projects.ProjectMembershipPromotion | `target_user` | accounts.User |
| projects.ProjectMembershipPromotion | `requested_by` | accounts.User |
| rtc_websockets.ActivityEvent | `actor_user` | accounts.User |
| rtc_websockets.PresenceStatus | `user` | accounts.User |
| rtc_websockets.RealtimeMessage | `sender_user` | accounts.User |
| rtc_websockets.WebSocketConnection | `user` | accounts.User |
| search.SearchEntry | `content_type` | contenttypes.ContentType |
| settings.FeatureFlag | `user` | accounts.User |
| settings.FeatureFlag | `organisation` | organisations.Organisation |
| settings.FeatureFlag | `project` | projects.Project |
| settings.FeatureFlag | `created_by` | accounts.User |
| settings.FeatureFlag | `updated_by` | accounts.User |
| settings.Setting | `user` | accounts.User |
| settings.Setting | `organisation` | organisations.Organisation |
| settings.Setting | `project` | projects.Project |
| settings.Setting | `created_by` | accounts.User |
| settings.Setting | `updated_by` | accounts.User |
| sport_configuration.Formation | `sport_config` | sport_configuration.SportConfiguration |
| sport_configuration.OutfitConfiguration | `project` | projects.Project |
| sport_configuration.Sport | `configuration` | sport_configuration.SportConfiguration |
| sport_configuration.Sport | `parent_sport` | sport_configuration.Sport |
| sport_configuration.SportConfiguration | `sport` | sport_configuration.Sport |
| transactions.BalancePolicy | `organization` | organisations.Organisation |
| transactions.BalancePolicy | `project` | projects.Project |
| transactions.Transaction | `organization` | organisations.Organisation |
| transactions.Transaction | `project` | projects.Project |
| transactions.Transaction | `charged_user` | accounts.User |
| transactions.Transaction | `usage_event` | transactions.UsageEvent |
| transactions.Transaction | `created_by` | accounts.User |
| transactions.UsageEvent | `user` | accounts.User |
| transactions.UsageEvent | `organization` | organisations.Organisation |
| transactions.UsageEvent | `project` | projects.Project |
| video.PlatformExport | `preset` | video.VideoPreset |
| video.VideoJob | `project` | projects.Project |
| video.VideoJob | `created_by` | accounts.User |
| video.VideoJob | `input_file` | files.FileAsset |
| video.VideoJob | `output_file` | files.FileAsset |
| video.VideoJob | `preset` | video.VideoPreset |
| video.VideoJob | `platform_export` | video.PlatformExport |
| video.VideoJob | `workflow_instance` | workflows.WorkflowInstance |
| video.VideoOverlay | `job` | video.VideoJob |
| video.VideoOverlay | `asset_file` | files.FileAsset |
| workflows.ProjectPermissionOverride | `project` | projects.Project |
| workflows.ProjectPermissionOverride | `workflow` | workflows.WorkflowTemplate |
| workflows.TransitionHistory | `instance` | workflows.WorkflowInstance |
| workflows.TransitionHistory | `actor` | accounts.User |
| workflows.WorkflowInstance | `workflow` | workflows.WorkflowTemplate |
| workflows.WorkflowInstance | `project` | projects.Project |
| workflows.WorkflowInstance | `content_type` | contenttypes.ContentType |
| workflows.WorkflowInstance | `created_by` | accounts.User |

---

## Table Details

### organisations

#### Organisation
- Table: `organisations_organisation`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `memberships` | ForeignKey | Yes | `organisations_membership` |
| `projects` | ForeignKey | Yes | `projects_project` |
| `role_assignments` | ForeignKey | Yes | `permissions_roleassignment` |
| `audit_events` | ForeignKey | Yes | `audit_events` |
| `feature_flags` | ForeignKey | Yes | `settings_feature_flag` |
| `settings` | ForeignKey | Yes | `settings_setting` |
| `usage_events` | ForeignKey | Yes | `transactions_usageevent` |
| `transactions` | ForeignKey | Yes | `transactions_transaction` |
| `balance_policies` | ForeignKey | Yes | `transactions_balancepolicy` |
| `credits_balance` | OneToOneField | Yes | `credits_creditsbalance` |
| `user_credits_balances` | ForeignKey | Yes | `credits_usercreditsbalance` |
| `notification_policy` | OneToOneField | Yes | `contextual_notifications_organisationnotificationpolicy` |
| `notification_routing_rules` | ForeignKey | Yes | `contextual_notifications_routingrule` |
| `assets` | ForeignKey | Yes | `files_fileasset` |
| `periods` | ForeignKey | Yes | `activities_period` |
| `content_templates` | ForeignKey | Yes | `content_generation_contenttemplate` |
| `brand_profiles` | ForeignKey | Yes | `branding_brandprofile` |
| `generation_templates` | ForeignKey | Yes | `generative_template` |
| `id` | UUIDField | No | - |
| `name` | CharField | No | - |
| `slug` | SlugField | No | - |
| `description` | TextField | Yes | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |
| `creator` | ForeignKey | No | `accounts_user` |
| `is_active` | BooleanField | No | - |
| `deleted_at` | DateTimeField | Yes | - |
| `enable_theme_toggle` | BooleanField | No | - |
| `sport` | ForeignKey | Yes | `sport_configuration_sport` |
| `metadata` | JSONField | No | - |

#### Membership
- Table: `organisations_membership`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `participations` | ForeignKey | Yes | `activities_participation` |
| `activity_events` | ForeignKey | Yes | `activities_activityevent` |
| `related_activity_events` | ForeignKey | Yes | `activities_activityevent` |
| `id` | UUIDField | No | - |
| `user` | ForeignKey | No | `accounts_user` |
| `organisation` | ForeignKey | No | `organisations_organisation` |
| `role` | CharField | No | - |
| `joined_at` | DateTimeField | No | - |
| `invited_by` | ForeignKey | Yes | `accounts_user` |
| `is_active` | BooleanField | No | - |

### projects

#### Project
- Table: `projects_project`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `children` | ForeignKey | Yes | `projects_project` |
| `memberships` | ForeignKey | Yes | `projects_membership` |
| `invitations` | ForeignKey | Yes | `projects_invite` |
| `promotions` | ForeignKey | Yes | `projects_promotion` |
| `functional_role_assignments` | ForeignKey | Yes | `projects_functional_role_assignment` |
| `role_assignments` | ForeignKey | Yes | `permissions_roleassignment` |
| `audit_events` | ForeignKey | Yes | `audit_events` |
| `feature_flags` | ForeignKey | Yes | `settings_feature_flag` |
| `settings` | ForeignKey | Yes | `settings_setting` |
| `usage_events` | ForeignKey | Yes | `transactions_usageevent` |
| `transactions` | ForeignKey | Yes | `transactions_transaction` |
| `balance_policies` | ForeignKey | Yes | `transactions_balancepolicy` |
| `project_credits_balance` | OneToOneField | Yes | `credits_projectcreditsbalance` |
| `notification_routing_rules` | ForeignKey | Yes | `contextual_notifications_routingrule` |
| `periods` | ForeignKey | Yes | `activities_period` |
| `activities` | ForeignKey | Yes | `activities_activity` |
| `opponent_activities` | ForeignKey | Yes | `activities_activity` |
| `activity_events` | ForeignKey | Yes | `activities_activityevent` |
| `content_templates` | ForeignKey | Yes | `content_generation_contenttemplate` |
| `content_items` | ForeignKey | Yes | `content_generation_contentitem` |
| `outfit_configurations` | ForeignKey | Yes | `sport_configuration_outfitconfiguration` |
| `brand_profiles` | ForeignKey | Yes | `branding_brandprofile` |
| `generation_requests` | ForeignKey | Yes | `generative_request` |
| `media_items` | ForeignKey | Yes | `medialib_items` |
| `media_tags` | ForeignKey | Yes | `medialib_tags` |
| `media_collections` | ForeignKey | Yes | `medialib_collections` |
| `workflow_instances` | ForeignKey | Yes | `workflow_instances` |
| `workflow_permissions` | ForeignKey | Yes | `project_permission_overrides` |
| `video_jobs` | ForeignKey | Yes | `video_jobs` |
| `id` | BigAutoField | No | - |
| `organisation` | ForeignKey | No | `organisations_organisation` |
| `creator` | ForeignKey | No | `accounts_user` |
| `name` | CharField | No | - |
| `slug` | SlugField | No | - |
| `description` | TextField | No | - |
| `is_active` | BooleanField | No | - |
| `is_private` | BooleanField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |
| `archived_at` | DateTimeField | Yes | - |
| `parent_project` | ForeignKey | Yes | `projects_project` |
| `team_type` | CharField | No | - |
| `sport` | ForeignKey | Yes | `sport_configuration_sport` |
| `metadata` | JSONField | No | - |

#### ProjectMembership
- Table: `projects_membership`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | UUIDField | No | - |
| `project` | ForeignKey | No | `projects_project` |
| `user` | ForeignKey | No | `accounts_user` |
| `period` | ForeignKey | Yes | `activities_period` |
| `role` | CharField | No | - |
| `assignment_reason` | CharField | No | - |
| `metadata` | JSONField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |
| `deleted_at` | DateTimeField | Yes | - |

#### ProjectInvite
- Table: `projects_invite`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | UUIDField | No | - |
| `project` | ForeignKey | No | `projects_project` |
| `email` | CharField | No | - |
| `role` | CharField | No | - |
| `token` | CharField | No | - |
| `status` | CharField | No | - |
| `invited_by` | ForeignKey | Yes | `accounts_user` |
| `created_at` | DateTimeField | No | - |
| `expires_at` | DateTimeField | No | - |
| `accepted_at` | DateTimeField | Yes | - |

#### ProjectMembershipPromotion
- Table: `projects_promotion`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | UUIDField | No | - |
| `project` | ForeignKey | No | `projects_project` |
| `target_user` | ForeignKey | No | `accounts_user` |
| `requested_by` | ForeignKey | Yes | `accounts_user` |
| `from_role` | CharField | No | - |
| `to_role` | CharField | No | - |
| `status` | CharField | No | - |
| `is_suspicious` | BooleanField | No | - |
| `suspicious_reason` | TextField | Yes | - |
| `created_at` | DateTimeField | No | - |
| `expires_at` | DateTimeField | No | - |
| `resolved_at` | DateTimeField | Yes | - |

#### ProjectFunctionalRoleAssignment
- Table: `projects_functional_role_assignment`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | UUIDField | No | - |
| `project` | ForeignKey | No | `projects_project` |
| `user` | ForeignKey | No | `accounts_user` |
| `role` | CharField | No | - |
| `assignment_reason` | CharField | No | - |
| `created_at` | DateTimeField | No | - |

### activities

#### Period
- Table: `activities_period`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `project_memberships` | ForeignKey | Yes | `projects_membership` |
| `children` | ForeignKey | Yes | `activities_period` |
| `activities` | ForeignKey | Yes | `activities_activity` |
| `participations` | ForeignKey | Yes | `activities_participation` |
| `id` | UUIDField | No | - |
| `organisation` | ForeignKey | No | `organisations_organisation` |
| `project` | ForeignKey | Yes | `projects_project` |
| `parent_period` | ForeignKey | Yes | `activities_period` |
| `sport` | ForeignKey | Yes | `sport_configuration_sport` |
| `period_type` | CharField | No | - |
| `name` | CharField | No | - |
| `description` | TextField | No | - |
| `start_date` | DateField | No | - |
| `end_date` | DateField | No | - |
| `metadata` | JSONField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |
| `created_by` | ForeignKey | Yes | `accounts_user` |

#### Activity
- Table: `activities_activity`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `participations` | ForeignKey | Yes | `activities_participation` |
| `events` | ForeignKey | Yes | `activities_activityevent` |
| `content_items` | ForeignKey | Yes | `content_generation_contentitem` |
| `mediaitem` | ForeignKey | Yes | `medialib_items` |
| `id` | UUIDField | No | - |
| `slug` | SlugField | Yes | - |
| `project` | ForeignKey | No | `projects_project` |
| `period` | ForeignKey | No | `activities_period` |
| `opponent_project` | ForeignKey | Yes | `projects_project` |
| `title` | CharField | No | - |
| `activity_type` | CharField | No | - |
| `start_time` | DateTimeField | No | - |
| `end_time` | DateTimeField | No | - |
| `location` | CharField | No | - |
| `description` | TextField | No | - |
| `metadata` | JSONField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |
| `created_by` | ForeignKey | Yes | `accounts_user` |

#### Participation
- Table: `activities_participation`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | UUIDField | No | - |
| `activity` | ForeignKey | Yes | `activities_activity` |
| `period` | ForeignKey | Yes | `activities_period` |
| `member` | ForeignKey | No | `organisations_membership` |
| `role` | CharField | No | - |
| `status` | CharField | No | - |
| `notes` | TextField | No | - |
| `data` | JSONField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |
| `created_by` | ForeignKey | Yes | `accounts_user` |

#### ActivityEvent
- Table: `activities_activityevent`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | UUIDField | No | - |
| `activity` | ForeignKey | No | `activities_activity` |
| `event_type` | CharField | No | - |
| `minute` | PositiveSmallIntegerField | Yes | - |
| `occurred_at` | DateTimeField | Yes | - |
| `member` | ForeignKey | Yes | `organisations_membership` |
| `related_member` | ForeignKey | Yes | `organisations_membership` |
| `team_project` | ForeignKey | Yes | `projects_project` |
| `data` | JSONField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |
| `created_by` | ForeignKey | Yes | `accounts_user` |

### accounts

#### User
- Table: `accounts_user`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `active_context` | OneToOneField | Yes | `accounts_user_active_context` |
| `logentry` | ForeignKey | Yes | `django_admin_log` |
| `outstandingtoken` | ForeignKey | Yes | `token_blacklist_outstandingtoken` |
| `websocket_connections` | ForeignKey | Yes | `realtime_websocket_connection` |
| `sent_realtime_messages` | ForeignKey | Yes | `realtime_message` |
| `presence_statuses` | ForeignKey | Yes | `realtime_presence_status` |
| `activity_events` | ForeignKey | Yes | `realtime_activity_event` |
| `created_organisations` | ForeignKey | Yes | `organisations_organisation` |
| `organisation_memberships` | ForeignKey | Yes | `organisations_membership` |
| `invited_memberships` | ForeignKey | Yes | `organisations_membership` |
| `created_projects` | ForeignKey | Yes | `projects_project` |
| `project_memberships` | ForeignKey | Yes | `projects_membership` |
| `sent_project_invitations` | ForeignKey | Yes | `projects_invite` |
| `project_promotions_received` | ForeignKey | Yes | `projects_promotion` |
| `project_promotions_initiated` | ForeignKey | Yes | `projects_promotion` |
| `project_functional_roles` | ForeignKey | Yes | `projects_functional_role_assignment` |
| `role_assignments` | ForeignKey | Yes | `permissions_roleassignment` |
| `role_assignments_made` | ForeignKey | Yes | `permissions_roleassignment` |
| `audit_events` | ForeignKey | Yes | `audit_events` |
| `feature_flags` | ForeignKey | Yes | `settings_feature_flag` |
| `settings` | ForeignKey | Yes | `settings_setting` |
| `usage_events` | ForeignKey | Yes | `transactions_usageevent` |
| `charged_transactions` | ForeignKey | Yes | `transactions_transaction` |
| `created_transactions` | ForeignKey | Yes | `transactions_transaction` |
| `credits_balances` | ForeignKey | Yes | `credits_usercreditsbalance` |
| `notifications` | ForeignKey | Yes | `notifications_notification` |
| `notification_preferences` | ForeignKey | Yes | `contextual_notifications_notificationpreference` |
| `created_routing_rules` | ForeignKey | Yes | `contextual_notifications_routingrule` |
| `fileasset` | ForeignKey | Yes | `files_fileasset` |
| `created_periods` | ForeignKey | Yes | `activities_period` |
| `created_activities` | ForeignKey | Yes | `activities_activity` |
| `created_participations` | ForeignKey | Yes | `activities_participation` |
| `created_activity_events` | ForeignKey | Yes | `activities_activityevent` |
| `created_templates` | ForeignKey | Yes | `content_generation_contenttemplate` |
| `created_content_items` | ForeignKey | Yes | `content_generation_contentitem` |
| `content_approvals` | ForeignKey | Yes | `content_generation_contentapproval` |
| `created_brand_profiles` | ForeignKey | Yes | `branding_brandprofile` |
| `updated_brand_profiles` | ForeignKey | Yes | `branding_brandprofile` |
| `created_generation_templates` | ForeignKey | Yes | `generative_template` |
| `generation_requests` | ForeignKey | Yes | `generative_request` |
| `mediaitem` | ForeignKey | Yes | `medialib_items` |
| `collection` | ForeignKey | Yes | `medialib_collections` |
| `mediaitemrelation` | ForeignKey | Yes | `medialib_relations` |
| `transitions` | ForeignKey | Yes | `transition_history` |
| `created_workflows` | ForeignKey | Yes | `workflow_instances` |
| `userrecent_set` | ForeignKey | Yes | `navigation_userrecent` |
| `userfavorite_set` | ForeignKey | Yes | `navigation_userfavorite` |
| `video_jobs` | ForeignKey | Yes | `video_jobs` |
| `id` | BigAutoField | No | - |
| `email` | CharField | No | - |
| `password` | CharField | No | - |
| `first_name` | CharField | No | - |
| `last_name` | CharField | No | - |
| `is_active` | BooleanField | No | - |
| `is_staff` | BooleanField | No | - |
| `is_superuser` | BooleanField | No | - |
| `email_verified` | BooleanField | No | - |
| `email_verification_sent_at` | DateTimeField | Yes | - |
| `date_joined` | DateTimeField | No | - |
| `last_login` | DateTimeField | Yes | - |
| `avatar` | FileField | Yes | - |
| `two_factor_enabled` | BooleanField | No | - |
| `groups` | ManyToManyField | No | `auth_group` |
| `user_permissions` | ManyToManyField | No | `auth_permission` |

#### UserActiveContext
- Table: `accounts_user_active_context`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | BigAutoField | No | - |
| `user` | OneToOneField | No | `accounts_user` |
| `organisation` | ForeignKey | Yes | `organisations_organisation` |
| `club` | ForeignKey | Yes | `projects_project` |
| `team` | ForeignKey | Yes | `projects_project` |
| `season` | ForeignKey | Yes | `activities_period` |
| `competition` | ForeignKey | Yes | `activities_period` |
| `match` | ForeignKey | Yes | `activities_activity` |
| `membership` | ForeignKey | Yes | `projects_membership` |
| `updated_at` | DateTimeField | No | - |

### permissions

#### Permission
- Table: `permissions_permission`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `roles` | ManyToManyField | Yes | `permissions_role` |
| `id` | UUIDField | No | - |
| `permission` | CharField | No | - |
| `resource_type` | CharField | No | - |
| `description` | TextField | No | - |
| `is_sensitive` | BooleanField | No | - |
| `created_at` | DateTimeField | No | - |

#### Role
- Table: `permissions_role`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `assignments` | ForeignKey | Yes | `permissions_roleassignment` |
| `id` | UUIDField | No | - |
| `name` | CharField | No | - |
| `description` | TextField | No | - |
| `scope` | CharField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |
| `permissions` | ManyToManyField | No | `permissions_permission` |

#### RoleAssignment
- Table: `permissions_roleassignment`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | UUIDField | No | - |
| `user` | ForeignKey | No | `accounts_user` |
| `role` | ForeignKey | No | `permissions_role` |
| `scope` | CharField | No | - |
| `target_organization` | ForeignKey | Yes | `organisations_organisation` |
| `target_project` | ForeignKey | Yes | `projects_project` |
| `assigned_by` | ForeignKey | Yes | `accounts_user` |
| `assigned_at` | DateTimeField | No | - |

### content_generation

#### ContentTemplate
- Table: `content_generation_contenttemplate`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `contentitem_set` | ForeignKey | Yes | `content_generation_contentitem` |
| `id` | BigAutoField | No | - |
| `name` | CharField | No | - |
| `description` | TextField | Yes | - |
| `template_type` | CharField | No | - |
| `template_subtype` | CharField | Yes | - |
| `sport_type` | CharField | Yes | - |
| `ai_workflow_id` | CharField | No | - |
| `template_settings` | JSONField | No | - |
| `timeout_minutes` | IntegerField | Yes | - |
| `is_active` | BooleanField | No | - |
| `credits_required` | PositiveIntegerField | No | - |
| `organisation` | ForeignKey | Yes | `organisations_organisation` |
| `project` | ForeignKey | Yes | `projects_project` |
| `created_by` | ForeignKey | Yes | `accounts_user` |
| `sport` | ForeignKey | Yes | `sport_configuration_sport` |
| `formation` | ForeignKey | Yes | `sport_configuration_formation` |
| `style_variant` | CharField | Yes | - |
| `input_requirements` | JSONField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |

#### ContentItem
- Table: `content_generation_contentitem`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `contentapproval_set` | ForeignKey | Yes | `content_generation_contentapproval` |
| `id` | BigAutoField | No | - |
| `template` | ForeignKey | No | `content_generation_contenttemplate` |
| `project` | ForeignKey | No | `projects_project` |
| `activity` | ForeignKey | Yes | `activities_activity` |
| `output_file` | ForeignKey | Yes | `files_fileasset` |
| `created_by` | ForeignKey | No | `accounts_user` |
| `status` | CharField | No | - |
| `input_data` | JSONField | No | - |
| `error_message` | TextField | Yes | - |
| `metadata` | JSONField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |
| `deleted_at` | DateTimeField | Yes | - |

#### ContentApproval
- Table: `content_generation_contentapproval`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | BigAutoField | No | - |
| `content_item` | ForeignKey | No | `content_generation_contentitem` |
| `reviewer` | ForeignKey | No | `accounts_user` |
| `status` | CharField | No | - |
| `feedback_text` | TextField | Yes | - |
| `reviewed_at` | DateTimeField | No | - |

### medialib

#### MediaItem
- Table: `medialib_items`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `collections` | ManyToManyField | Yes | `medialib_collections` |
| `collectionmembership` | ForeignKey | Yes | `medialib_collection_membership` |
| `relations` | ForeignKey | Yes | `medialib_relations` |
| `thumbnails` | ForeignKey | Yes | `medialib_thumbnails` |
| `id` | UUIDField | No | - |
| `project` | ForeignKey | No | `projects_project` |
| `file` | ForeignKey | No | `files_fileasset` |
| `title` | CharField | No | - |
| `description` | TextField | No | - |
| `mime_type` | CharField | No | - |
| `file_size_bytes` | BigIntegerField | No | - |
| `width` | PositiveIntegerField | Yes | - |
| `height` | PositiveIntegerField | Yes | - |
| `duration_seconds` | DecimalField | Yes | - |
| `state` | CharField | No | - |
| `extraction_metadata` | JSONField | No | - |
| `search_vector` | SearchVectorField | Yes | - |
| `created_by` | ForeignKey | Yes | `accounts_user` |
| `activity` | ForeignKey | Yes | `activities_activity` |
| `generation_request` | ForeignKey | Yes | `generative_request` |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |
| `tags` | ManyToManyField | No | `medialib_tags` |

#### MediaTag
- Table: `medialib_tags`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `items` | ManyToManyField | Yes | `medialib_items` |
| `id` | UUIDField | No | - |
| `name` | CharField | No | - |
| `slug` | SlugField | No | - |
| `project` | ForeignKey | Yes | `projects_project` |
| `is_system` | BooleanField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |

#### Collection
- Table: `medialib_collections`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `collectionmembership` | ForeignKey | Yes | `medialib_collection_membership` |
| `id` | UUIDField | No | - |
| `project` | ForeignKey | No | `projects_project` |
| `name` | CharField | No | - |
| `description` | TextField | No | - |
| `created_by` | ForeignKey | Yes | `accounts_user` |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |
| `items` | ManyToManyField | No | `medialib_items` |

#### CollectionMembership
- Table: `medialib_collection_membership`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | BigAutoField | No | - |
| `collection` | ForeignKey | No | `medialib_collections` |
| `media_item` | ForeignKey | No | `medialib_items` |
| `position` | PositiveIntegerField | No | - |
| `added_at` | DateTimeField | No | - |

#### MediaItemRelation
- Table: `medialib_relations`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | UUIDField | No | - |
| `media_item` | ForeignKey | No | `medialib_items` |
| `content_type` | ForeignKey | No | `django_content_type` |
| `object_id` | UUIDField | No | - |
| `relation_type` | CharField | No | - |
| `metadata` | JSONField | No | - |
| `created_by` | ForeignKey | Yes | `accounts_user` |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |
| `target` | GenericForeignKey | No | - |

#### MediaThumbnail
- Table: `medialib_thumbnails`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | UUIDField | No | - |
| `media_item` | ForeignKey | No | `medialib_items` |
| `file` | ForeignKey | No | `files_fileasset` |
| `size_label` | CharField | No | - |
| `width` | PositiveIntegerField | No | - |
| `height` | PositiveIntegerField | No | - |
| `created_at` | DateTimeField | No | - |

### files

#### FileAsset
- Table: `files_fileasset`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `content_items` | ForeignKey | Yes | `content_generation_contentitem` |
| `brand_assets` | ForeignKey | Yes | `branding_brandasset` |
| `mediaitem` | ForeignKey | Yes | `medialib_items` |
| `mediathumbnail` | ForeignKey | Yes | `medialib_thumbnails` |
| `video_jobs_as_source` | ForeignKey | Yes | `video_jobs` |
| `video_jobs_as_output` | ForeignKey | Yes | `video_jobs` |
| `video_overlays` | ForeignKey | Yes | `video_overlays` |
| `id` | UUIDField | No | - |
| `organization` | ForeignKey | No | `organisations_organisation` |
| `uploaded_by` | ForeignKey | Yes | `accounts_user` |
| `original_name` | CharField | No | - |
| `storage_path` | CharField | No | - |
| `file_size` | PositiveIntegerField | No | - |
| `mime_type` | CharField | No | - |
| `is_public` | BooleanField | No | - |
| `is_deleted` | BooleanField | No | - |
| `deleted_at` | DateTimeField | Yes | - |
| `metadata` | JSONField | No | - |
| `thumbnail_path` | CharField | Yes | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |

### branding

#### BrandProfile
- Table: `branding_brandprofile`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `design_tokens` | ForeignKey | Yes | `branding_designtoken` |
| `brand_assets` | ForeignKey | Yes | `branding_brandasset` |
| `id` | UUIDField | No | - |
| `organisation` | ForeignKey | Yes | `organisations_organisation` |
| `project` | ForeignKey | Yes | `projects_project` |
| `name` | CharField | No | - |
| `is_active` | BooleanField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |
| `created_by` | ForeignKey | Yes | `accounts_user` |
| `updated_by` | ForeignKey | Yes | `accounts_user` |

#### DesignToken
- Table: `branding_designtoken`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | UUIDField | No | - |
| `profile` | ForeignKey | No | `branding_brandprofile` |
| `key` | CharField | No | - |
| `value` | CharField | No | - |
| `type` | CharField | No | - |
| `description` | TextField | Yes | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |

#### BrandAsset
- Table: `branding_brandasset`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | UUIDField | No | - |
| `profile` | ForeignKey | No | `branding_brandprofile` |
| `file` | ForeignKey | No | `files_fileasset` |
| `asset_type` | CharField | No | - |
| `label` | CharField | No | - |
| `alt_text` | CharField | No | - |
| `is_active` | BooleanField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |

### generative

#### GenerationTemplate
- Table: `generative_template`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `child_versions` | ForeignKey | Yes | `generative_template` |
| `requests` | ForeignKey | Yes | `generative_request` |
| `id` | BigAutoField | No | - |
| `organisation` | ForeignKey | No | `organisations_organisation` |
| `name` | CharField | No | - |
| `slug` | SlugField | No | - |
| `version` | CharField | No | - |
| `parent_template` | ForeignKey | Yes | `generative_template` |
| `is_latest` | BooleanField | No | - |
| `description` | TextField | No | - |
| `template_type` | CharField | No | - |
| `template_subtype` | CharField | No | - |
| `input_schema` | JSONField | No | - |
| `pipeline_config` | JSONField | No | - |
| `retention_days` | PositiveIntegerField | Yes | - |
| `is_active` | BooleanField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |
| `created_by` | ForeignKey | No | `accounts_user` |

#### GenerationRequest
- Table: `generative_request`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `output` | OneToOneField | Yes | `generative_output` |
| `mediaitem` | ForeignKey | Yes | `medialib_items` |
| `id` | BigAutoField | No | - |
| `template` | ForeignKey | No | `generative_template` |
| `template_version` | CharField | No | - |
| `requester` | ForeignKey | No | `accounts_user` |
| `project` | ForeignKey | Yes | `projects_project` |
| `status` | CharField | No | - |
| `input_data` | JSONField | No | - |
| `retry_count` | PositiveIntegerField | No | - |
| `error_category` | CharField | Yes | - |
| `error_message` | TextField | No | - |
| `estimated_cost` | DecimalField | No | - |
| `actual_cost` | DecimalField | Yes | - |
| `transaction_id` | BigIntegerField | Yes | - |
| `metadata` | JSONField | No | - |
| `created_at` | DateTimeField | No | - |
| `started_at` | DateTimeField | Yes | - |
| `completed_at` | DateTimeField | Yes | - |

#### GenerationOutput
- Table: `generative_output`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `request` | OneToOneField | No | `generative_request` |
| `output_type` | CharField | No | - |
| `file_id` | UUIDField | Yes | - |
| `text_content` | TextField | No | - |
| `metadata` | JSONField | No | - |
| `expires_at` | DateTimeField | Yes | - |
| `created_at` | DateTimeField | No | - |

#### GenerationJob
- Table: `generative_job`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | BigAutoField | No | - |
| `task_id` | UUIDField | No | - |
| `template_id` | CharField | No | - |
| `label` | CharField | No | - |
| `output_type` | CharField | No | - |
| `output_asset_type` | CharField | No | - |
| `project_id` | CharField | Yes | - |
| `membership_id` | CharField | Yes | - |
| `created_by_id` | IntegerField | Yes | - |
| `status` | CharField | No | - |
| `progress` | PositiveSmallIntegerField | No | - |
| `error_message` | TextField | No | - |
| `approval_status` | CharField | Yes | - |
| `reviewed_by_id` | IntegerField | Yes | - |
| `reviewed_at` | DateTimeField | Yes | - |
| `output_url` | TextField | No | - |
| `output_variants` | JSONField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |
| `completed_at` | DateTimeField | Yes | - |

### video

#### VideoJob
- Table: `video_jobs`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `overlays` | ForeignKey | Yes | `video_overlays` |
| `id` | UUIDField | No | - |
| `project` | ForeignKey | No | `projects_project` |
| `created_by` | ForeignKey | Yes | `accounts_user` |
| `job_type` | CharField | No | - |
| `status` | CharField | No | - |
| `progress_percent` | IntegerField | No | - |
| `input_file` | ForeignKey | Yes | `files_fileasset` |
| `output_file` | ForeignKey | Yes | `files_fileasset` |
| `preset` | ForeignKey | Yes | `video_presets` |
| `platform_export` | ForeignKey | Yes | `video_platform_exports` |
| `workflow_instance` | ForeignKey | Yes | `workflow_instances` |
| `config` | JSONField | No | - |
| `metadata` | JSONField | No | - |
| `error_message` | TextField | No | - |
| `error_code` | CharField | No | - |
| `retry_count` | IntegerField | No | - |
| `started_at` | DateTimeField | Yes | - |
| `completed_at` | DateTimeField | Yes | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |

#### VideoOverlay
- Table: `video_overlays`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | UUIDField | No | - |
| `job` | ForeignKey | No | `video_jobs` |
| `overlay_type` | CharField | No | - |
| `position` | CharField | No | - |
| `position_x` | IntegerField | Yes | - |
| `position_y` | IntegerField | Yes | - |
| `padding_percent` | IntegerField | No | - |
| `opacity` | FloatField | No | - |
| `start_time` | FloatField | Yes | - |
| `end_time` | FloatField | Yes | - |
| `z_index` | IntegerField | No | - |
| `content` | JSONField | No | - |
| `asset_file` | ForeignKey | Yes | `files_fileasset` |
| `created_at` | DateTimeField | No | - |

#### PlatformExport
- Table: `video_platform_exports`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `jobs` | ForeignKey | Yes | `video_jobs` |
| `id` | UUIDField | No | - |
| `platform` | CharField | No | - |
| `name` | CharField | No | - |
| `aspect_ratio` | CharField | No | - |
| `max_duration_seconds` | IntegerField | Yes | - |
| `max_file_size_mb` | IntegerField | Yes | - |
| `resolution` | CharField | No | - |
| `preset` | ForeignKey | No | `video_presets` |
| `crop_strategy` | CharField | No | - |
| `recommended` | BooleanField | No | - |
| `is_active` | BooleanField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |

#### VideoPreset
- Table: `video_presets`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `jobs` | ForeignKey | Yes | `video_jobs` |
| `platform_exports` | ForeignKey | Yes | `video_platform_exports` |
| `id` | UUIDField | No | - |
| `name` | CharField | No | - |
| `description` | TextField | No | - |
| `output_format` | CharField | No | - |
| `video_codec` | CharField | No | - |
| `audio_codec` | CharField | No | - |
| `resolution` | CharField | No | - |
| `bitrate_video` | CharField | No | - |
| `bitrate_audio` | CharField | No | - |
| `framerate` | IntegerField | Yes | - |
| `crf` | IntegerField | Yes | - |
| `extra_params` | JSONField | No | - |
| `is_system` | BooleanField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |

### credits

#### CreditsBalance
- Table: `credits_creditsbalance`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | BigAutoField | No | - |
| `organisation` | OneToOneField | No | `organisations_organisation` |
| `current_balance` | IntegerField | No | - |
| `updated_at` | DateTimeField | No | - |
| `created_at` | DateTimeField | No | - |

#### ProjectCreditsBalance
- Table: `credits_projectcreditsbalance`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | BigAutoField | No | - |
| `project` | OneToOneField | No | `projects_project` |
| `current_balance` | DecimalField | No | - |
| `updated_at` | DateTimeField | No | - |
| `created_at` | DateTimeField | No | - |

#### UserCreditsBalance
- Table: `credits_usercreditsbalance`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | BigAutoField | No | - |
| `organisation` | ForeignKey | No | `organisations_organisation` |
| `user` | ForeignKey | No | `accounts_user` |
| `current_balance` | DecimalField | No | - |
| `updated_at` | DateTimeField | No | - |
| `created_at` | DateTimeField | No | - |

### transactions

#### UsageEvent
- Table: `transactions_usageevent`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `transactions` | ForeignKey | Yes | `transactions_transaction` |
| `id` | UUIDField | No | - |
| `event_type` | CharField | No | - |
| `user` | ForeignKey | No | `accounts_user` |
| `organization` | ForeignKey | No | `organisations_organisation` |
| `project` | ForeignKey | Yes | `projects_project` |
| `metadata` | JSONField | No | - |
| `timestamp` | DateTimeField | No | - |
| `idempotency_key` | CharField | Yes | - |
| `created_at` | DateTimeField | No | - |

#### Transaction
- Table: `transactions_transaction`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | UUIDField | No | - |
| `amount` | DecimalField | No | - |
| `organization` | ForeignKey | No | `organisations_organisation` |
| `wallet_scope` | CharField | No | - |
| `project` | ForeignKey | Yes | `projects_project` |
| `charged_user` | ForeignKey | Yes | `accounts_user` |
| `source_type` | CharField | No | - |
| `usage_event` | ForeignKey | Yes | `transactions_usageevent` |
| `external_reference_id` | CharField | Yes | - |
| `timestamp` | DateTimeField | No | - |
| `created_by` | ForeignKey | No | `accounts_user` |
| `idempotency_key` | CharField | No | - |
| `notes` | TextField | No | - |
| `created_at` | DateTimeField | No | - |

#### BalancePolicy
- Table: `transactions_balancepolicy`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | UUIDField | No | - |
| `organization` | ForeignKey | No | `organisations_organisation` |
| `project` | ForeignKey | Yes | `projects_project` |
| `allow_negative` | BooleanField | No | - |
| `warn_threshold` | DecimalField | Yes | - |
| `enforcement_mode` | CharField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |

### settings

#### FeatureFlag
- Table: `settings_feature_flag`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | UUIDField | No | - |
| `key` | CharField | No | - |
| `enabled` | BooleanField | No | - |
| `description` | TextField | No | - |
| `scope_type` | CharField | No | - |
| `user` | ForeignKey | Yes | `accounts_user` |
| `organisation` | ForeignKey | Yes | `organisations_organisation` |
| `project` | ForeignKey | Yes | `projects_project` |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |
| `created_by` | ForeignKey | Yes | `accounts_user` |
| `updated_by` | ForeignKey | Yes | `accounts_user` |

#### Setting
- Table: `settings_setting`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | UUIDField | No | - |
| `key` | CharField | No | - |
| `value` | JSONField | No | - |
| `value_type` | CharField | No | - |
| `default_value` | JSONField | No | - |
| `description` | TextField | No | - |
| `scope_type` | CharField | No | - |
| `user` | ForeignKey | Yes | `accounts_user` |
| `organisation` | ForeignKey | Yes | `organisations_organisation` |
| `project` | ForeignKey | Yes | `projects_project` |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |
| `created_by` | ForeignKey | Yes | `accounts_user` |
| `updated_by` | ForeignKey | Yes | `accounts_user` |

### sport_configuration

#### Sport
- Table: `sport_configuration_sport`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `organisations` | ForeignKey | Yes | `organisations_organisation` |
| `projects` | ForeignKey | Yes | `projects_project` |
| `periods` | ForeignKey | Yes | `activities_period` |
| `content_templates` | ForeignKey | Yes | `content_generation_contenttemplate` |
| `variants` | ForeignKey | Yes | `sport_configuration_sport` |
| `configuration` | OneToOneField | Yes | `sport_configuration_sportconfiguration` |
| `id` | BigAutoField | No | - |
| `name` | CharField | No | - |
| `slug` | SlugField | No | - |
| `parent_sport` | ForeignKey | Yes | `sport_configuration_sport` |
| `federation_metadata` | JSONField | No | - |
| `sport_icon` | CharField | No | - |
| `is_active` | BooleanField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |

#### SportConfiguration
- Table: `sport_configuration_sportconfiguration`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `formation_set` | ForeignKey | Yes | `sport_configuration_formation` |
| `id` | BigAutoField | No | - |
| `sport` | OneToOneField | No | `sport_configuration_sport` |
| `team_size_min` | PositiveIntegerField | No | - |
| `team_size_max` | PositiveIntegerField | No | - |
| `max_substitutes` | PositiveIntegerField | No | - |
| `positions` | JSONField | No | - |
| `formations` | JSONField | No | - |
| `outfit_types` | JSONField | No | - |
| `has_goalkeeper` | BooleanField | No | - |
| `pitch_type` | CharField | No | - |
| `has_corner_kicks` | BooleanField | No | - |
| `has_offside` | BooleanField | No | - |
| `match_duration_minutes` | PositiveIntegerField | No | - |
| `metadata` | JSONField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |

#### Formation
- Table: `sport_configuration_formation`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `content_templates` | ForeignKey | Yes | `content_generation_contenttemplate` |
| `id` | BigAutoField | No | - |
| `sport_config` | ForeignKey | No | `sport_configuration_sportconfiguration` |
| `code` | CharField | No | - |
| `name` | CharField | No | - |
| `positions` | JSONField | No | - |
| `description` | TextField | No | - |
| `is_default` | BooleanField | No | - |
| `is_active` | BooleanField | No | - |
| `display_order` | PositiveIntegerField | No | - |
| `metadata` | JSONField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |

#### OutfitConfiguration
- Table: `sport_configuration_outfitconfiguration`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | BigAutoField | No | - |
| `project` | ForeignKey | No | `projects_project` |
| `outfit_type` | CharField | No | - |
| `colors` | JSONField | No | - |
| `sponsor_config` | JSONField | No | - |
| `number_font` | JSONField | No | - |
| `badge_position` | CharField | No | - |
| `metadata` | JSONField | No | - |
| `is_active` | BooleanField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |

### workflows

#### TransitionHistory
- Table: `transition_history`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | BigAutoField | No | - |
| `instance` | ForeignKey | No | `workflow_instances` |
| `from_state` | CharField | No | - |
| `to_state` | CharField | No | - |
| `action` | CharField | No | - |
| `actor` | ForeignKey | Yes | `accounts_user` |
| `comment` | TextField | No | - |
| `task_id` | UUIDField | Yes | - |
| `context_snapshot` | JSONField | No | - |
| `created_at` | DateTimeField | No | - |

#### WorkflowInstance
- Table: `workflow_instances`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `history` | ForeignKey | Yes | `transition_history` |
| `video_jobs` | ForeignKey | Yes | `video_jobs` |
| `id` | BigAutoField | No | - |
| `workflow` | ForeignKey | No | `workflow_templates` |
| `workflow_snapshot` | JSONField | No | - |
| `project` | ForeignKey | No | `projects_project` |
| `content_type` | ForeignKey | No | `django_content_type` |
| `object_id` | CharField | No | - |
| `current_state` | CharField | No | - |
| `context` | JSONField | No | - |
| `version` | IntegerField | No | - |
| `created_by` | ForeignKey | Yes | `accounts_user` |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |
| `content_object` | GenericForeignKey | No | - |

#### ProjectPermissionOverride
- Table: `project_permission_overrides`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | BigAutoField | No | - |
| `project` | ForeignKey | No | `projects_project` |
| `workflow` | ForeignKey | No | `workflow_templates` |
| `action_name` | CharField | No | - |
| `required_roles` | JSONField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |

#### WorkflowTemplate
- Table: `workflow_templates`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `instances` | ForeignKey | Yes | `workflow_instances` |
| `permission_overrides` | ForeignKey | Yes | `project_permission_overrides` |
| `id` | BigAutoField | No | - |
| `name` | CharField | No | - |
| `description` | TextField | No | - |
| `version` | CharField | No | - |
| `definition` | JSONField | No | - |
| `is_active` | BooleanField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |

### notifications

#### DeliveryAttempt
- Table: `notifications_delivery_attempt`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | BigAutoField | No | - |
| `notification` | ForeignKey | No | `notifications_notification` |
| `attempt_number` | PositiveIntegerField | No | - |
| `attempted_at` | DateTimeField | No | - |
| `outcome` | CharField | No | - |
| `error_message` | TextField | Yes | - |
| `http_status_code` | PositiveIntegerField | Yes | - |
| `smtp_response_code` | PositiveIntegerField | Yes | - |
| `response_body_snippet` | TextField | Yes | - |
| `duration_ms` | PositiveIntegerField | Yes | - |

#### Notification
- Table: `notifications_notification`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `delivery_attempts` | ForeignKey | Yes | `notifications_delivery_attempt` |
| `id` | UUIDField | No | - |
| `type` | ForeignKey | No | `notifications_notification_type` |
| `channel` | CharField | No | - |
| `recipient` | CharField | No | - |
| `recipient_user` | ForeignKey | Yes | `accounts_user` |
| `payload` | JSONField | No | - |
| `metadata` | JSONField | No | - |
| `status` | CharField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |
| `read_at` | DateTimeField | Yes | - |

#### NotificationType
- Table: `notifications_notification_type`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `notifications` | ForeignKey | Yes | `notifications_notification` |
| `id` | BigAutoField | No | - |
| `code` | SlugField | No | - |
| `name` | CharField | No | - |
| `description` | TextField | Yes | - |
| `default_channel` | CharField | No | - |
| `retry_policy` | ForeignKey | No | `notifications_retry_policy` |
| `is_active` | BooleanField | No | - |
| `created_at` | DateTimeField | No | - |

#### RetryPolicy
- Table: `notifications_retry_policy`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `notification_types` | ForeignKey | Yes | `notifications_notification_type` |
| `id` | BigAutoField | No | - |
| `name` | CharField | No | - |
| `max_attempts` | PositiveIntegerField | No | - |
| `retry_window_seconds` | PositiveIntegerField | No | - |
| `backoff_strategy` | CharField | No | - |
| `backoff_multiplier` | FloatField | No | - |
| `initial_delay_seconds` | PositiveIntegerField | No | - |
| `created_at` | DateTimeField | No | - |

### contextual_notifications

#### NotificationPreference
- Table: `contextual_notifications_notificationpreference`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | BigAutoField | No | - |
| `user` | ForeignKey | No | `accounts_user` |
| `event_type` | CharField | No | - |
| `channel` | CharField | No | - |
| `enabled` | BooleanField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |

#### OrganisationNotificationPolicy
- Table: `contextual_notifications_organisationnotificationpolicy`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | BigAutoField | No | - |
| `organisation` | OneToOneField | No | `organisations_organisation` |
| `policy_type` | CharField | No | - |
| `quiet_hours_enabled` | BooleanField | No | - |
| `quiet_hours_start` | TimeField | Yes | - |
| `quiet_hours_end` | TimeField | Yes | - |
| `quiet_hours_timezone` | CharField | No | - |
| `quiet_hours_rate_limit` | IntegerField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |

#### RoutingRule
- Table: `contextual_notifications_routingrule`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | BigAutoField | No | - |
| `event_type` | CharField | No | - |
| `scope` | CharField | No | - |
| `organisation` | ForeignKey | Yes | `organisations_organisation` |
| `project` | ForeignKey | Yes | `projects_project` |
| `target_role` | CharField | Yes | - |
| `priority` | IntegerField | No | - |
| `channel` | CharField | No | - |
| `is_enabled` | BooleanField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |
| `created_by` | ForeignKey | Yes | `accounts_user` |

### audit

#### AuditEvent
- Table: `audit_events`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | BigAutoField | No | - |
| `created_at` | DateTimeField | No | - |
| `event_type` | CharField | No | - |
| `user` | ForeignKey | Yes | `accounts_user` |
| `organization` | ForeignKey | Yes | `organisations_organisation` |
| `project` | ForeignKey | Yes | `projects_project` |
| `metadata` | JSONField | No | - |

### navigation

#### UserRecent
- Table: `navigation_userrecent`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | BigAutoField | No | - |
| `user` | ForeignKey | No | `accounts_user` |
| `content_type` | ForeignKey | Yes | `django_content_type` |
| `object_id` | CharField | Yes | - |
| `label` | CharField | No | - |
| `path` | CharField | No | - |
| `context` | JSONField | No | - |
| `last_seen_at` | DateTimeField | No | - |
| `content_object` | GenericForeignKey | No | - |

#### UserFavorite
- Table: `navigation_userfavorite`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | BigAutoField | No | - |
| `user` | ForeignKey | No | `accounts_user` |
| `content_type` | ForeignKey | Yes | `django_content_type` |
| `object_id` | CharField | Yes | - |
| `label` | CharField | No | - |
| `path` | CharField | No | - |
| `context` | JSONField | No | - |
| `created_at` | DateTimeField | No | - |
| `order` | PositiveIntegerField | No | - |
| `content_object` | GenericForeignKey | No | - |

### observability

#### SystemMetric
- Table: `observability_systemmetric`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | UUIDField | No | - |
| `timestamp` | DateTimeField | No | - |
| `metric_type` | CharField | No | - |
| `value` | FloatField | No | - |
| `metadata` | JSONField | No | - |

### rtc_websockets

#### WebSocketConnection
- Table: `realtime_websocket_connection`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `connection_id` | UUIDField | No | - |
| `user` | ForeignKey | No | `accounts_user` |
| `channel_name` | CharField | No | - |
| `authenticated_at` | DateTimeField | No | - |
| `last_heartbeat` | DateTimeField | No | - |
| `message_count` | PositiveIntegerField | No | - |
| `auth_method` | CharField | No | - |
| `client_info` | JSONField | No | - |
| `created_at` | DateTimeField | No | - |
| `updated_at` | DateTimeField | No | - |

#### RealtimeMessage
- Table: `realtime_message`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `message_id` | UUIDField | No | - |
| `message_type` | CharField | No | - |
| `scope_type` | CharField | No | - |
| `scope_id` | UUIDField | No | - |
| `sender_user` | ForeignKey | No | `accounts_user` |
| `content` | JSONField | No | - |
| `created_at` | DateTimeField | No | - |
| `delivered_at` | DateTimeField | Yes | - |
| `retry_count` | PositiveSmallIntegerField | No | - |

#### PresenceStatus
- Table: `realtime_presence_status`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | BigAutoField | No | - |
| `user` | ForeignKey | No | `accounts_user` |
| `status` | CharField | No | - |
| `last_seen` | DateTimeField | No | - |
| `current_location` | CharField | Yes | - |
| `organization_id` | UUIDField | No | - |
| `project_id` | UUIDField | Yes | - |
| `updated_at` | DateTimeField | No | - |

#### ActivityEvent
- Table: `realtime_activity_event`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `event_id` | UUIDField | No | - |
| `actor_user` | ForeignKey | No | `accounts_user` |
| `action_type` | CharField | No | - |
| `resource_type` | CharField | No | - |
| `resource_id` | UUIDField | No | - |
| `organization_id` | UUIDField | No | - |
| `project_id` | UUIDField | Yes | - |
| `occurred_at` | DateTimeField | No | - |
| `metadata` | JSONField | No | - |

### i18n_preferences

### constitution_engine

### security_baseline

### search

#### SearchEntry
- Table: `search_searchentry`

| Field | Type | Nullable | FK Target |
|-------|------|----------|-----------|
| `id` | UUIDField | No | - |
| `content_type` | ForeignKey | No | `django_content_type` |
| `object_id` | CharField | No | - |
| `search_vector` | SearchVectorField | No | - |
| `body_text` | TextField | No | - |
| `title` | CharField | No | - |
| `description` | TextField | No | - |
| `image_url` | CharField | Yes | - |
| `url` | CharField | No | - |
| `language` | CharField | No | - |
| `last_updated` | DateTimeField | No | - |
| `content_object` | GenericForeignKey | No | - |

### scaffolding

### tasks
