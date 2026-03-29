# Q032 — Presigned URLs Ownership Check

| | |
|---|---|
| Status | 📋 TODO |
| Bron | Code Review |
| Impact | 🔴 critical |
| Effort | ~2 uur |

## Wat
Het `presigned-urls` endpoint in `src/files/views.py` valideert niet of de gebruiker eigenaar is van de gevraagde bestanden. Elke ingelogde gebruiker kan presigned S3 URLs opvragen voor willekeurige storage paths — inclusief bestanden van andere organisaties.

## Checklist
- [ ] Voeg ownership check toe: controleer of gevraagde paths horen bij de organisatie van de gebruiker
- [ ] Valideer dat de paths matchen met bestaande FileAsset records
- [ ] Tests: poging om bestanden van andere org te bereiken moet geblokkeerd worden
- [ ] Verify
