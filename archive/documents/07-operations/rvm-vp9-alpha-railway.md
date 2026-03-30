# RVM (Robust Video Matting) op Railway: MOV als primary output

**Status (2026-02-17)**: RVM draait en produceert correct een alpha-video als **ProRes MOV**. VP9 WebM alpha werkt niet op Railway.
**Besluit**: We gebruiken nu **MOV direct** (geen VP9 preflight/fallback). Dit is robuuster en voorkomt onnodige overhead.

---

## TL;DR

- De RVM pipeline schrijft frames als **RGBA** naar FFmpeg.
- Output: **ProRes MOV** met alpha channel (yuva444p10le).
- Browser preview: **MP4** (H.264, opaque) voor UI playback.
- VP9 WebM alpha is **niet beschikbaar** op Railway (libvpx bug).
- **Processing tijd**: ~20-30 sec per frame op CPU (geen GPU). Acceptabel want eenmalig.
- **Downsample ratio**: 0.50 (was 0.40) voor ~25% snellere CPU processing.

---

## Wat is het probleem precies?

### Verwacht gedrag
We willen een browser-playable video met transparency:
- Container: WebM
- Codec: VP9 (`libvpx-vp9`)
- Pixel format: `yuva420p`
- Metadata: `alpha_mode=1`

### Observed gedrag op Railway (uit logs)
Tijdens preflight:
- encode command gebruikt `-c:v libvpx-vp9 -pix_fmt yuva420p -metadata:s:v:0 alpha_mode=1`
- `ffprobe` ziet uiteindelijk: `pix_fmt=yuv420p has_alpha=False`

Gevolg:
- De pipeline **valt terug naar MOV** (ProRes met alpha), want WebM is opaque.

---

## Waarom werkt RVM “nog niet” op Railway?

RVM zelf werkt (mask, frame count, output MOV klopt). De blocker is:

**De runtime FFmpeg/libvpx combinatie op Railway kan geen VP9 alpha stream produceren**.

Dat kan (meestal) maar één van deze oorzaken hebben:
1. **libvpx build/config** mist alpha support of heeft een regressie.
2. De FFmpeg build linkt wel `libvpx`, maar output negotiation dwingt naar `yuv420p`.
3. In de gebruikte build zit een bug waardoor alpha plane “stil” gedropt wordt bij VP9.

Belangrijk: `rc=0` bij encode betekent alleen dat encode “gelukt” is — niet dat alpha behouden is.

---

## Wat we al geprobeerd hebben (chronologisch)

### 1) MOV output validatie (12-bit pix_fmt)
- Probleem: ProRes outputs `yuva444p12le`, en die stond niet in de allowlist.
- Fix: add `yuva420p12le/yuva422p12le/yuva444p12le`.

### 2) Logging bug in asset processor
- Probleem: `logger.info(... %.3f ...)` kreeg string i.p.v. float.
- Fix: argumenten omgedraaid.

### 3) Browser playback: MOV is niet afspeelbaar
- Probleem: Chrome/Safari spelen ProRes MOV vaak niet af (0 sec / zwart / download-only).
- Fix: generate MP4 preview (H.264) bij MOV fallback.

### 4) Root-cause poging: andere FFmpeg build
- Probleem: BtbN build dropte alpha bij VP9.
- Actie: Dockerfile switch van LGPL → GPL build.
- Resultaat: nog steeds `pix_fmt=yuv420p` in preflight.

### 5) Frontend/metadata routing
- Probleem: frontend prefereerde `processed` URL; bij MOV fallback wees `processed` naar `.mov`.
- Fix: bij MOV fallback wordt `processed` overschreven naar de browser-playable MP4 preview;
  originele MOV blijft beschikbaar als `processed_source`.

### 6) Preview MP4 had soms “0 seconden”
- Observatie: logs lieten transcode in ~0.003s zien (onrealistisch), MP4 size ~531KB.
- Fix: force CFR timestamps + ffprobe-validatie; upload preview alleen als duration/frames OK zijn.

---

## Huidige productie flow

- **Direct naar MOV**: geen VP9 preflight, geen fallback logica
- **Transcode MOV → MP4** preview (H.264, geen alpha) voor browser playback
- **Downsample ratio**: 0.50 voor snellere CPU processing
- **Metadata**:
  - `processed` → MP4 preview (voor UI playback)
  - `processed_source` → MOV (voor lineup video compositing)

Dit is de **definitieve architectuur**:
- MOV met alpha voor server-side compositing (lineup video)
- MP4 voor browser preview in de UI
- VP9 WebM wordt niet meer geprobeerd

---

## Debug checklist (Railway)

Voer dit uit in de Railway container (shell) om te bewijzen wat FFmpeg kan:

