# ChatGPT Prompt: Internationale Spelers CSV

## Opdracht voor ChatGPT

Maak een CSV bestand met **echte spelers** van topclubs uit de volgende competities voor seizoen 2024/25:

### Competities & Clubs

**Premier League (Engeland)** - 6 clubs:
- Manchester City
- Arsenal
- Liverpool
- Manchester United
- Chelsea
- Tottenham Hotspur

**La Liga (Spanje)** - 6 clubs:
- Real Madrid
- FC Barcelona
- Atlético Madrid
- Athletic Bilbao
- Real Sociedad
- Real Betis

**Bundesliga (Duitsland)** - 6 clubs:
- Bayern München
- Borussia Dortmund
- RB Leipzig
- Bayer Leverkusen
- Eintracht Frankfurt
- VfB Stuttgart

**Serie A (Italië)** - 6 clubs:
- Inter Milan
- AC Milan
- Juventus
- Napoli
- AS Roma
- Atalanta

**Ligue 1 (Frankrijk)** - 6 clubs:
- Paris Saint-Germain
- AS Monaco
- Olympique Marseille
- Lille OSC
- OGC Nice
- Olympique Lyon

### CSV Formaat

```csv
federation,club,team_type,first_name,last_name,nationality,birth_date,position,shirt_number
FA,Manchester City,First Team,Ederson,Moraes,BRA,1993-08-17,Keeper,31
FA,Manchester City,First Team,Kyle,Walker,ENG,1990-05-28,Verdediger,2
FA,Manchester City,First Team,Erling,Haaland,NOR,2000-07-21,Aanvaller,9
...
```

### Velden

1. **federation**: FA (Engeland), RFEF (Spanje), DFB (Duitsland), FIGC (Italië), FFF (Frankrijk)
2. **club**: Exacte clubnaam zoals hierboven
3. **team_type**: "First Team" (Engels), "Primer Equipo" (Spaans), "Erste Mannschaft" (Duits), "Prima Squadra" (Italiaans), "Équipe Première" (Frans)
4. **first_name**: Voornaam speler
5. **last_name**: Achternaam speler
6. **nationality**: ISO 3-letter code (BRA, ENG, ARG, FRA, etc.)
7. **birth_date**: YYYY-MM-DD formaat
8. **position**: Keeper, Verdediger, Middenvelder, Aanvaller (Nederlands houden)
9. **shirt_number**: Actueel rugnummer (1-99)

### Spelers per Club

**15 spelers per club** met realistische verdeling:
- 2 Keepers (meestal #1 en #13, #22, of #31)
- 5 Verdedigers (mix van backs en centrale verdedigers)
- 5 Middenvelders (mix van defensief, centraal, aanvallend)
- 3 Aanvallers (mix van spitsen en vleugelspelers)

### Belangrijke Eisen

1. **Echte namen** van actuele spelers (seizoen 2024/25)
2. **Correcte rugnummers** (controleer op transfermarkt.com of officiële sites)
3. **Actuele geboortedatums** en nationaliteiten
4. **Topspelers includeren**: Haaland, Mbappé, Vinicius Jr., Lewandowski, etc.
5. **Mix van nationaliteiten** (realistische internationale samenstelling)

### Output

Lever 5 aparte CSV bestanden:
1. `players_premier_league_2024_25.csv` (90 spelers)
2. `players_la_liga_2024_25.csv` (90 spelers)
3. `players_bundesliga_2024_25.csv` (90 spelers)
4. `players_serie_a_2024_25.csv` (90 spelers)
5. `players_ligue_1_2024_25.csv` (90 spelers)

**Totaal: 450 internationale topspelers**

### Voorbeeld Structuur (Premier League)

```csv
federation,club,team_type,first_name,last_name,nationality,birth_date,position,shirt_number
FA,Manchester City,First Team,Ederson,Moraes,BRA,1993-08-17,Keeper,31
FA,Manchester City,First Team,Stefan,Ortega,GER,1992-11-06,Keeper,18
FA,Manchester City,First Team,Kyle,Walker,ENG,1990-05-28,Verdediger,2
FA,Manchester City,First Team,Rúben,Dias,POR,1997-05-14,Verdediger,3
FA,Manchester City,First Team,John,Stones,ENG,1994-05-28,Verdediger,5
FA,Manchester City,First Team,Nathan,Aké,NED,1995-02-18,Verdediger,6
FA,Manchester City,First Team,Joško,Gvardiol,CRO,2002-01-23,Verdediger,24
FA,Manchester City,First Team,Rodri,Hernández,ESP,1996-06-22,Middenvelder,16
FA,Manchester City,First Team,Kevin,De Bruyne,BEL,1991-06-28,Middenvelder,17
FA,Manchester City,First Team,Bernardo,Silva,POR,1994-08-10,Middenvelder,20
FA,Manchester City,First Team,Phil,Foden,ENG,2000-05-28,Middenvelder,47
FA,Manchester City,First Team,Jack,Grealish,ENG,1995-09-10,Middenvelder,10
FA,Manchester City,First Team,Erling,Haaland,NOR,2000-07-21,Aanvaller,9
FA,Manchester City,First Team,Julián,Álvarez,ARG,2000-01-31,Aanvaller,19
FA,Manchester City,First Team,Jérémy,Doku,BEL,2002-05-27,Aanvaller,11
```

Start met Premier League, dan La Liga, Bundesliga, Serie A, en Ligue 1.
