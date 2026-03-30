# Q046 - Path Traversal beveiliging in presigned URLs

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Code Review Q032 |
| Impact | 🟡 important |
| Effort | ~1 uur |

## Wat
In `src/files/views.py` (`presigned-urls` endpoint, toegevoegd in Q032) wordt gecontroleerd via `path.startswith(prefix)` of een gebruiker toegang heeft tot een bepaalde structural map, zoals `uploads/{org_id}/`.
Door het gebruik van `../` in een aangevraagd pad (zoals: `uploads/{mijn_org_id}/../../uploads/{andere_org}/geheim.jpg`) zal `startswith` slagen (True), maar de resulterende URL kan door clients (browsers of lokale Nginx-servers) genormaliseerd worden om bij bestanden van een andere organisatie te komen.
Voor S3 (productie) is dit niet kwetsbaar (bij gebrek aan hiërarchische mappen), maar het is wel een fout in de backend access-controlelaag. Nginx of `LocalStorageBackend` kan hierdoor onterecht door de API goedgekeurd worden.

## Checklist
- [x] In `src/files/views.py`, sta geen `../` of `..` toe in file paths voor presigned urls, of gebruik `os.path.normpath()` vóór de `startswith()` check.
- [x] Beveilig `members/{uuid}/` tegen soortgelijke ongevalideerde string manipulaties.
- [x] Schrijf een test (bijv. in `tests/files/test_presigned_urls.py`) om deze specifieke path traversal-aanval te verifiëren.
