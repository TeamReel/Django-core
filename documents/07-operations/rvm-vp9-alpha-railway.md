# RVM (Robust Video Matting) op Railway: VP9 alpha werkt niet (WebM wordt opaque)

**Status (2026-02-17)**: RVM draait en produceert correct een alpha-video als **ProRes MOV**, maar **VP9 WebM met alpha faalt op Railway**.
De fallback (MOV + browser-preview MP4) houdt de UX werkend, maar het “ideale” formaat (transparante WebM) blijft geblokkeerd.

---

## TL;DR

- De RVM pipeline schrijft frames als **RGBA** naar FFmpeg.
- Op Railway encodeert FFmpeg met `libvpx-vp9` **altijd** naar `pix_fmt=yuv420p` (opaque), zelfs met `-pix_fmt yuva420p`.
- De **preflight** check detecteert dit en faalt bewust: een opaque WebM is onbruikbaar voor overlay/compositing.
- **GPL vs LGPL** FFmpeg build switch heeft dit niet opgelost.

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

## Huidige “werkende” fallback flow

- VP9-alpha preflight faalt → fallback naar MOV (ProRes w/ alpha)
- extra stap: transcode MOV → MP4 preview (H.264, geen alpha)
- metadata:
  - `processed` → MP4 preview (voor UI playback)
  - `processed_source` → MOV (voor eventuele compositing/backoffice)

Dit houdt de demo/UX bruikbaar, maar is niet het einddoel.

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

## Aanbevolen next steps

1) **Optie A uitvoeren**: test distro FFmpeg op Railway (snelle bevestiging of het build-related is).
2) Als dat faalt: **Optie B** (custom compile) plannen.
3) Ondertussen: fallback (MOV + MP4 preview) houden als safety net.

---

## Appendix: relevante codepaden

- RVM processor (preflight + encode): `src/video/services/rvm_processor.py`
- Asset processor (fallback + preview): `src/video/services/asset_processor.py`
- Metadata mapping voor frontend URLs: `src/video/views/job.py`
- Frontend URL keuze: `demo/src/constants/assetProcessingSpecs.ts` (functie `getBestUrl`)
