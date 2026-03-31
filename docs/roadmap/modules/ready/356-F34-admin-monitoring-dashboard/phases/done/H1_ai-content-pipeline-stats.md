# H1 — AI & Content Pipeline Stats

> **Effort:** ~3 uur | **Impact:** Overzicht van alle AI flows, content productie en video processing

## Context

Breid het dashboard uit met secties voor AI generatie, content productie, en video processing. Geeft de product owner inzicht in welke flows actief zijn en wat hun status is.

## To do

- [ ] `DashboardStatsService.get_ai_stats()` retourneert:
  - **Generation Requests** per status: `pending`, `processing`, `completed`, `failed`, `cancelled`
  - **Generation Requests** per provider breakdown (uit `pipeline_config` of template type)
  - **Totaal** gegenereerde outputs (GenerationOutput count)
  - **Gemiddelde** processing tijd (completed requests)
- [ ] `DashboardStatsService.get_content_stats()` retourneert:
  - **Content Items** per status: `queued`, `generating`, `completed`, `failed`, `approved`, `rejected`, `revision_requested`
  - **Content Templates** count (actief vs inactief)
  - **Approval rate**: `approved / (approved + rejected)` percentage
  - **Pending approvals** count
- [ ] `DashboardStatsService.get_video_stats()` retourneert:
  - **Video Jobs** per status: `pending`, `processing`, `completed`, `failed`
  - **Video Jobs** per type: `transcode`, `thumbnail`, `compose`, `lineup`, `match_intro`, `goal_celebration`, `then_vs_now`
  - **Stale jobs** count (processing > 30 min)
  - **Member asset processing** count (in-progress)
- [ ] Template uitbreiden met 3 nieuwe secties:
  - "AI Generation" — tabel met status counts + provider breakdown
  - "Content Production" — tabel met status counts + approval rate indicator
  - "Video Processing" — tabel met type × status matrix + stale job warning
- [ ] Alle queries via `.values().annotate(Count)` — geen N+1
- [ ] Cache per sectie (aparte keys: `dashboard:ai_stats`, `dashboard:content_stats`, `dashboard:video_stats`)
- [ ] Tests: `tests/dashboard/test_stats_service.py`
  - `test_ai_stats_groups_by_status`
  - `test_content_stats_approval_rate`
  - `test_video_stats_stale_jobs`
  - `test_video_stats_type_breakdown`

## Done criteria

- [ ] Dashboard toont 3 nieuwe secties met live data
- [ ] Geen N+1 queries (alle aggregaties via annotate)
- [ ] Stale video jobs gemarkeerd met warning indicator
- [ ] 4+ tests passing
