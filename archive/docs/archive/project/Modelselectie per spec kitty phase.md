# AI Model Selection Overview (Spec Kitty Workflow)

| Spec Kitty Phase        | Doel van de fase                   | Aanbevolen model | Alternatief | Notities |
|-------------------------|-------------------------------------|------------------|-------------|----------|
| **constitution**        | Principes & grondregels opstellen   | GPT-5.1          | Claude Sonnet 4 | Zware reasoning, lange context |
| **specify**             | WHAT definiëren                     | GPT-5.1          | Claude Sonnet 4 | Functionele duidelijkheid |
| **plan**                | HOW architectuur uitwerken          | GPT-5.1          | Claude Sonnet 4 | Veel technische reasoning |
| **research**            | Opties en best practices onderzoeken| GPT-5.1          | Claude Sonnet 4 | Context + analyse |
| **analyze**             | Inconsistenties opsporen            | GPT-5.1          | — | Logische checks |
| **clarify**             | Vragen aanscherpen                  | GPT-5.1          | — | Korte reasoning |
| **tasks**               | Werkpakketten + taken maken         | GPT-5.1          | Claude Sonnet 4 | Structureren + dependencies |
| **implement**           | Code genereren / refactoren         | **GitHub Copilot (Agent Mode)** | — | *Altijd* een coding agent |
| **review**              | Code review en kwaliteitstoets      | GPT-5.1          | Claude Sonnet 4 | Goede code-analyse nodig |
| **accept**              | Feature afronden                    | GPT-5.1          | — | Validatie tegen spec & plan |
| **merge**               | Samenvoegen in main                 | GPT-5.1          | — | Processtap, geen code |

---

## Korte samenvatting
- **GPT-5.1** → alles waar *denken, analyseren, structureren* centraal staat.
- **Claude Sonnet 4** → sterke reasoning-backup.
- **GitHub Copilot** → alles waar *code* centraal staat.
