# RVM Alpha Pipeline — MOV als Primary Output

**Last Updated:** 2026-02-23
**Status:** Live — MOV (ProRes) als canonical alpha-formaat, MP4 voor browser preview

---

## TL;DR

- RVM (Robust Video Matting) verwijdert de achtergrond van intro-video's
- Output: **ProRes MOV** met alpha channel — voor server-side compositie (lineup video's)
- Preview: **MP4** (H.264, geen alpha) — voor browser playback in de UI
- VP9 WebM alpha werkt **niet** op Railway (libvpx bug)
- Processing: ~20-30 sec per frame op CPU, eenmalig per intro video
- Draait op de **video-worker** (queue: `video_slow`, concurrency=1)

---

## Architectuur

```
Gebruiker uploadt intro video (MP4)
        │
        ▼
POST /api/v1/video/jobs/{id}/process-asset/
        │
        ▼
Celery task: process_member_asset (video_slow queue)
        │
        ├── 1. Download originele video van S3
        ├── 2. RVM inference: genereer alpha mask per frame
        ├── 3. FFmpeg: combineer frames → ProRes MOV (yuva444p10le)
        ├── 4. FFmpeg: transcode MOV → MP4 preview (H.264, opaque)
        ├── 5. Upload MOV + MP4 naar S3
        └── 6. Update membership.metadata.teamreel_assets
                ├── processed        → MP4 preview URL (voor UI)
                └── processed_source → MOV URL (voor compositie)
```

---

## Waarom MOV en niet WebM?

### Het VP9 probleem op Railway

We wilden oorspronkelijk VP9 WebM met alpha (`yuva420p`, `alpha_mode=1`). Maar:

- Railway's FFmpeg/libvpx combinatie produceert altijd `yuv420p` (opaque)
- Alpha plane wordt stilzwijgend gedropt
- `rc=0` bij encode → lijkt gelukt, maar alpha is weg
- Meerdere FFmpeg builds geprobeerd (BtbN LGPL + GPL) → zelfde resultaat

### Besluit: Optie D

| Optie | Beschrijving | Gekozen? |
|-------|-------------|----------|
| A. Distro FFmpeg | `apt-get install ffmpeg` | Nee — waarschijnlijk zelfde bug |
| B. Custom compile | FFmpeg + libvpx from source | Nee — te complex |
| C. VP8/WebP | Ander alpha format | Nee — browser support issues |
| **D. MOV + MP4** | **Server-side compositie met MOV, MP4 voor preview** | **Ja** |

**Waarom D wint:**
1. Robuust — ProRes MOV alpha werkt altijd betrouwbaar
2. Eenmalig — processing is langzaam maar hoeft maar 1× per intro
3. Herbruikbaar — processed intro wordt onbeperkt hergebruikt in lineup video's
4. Geen browser-afhankelijkheid — compositie is server-side

---

## Performance

| Metric | Waarde |
|--------|--------|
| Downsample ratio | 0.50 (was 0.40, ~25% sneller) |
| Processing per frame | ~20-30 sec (CPU, geen GPU) |
| Typische video (5 sec, 30fps) | ~30 minuten processing |
| Output MOV size | 50-200 MB (ProRes, hoge kwaliteit) |
| Output MP4 size | 1-5 MB (H.264, compressed) |

### Toekomstige optimalisaties

- **GPU worker** (RunPod/Modal): ~€50/maand → processing van 30 min → 30 sec
- Pas overwegen als batch processing van 50+ video's nodig is

---

## Metadata na processing

In `membership.metadata.teamreel_assets`:

```json
{
  "videos": {
    "intro": {
      "home_hands_behind_back": {
        "raw": "https://s3.../original-upload.mp4",
        "processed": "https://s3.../preview.mp4",
        "processed_source": "https://s3.../alpha.mov",
        "processing_state": "completed"
      }
    }
  }
}
```

| Veld | Format | Gebruik |
|------|--------|---------|
| `raw` | MP4 | Originele upload |
| `processed` | MP4 | Browser preview (UI) |
| `processed_source` | MOV (ProRes) | Server-side compositie (lineup video) |

---

## Code paden

| Bestand | Functie |
|---------|---------|
| `src/video/services/rvm_processor.py` | RVM inference + MOV encode |
| `src/video/tasks/asset_processing.py` | Celery task (`process_member_asset`) |
| `src/video/views/job.py` | API endpoints (process-asset, cancel) |
| `demo/src/constants/assetProcessingSpecs.ts` | Frontend URL logica (`getBestUrl`, `getFFmpegBestUrl`) |

---

## Fallback logica

Als RVM faalt of niet beschikbaar is:

1. **Preflight check**: valideert of FFmpeg alpha output correct is
2. **Fallback naar MOV**: als VP9 alpha niet werkt (altijd op Railway)
3. **MP4 preview**: altijd gegenereerd, ook bij MOV output
4. **Asset types met RVM**: `intro`, `celebration`, `then_vs_now`

---

## Gerelateerde documentatie

- [Railway Services](../infrastructure/railway-services.md) — Worker setup en queue routing
- [Media Architecture](media-architecture.md) — 4-laags media opslag model
- [Lineup Architecture](lineup-architecture.md) — Hoe processed intro's in lineup video's landen
