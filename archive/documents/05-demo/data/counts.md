# Database Model Counts

> Auto-generated: 2026-03-12 11:20:46

**Database**: postgresql (switchback.proxy.rlwy.net)

| App | Model | Count | Status |
|-----|-------|-------|--------|
| organisations | Organisation | 8 | 🟢 OK |
| organisations | Membership | 2834 | 🟢 OK |
| projects | Project | 358 | 🟢 OK |
| projects | ProjectMembership | 3552 | 🟢 OK |
| projects | ProjectInvite | 0 | 🔴 EMPTY |
| projects | ProjectMembershipPromotion | 11 | 🟢 OK |
| projects | ProjectFunctionalRoleAssignment | 1 | 🟡 THIN |
| activities | Period | 682 | 🟢 OK |
| activities | Activity | 871 | 🟢 OK |
| activities | Participation | 1960 | 🟢 OK |
| activities | ActivityEvent | 201 | 🟢 OK |
| accounts | User | 3327 | 🟢 OK |
| accounts | UserActiveContext | 54 | 🟢 OK |
| permissions | Permission | 23 | 🟢 OK |
| permissions | Role | 5 | 🟢 OK |
| permissions | RoleAssignment | 3986 | 🟢 OK |
| content_generation | ContentTemplate | 323 | 🟢 OK |
| content_generation | ContentItem | 0 | 🔴 EMPTY |
| content_generation | ContentApproval | 0 | 🔴 EMPTY |
| medialib | MediaItem | 128 | 🟢 OK |
| medialib | MediaTag | 78 | 🟢 OK |
| medialib | Collection | 0 | 🔴 EMPTY |
| medialib | CollectionMembership | 0 | 🔴 EMPTY |
| medialib | MediaItemRelation | 0 | 🔴 EMPTY |
| medialib | MediaThumbnail | 0 | 🔴 EMPTY |
| files | FileAsset | 1290 | 🟢 OK |
| branding | BrandProfile | 191 | 🟢 OK |
| branding | DesignToken | 705 | 🟢 OK |
| branding | BrandAsset | 231 | 🟢 OK |
| generative | GenerationTemplate | 90 | 🟢 OK |
| generative | GenerationRequest | 0 | 🔴 EMPTY |
| generative | GenerationOutput | 0 | 🔴 EMPTY |
| generative | GenerationJob | 323 | 🟢 OK |
| video | VideoJob | 291 | 🟢 OK |
| video | VideoOverlay | 0 | 🔴 EMPTY |
| video | PlatformExport | 7 | 🟢 OK |
| video | VideoPreset | 6 | 🟢 OK |
| credits | CreditsBalance | 1 | 🟡 THIN |
| credits | ProjectCreditsBalance | 94 | 🟢 OK |
| credits | UserCreditsBalance | 3 | 🟢 OK |
| transactions | UsageEvent | 43 | 🟢 OK |
| transactions | Transaction | 74 | 🟢 OK |
| transactions | BalancePolicy | 8 | 🟢 OK |
| settings | FeatureFlag | 409 | 🟢 OK |
| settings | Setting | 68 | 🟢 OK |
| sport_configuration | Sport | 15 | 🟢 OK |
| sport_configuration | SportConfiguration | 9 | 🟢 OK |
| sport_configuration | Formation | 6 | 🟢 OK |
| sport_configuration | OutfitConfiguration | 9 | 🟢 OK |
| workflows | TransitionHistory | 10 | 🟢 OK |
| workflows | WorkflowInstance | 28 | 🟢 OK |
| workflows | ProjectPermissionOverride | 0 | 🔴 EMPTY |
| workflows | WorkflowTemplate | 4 | 🟢 OK |
| notifications | DeliveryAttempt | 0 | 🔴 EMPTY |
| notifications | Notification | 53379 | 🟢 OK |
| notifications | NotificationType | 2 | 🟡 THIN |
| notifications | RetryPolicy | 1 | 🟡 THIN |
| contextual_notifications | NotificationPreference | 3 | 🟢 OK |
| contextual_notifications | OrganisationNotificationPolicy | 8 | 🟢 OK |
| contextual_notifications | RoutingRule | 8 | 🟢 OK |
| audit | AuditEvent | 12674 | 🟢 OK |
| navigation | UserRecent | 0 | 🔴 EMPTY |
| navigation | UserFavorite | 0 | 🔴 EMPTY |
| observability | SystemMetric | 3392 | 🟢 OK |
| rtc_websockets | WebSocketConnection | 5 | 🟢 OK |
| rtc_websockets | RealtimeMessage | 0 | 🔴 EMPTY |
| rtc_websockets | PresenceStatus | 0 | 🔴 EMPTY |
| rtc_websockets | ActivityEvent | 0 | 🔴 EMPTY |
| search | SearchEntry | 9783 | 🟢 OK |

**Legend**: 🟢 OK (3+) | 🟡 THIN (1-2) | 🔴 EMPTY (0)