1) Check encoders:
- `ffmpeg -hide_banner -encoders | grep -E "libvpx|vp9"`

2) Encoder help:
- `ffmpeg -hide_banner -h encoder=libvpx-vp9 | head -n 80`

3) Check pix_fmts support:
- `ffmpeg -hide_banner -pix_fmts | grep yuva420p`

4) Minimal alpha encode test (zonder RVM):
- Maak een 2s RGBA test:
  - `ffmpeg -hide_banner -y -f lavfi -i "color=c=black@0.0:s=128x128:d=2" -vf "format=rgba" -c:v libvpx-vp9 -pix_fmt yuva420p -metadata:s:v:0 alpha_mode=1 /tmp/alpha_test.webm`
- Probe:
  - `ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt:stream_tags=alpha_mode -of json /tmp/alpha_test.webm`

Expected:
- `pix_fmt` bevat `yuva...`
- tag `alpha_mode=1`

Observed (Railway):
- `pix_fmt=yuv420p` (opaque)

---

## Oplossingsopties (met trade-offs)

### Optie A — Gebruik distro FFmpeg (simpelste test)
**Wat**: installeer `ffmpeg` via `apt-get` en gebruik die in runtime.

**Waarom**: de distro build verschilt van static builds; soms werkt alpha daar wél.

**Pros**
- Snelste manier om te testen zonder custom compile.

**Cons**
- Andere codec-support kan verschillen; image size kan groeien.

**80/20 advies**: dit is de beste “volgende stap” om snel zekerheid te krijgen.

---

### Optie B — Compile FFmpeg + libvpx zelf in Docker (meest betrouwbaar)
**Wat**: bouw libvpx en ffmpeg vanuit source in de Dockerfile.

**Waarom**: volledige controle over libvpx flags en FFmpeg link.

**Pros**
- Hoogste kans op echte fix.

**Cons**
- Build wordt trager en complexer; onderhoudskosten omhoog.

---

### Optie C — Ander outputformaat voor transparency
**Wat**: als VP9 alpha onbetrouwbaar blijft:
- (C1) VP8 WebM met alpha proberen
- (C2) transparante image-sequence/animated WebP/APNG voor “short intro” (als dat past)

**Pros**
- Ontwijkt VP9 alpha issues.

**Cons**
- Browser support/perf/size kan slechter zijn.

---

### Optie D — Productkeuze: compositing server-side, UI alleen preview
**Wat**: beschouw MOV als canonical “processed” (met alpha) en gebruik MP4 alleen voor UI.

**Pros**
- Robuust; geen afhankelijkheid van browser alpha video.

**Cons**
- Transparantie in browser previews ontbreekt.

---

## Besluit & Architektuur (2026-02-17)

We hebben gekozen voor **Optie D**: MOV als canonical alpha-formaat, MP4 alleen voor UI preview.

### Waarom deze keuze?
1. **Robuust**: MOV/ProRes werkt betrouwbaar, geen afhankelijkheid van libvpx alpha bugs
2. **Eenmalig**: processing duurt lang (~30 min per video op CPU) maar is eenmalig
3. **Herbruikbaar**: processed intro kan daarna onbeperkt hergebruikt worden in lineup videos
4. **Geen browser-afhankelijkheid**: compositing gebeurt server-side, niet in browser

### Performance tuning
- **Downsample ratio 0.50** (was 0.40): ~25% snellere inference met minimaal kwaliteitsverlies
- **CPU-only**: ~20-30 sec per frame. GPU zou 100x sneller zijn maar is niet nodig voor eenmalige processing.

### Toekomstige optimalisaties (optioneel)
- **GPU worker**: RunPod/Modal voor ~€50/maand zou processing van 30 min → 30 sec brengen
- **Edge case**: als batch processing van 50+ video's nodig is, overweeg GPU

---

## Appendix: historische context (VP9 alpha pogingen)

De volgende opties werden onderzocht maar niet geïmplementeerd:

### Optie A — Distro FFmpeg
Niet getest; zou waarschijnlijk ook falen door dezelfde libvpx issue.

### Optie B — Custom FFmpeg compile
Te complex voor een probleem dat MOV al oplost.

### Optie C — VP8 WebM / animated WebP
Niet getest; browser support issues verwacht.

---

## Appendix: relevante codepaden

- RVM processor (preflight + encode): `src/video/services/rvm_processor.py`
- Asset processor (fallback + preview): `src/video/services/asset_processor.py`
- Metadata mapping voor frontend URLs: `src/video/views/job.py`
- Frontend URL keuze: `demo/src/constants/assetProcessingSpecs.ts` (functie `getBestUrl`)
