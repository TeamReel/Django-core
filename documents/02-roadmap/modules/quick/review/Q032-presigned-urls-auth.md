# Q032 — Presigned URLs Ownership Check

| | |
|---|---|
| Status | � REVIEW |
| Bron | Code Review |
| Impact | 🔴 critical |
| Effort | ~2 uur |

## Wat
Het `presigned-urls` endpoint in `src/files/views.py` valideert niet of de gebruiker eigenaar is van de gevraagde bestanden. Elke ingelogde gebruiker kan presigned S3 URLs opvragen voor willekeurige storage paths — inclusief bestanden van andere organisaties.

## Checklist
- [x] Voeg ownership check toe: controleer of gevraagde paths horen bij de organisatie van de gebruiker
- [x] Valideer dat de paths matchen met bestaande FileAsset records
- [x] Frontend: pass X-Organization-ID header bij alle presigned-urls calls
- [x] Tests: poging om bestanden van andere org te bereiken moet geblokkeerd worden
- [x] Verify
