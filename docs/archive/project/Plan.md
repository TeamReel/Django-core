## Wat ik aan het bouwen ben

Ik wil jullie nog één keer wat uitgebreider meenemen in wat ik aan het bouwen ben, en meteen ook eerlijk zijn over waar ik zelf minder sterk in ben. Misschien gaan er bij jullie namelijk wél wat lampjes branden.

Stel je voor: in plaats van voor elke nieuwe app weer helemaal opnieuw te beginnen, heb je één stevige digitale basis die alles regelt wat elke serieuze bedrijfsapp nodig heeft. Dat is mijn **„Core-App”**. Het is geen eindproduct, maar een soort fundering waarop je snel en relatief goedkoop heel veel verschillende oplossingen voor **MKB**-bedrijven kunt neerzetten.

In die basis zitten alle saaie maar cruciale dingen: veilig inloggen, gebruikers en rollen, organisaties en projecten, rechten, instellingen en aan/uit-schakelaars, meldingen via e-mail of in de app, logging en controleerbaarheid, koppelpunten naar andere systemen en een neutrale webschil met basis-schermen en navigatie. Oftewel: alles wat elk serieus systeem nodig heeft, maar wat vrijwel geen enkel MKB zelf in huis kan ontwerpen of bouwen.

## Modulair en agnostisch

Belangrijk: de Core-App is **modulair** en **agnostisch**.
Modulair betekent dat het uit losse bouwblokken bestaat, als Lego. **Accounts** is één blok, **organisaties** een ander, **projecten**, **instellingen**, **transacties en credits**, **notificaties**, **observability**, **deploy-templates**, **frontend-designsysteem**, **layouts**, enzovoort. Je kunt ze combineren, uitbreiden of vervangen zonder dat het hele huis instort.

Agnostisch betekent dat het niet vastzit aan één sector of één type oplossing. Dezelfde basis kun je gebruiken voor een klantenportaal, een intern ticketsysteem, een reserveringsapp of een workflowtool. De kern blijft hetzelfde; alleen het laagje „wat doet deze app precies voor dit bedrijf” verschilt per toepassing.

## Hoe het is opgebouwd

De manier van opbouwen is heel bewust gekozen. In de projectvisie en roadmap is alles in fasen en modules geknipt:

- eerst de fundering (**project-skeleton**, **beveiliging**, **internationalisatie**, **governance**),
- dan **identiteit en multi-tenancy** (gebruikers, organisaties, projecten, rechten),
- daarna **configuratie, audit en transacties**,
- dan **interfaces en communicatie** (API’s, web-UI, taken, notificaties),
- en tot slot **operationalisatie** (observability, deploy-templates, scaffolding-CLI, documentatie).

Aan de frontend-kant hetzelfde: eerst een generiek **designsysteem**, dan login-flows, context-switcher, layouts, notificaties, resource-weergave, theming en herbruikbare paginasjablonen. Ik bouw dus geen losse „app”, maar een platform dat van nature bedoeld is om **breed hergebruikt en uitgebreid** te worden.

## Werkwijze: Spec-Driven Development + AI

Wat deze Core-App extra interessant maakt, is de manier waarop hij gemaakt wordt: volledig volgens **Spec-Driven Development**, en bijna helemaal met **AI**. In plaats van „we gaan gewoon wat bouwen”, is de werkwijze steeds hetzelfde:

1. eerst beschrijf ik per onderdeel in normale taal wat het moet doen en waarom (de **„spec”**),
2. daarna komt een **plan op hoofdlijnen**: hoe past dit in de rest, welke gegevens zijn nodig, welke stappen zijn belangrijk, hoe testen we het,
3. vervolgens wordt dat plan opgesplitst in **kleine, duidelijke taken**.

Dan komt het **AI-team** in actie. Ik gebruik grofweg drie AI-rollen:

- Een **context-assistent** (zoals ChatGPT in deze setup) kent alle afspraken, architectuur en documenten en helpt om specs, plannen en taken scherp te krijgen.
- Een **AI-programmeur** bouwt met **Spec Kitty** stap voor stap de backend, inclusief tests, en volgt daarbij een vaste set kwaliteitsregels.
- Aan de **frontend-kant** laat ik AI eerst **wireframes en schermindelingen** ontwerpen; die AI maakt klikbare schetsen van schermen en flows die ik vervolgens direct integreer in het frontend-gedeelte van de Core-App via het designsystem en de layouts, zodat je heel snel van idee naar een werkend prototype gaat dat meteen op de juiste technische basis draait.

Onder dit alles ligt een soort grondwet: een **„engineering constitution”** met afspraken over beveiliging, codekwaliteit, testen, performance, documentatie en hoe er wordt samengevoegd. Alle AI-werk moet zich aan die spelregels houden. De **Spec-Kitty-workflow** (van constitution naar spec, plan, taken, implementatie, review, acceptatie en merge) zorgt ervoor dat elke wijziging en elke module dezelfde route volgt. Dat is vrij vooruitstrevend; de meeste teams zijn nog lang niet zo gestructureerd in hun AI-gebruik en werken nog heel klassiek met losse tickets en individuele stijlen.

## AI Agent bovenop de Core-App

Boven op die modulaire kern wil ik de Core-App expliciet voorbereiden op een ingebouwde **AI Agent**. Niet alleen AI om de software te bouwen, maar ook een slimme assistent ín de applicatie zelf. Doordat de Core-App al zorgt voor duidelijke context (welke organisatie, welk project, welke gebruiker), strakke rechtenmodellen, gescheiden data per klant en goede logging, kan een AI Agent daar als **extra module** bovenop landen.

Zo’n agent kan bijvoorbeeld:

- de **context van een organisatie** kennen (klanten, projecten, processen),
- **vragen van gebruikers** beantwoorden („waar vind ik…?”, „wat is de status van…?”),
- **suggesties** doen voor vervolgstappen in processen,
- **patronen in data signaleren** en vertalen naar meldingen of rapporten.

Omdat alles **agnostisch en modulair** is, kun je dezelfde AI Agent-blok hergebruiken in verschillende oplossingen en hem per klant of branche met configuratie en prompts finetunen, zonder dat je de kern hoeft aan te passen.

## Data Science en Machine Learning

Op een vergelijkbare manier is de Core-App geschikt om er **Data Science** en **Machine Learning** bovenop te zetten. Alle belangrijke gebeurtenissen, transacties, statuswisselingen en gebruikspatronen lopen via dezelfde generieke structuren. Dat maakt het eenvoudig om later modellen toe te voegen die bijvoorbeeld:

- **risico’s** inschatten,
- **prioriteiten** bepalen,
- **volumes of doorlooptijden** voorspellen,
- **bottlenecks** in processen herkennen.

Je hoeft dan niet per klant een geheel nieuwe datalaag en ML-pijplijn te ontwerpen, maar je koppelt een modulair **ML-blok** aan een voorspelbare kern. De modellen blijven domein-onafhankelijk genoeg om ze opnieuw te gebruiken, terwijl je per organisatie alleen de parameters en regels bijstelt.

## Analytics en rapportage

Voor **data analytics** geldt hetzelfde principe. Doordat data en events via vaste, herbruikbare modellen en APIs binnenkomen, kun je een generieke **analytics-laag** neerzetten met dashboards, rapportages en exports die steeds op dezelfde basis draaien. In plaats van keer op keer een nieuw rapportagesysteem te bedenken, gebruik je één analytische ruggengraat en pas je alleen de doorsnedes, KPI’s en visualisaties aan die voor een specifieke klant of sector relevant zijn. Ook dit is weer **agnostisch en modulair**: één keer goed neerzetten, daarna hergebruiken en per klant slim aanpassen.

## Waarom dit juist voor het MKB relevant is

Waarom is dit relevant voor het **MKB**? Het grootste deel van de banen zit bij MKB-bedrijven, maar daar ontbreekt meestal een eigen IT-afdeling of architect. Heel veel processen draaien nog op **Excel**, e-mail, losse tools en verouderde software. Een traditioneel maatwerkproject is voor hen vaak te duur en te risicovol, terwijl standaardpakketten net niet passen.

Met deze **Core-App** kun je juist voor dat soort bedrijven veel sneller oplossingen bouwen die precies zijn toegesneden op hun manier van werken, én meteen klaar zijn voor de volgende stap met **AI Agents**, **Data Science** en **analytics** bovenop hun eigen data en processen.

Voorbeelden van toepassingen:

- klantportalen waar klanten zelf gegevens en status kunnen inzien;
- interne service- en ticketingsystemen;
- projectportalen en voortgangsborden;
- workflowapps voor goedkeuringen en controles;
- reserveringssystemen voor ruimtes, voertuigen of diensten;
- registratietools voor incidenten, kwaliteit of onderhoud.

In al die voorbeelden zijn de bouwstenen hetzelfde: gebruikers, rollen, organisaties, projecten, notificaties, logging, basis-UI. Precies wat nu al in de Core-App zit. Het maatwerk zit vooral in de labels, processen en schermen die bij een specifieke branche of klant horen – en daar kan zo’n ingebouwde **AI Agent**, plus een **analytics- of ML-laag**, straks ook weer bij helpen met uitleg, slimme zoekfunctie en voorstellen.

## Eén keer goed neerzetten, daarna hergebruiken

Het mooie is: omdat backend én frontend **agnostisch en modulair** zijn, hoef je bij een nieuwe oplossing vooral nog de „bovenlaag” te doen. De onderliggende infrastructuur – hoe wordt er ingelogd, hoe weten we welke organisatie of welk project actief is, hoe worden instellingen en feature-flags toegepast, hoe worden transacties of credits geboekt, hoe gaan notificaties de deur uit, hoe wordt het gemonitord – dat is allemaal **één keer goed geregeld**.

Aan de voorkant zorgen het designsystem en de layouts ervoor dat **AI-gegenereerde wireframes** snel kunnen worden omgezet in echte schermen die direct op de core aansluiten. En **AI Agents**, **Data Science** en **analytics** kunnen daar modulair bovenop komen, zonder dat we de basis hoeven te verbouwen.

## Kansen en concurrentie

Wat dit voor ons interessant maakt, is dat je hier niet vastzit aan één idee. Het is een platform waarmee je een hele reeks producten of oplossingen kunt maken. Een generiek MKB-portaal, een variant voor zakelijke dienstverleners, een versie voor interne processen, een versie voor planning of beheer, sectorgerichte varianten, enzovoort. Technisch is **70 tot 80 procent** telkens hetzelfde. Dat maakt het schaalbaar: je investeert één keer in een sterke kern en profiteert daarna bij elke nieuwe oplossing.

Als je naar de markt kijkt, zie je dat veel huidige oplossingen óf **te star** zijn (grote standaardpakketten waar je omheen moet werken), óf **te duur** (zwaar maatwerk per klant), óf **te beperkt** (kleine tools die één ding doen maar niet goed integreren). Met deze Core-App kun je wél echt **maatwerk** leveren, maar op een manier die herhaalbaar en betaalbaar blijft.

## Waar ik jullie hulp bij kan gebruiken

Dan het eerlijke stuk: ik heb niet de **marketing-skills** om dit groots in de markt te zetten. Ik zie de technische en inhoudelijke kansen heel duidelijk, en ik krijg het voor elkaar om dit met AI uit te denken, te structureren en te bouwen. Maar een **merk** neerzetten, **proposities** scherp formuleren, **marktsegmenten** kiezen, een **salesverhaal** uitrollen en partners of klanten systematisch benaderen, dat is niet mijn sterkste kant.

Tegelijkertijd ben ik ervan overtuigd dat hier **grote kansen** liggen, juist omdat deze manier van werken – **Spec-Driven Development** met een **AI-team**, een **AI Agent** in de app zelf en een modulair, agnostisch platform – nog lang niet breed wordt toegepast. De meeste organisaties zijn nog wat aan het experimenteren met AI-codegeneratie, terwijl je hier ziet dat je er in principe een groot deel van een traditioneel ontwikkelteam mee kunt vervangen of in ieder geval sterk kunt versterken. Ik ga hier dus hoe dan ook mee door.

En daar komen jullie in beeld. Jullie kennen andere sectoren, andere mensen, andere problemen. Misschien zien jullie toepassingen waarvan je denkt: „dit is precies iets waar veel bedrijven mee worstelen, daar zou deze Core-App – mét ingebouwde **AI Agent** en een goede **data- en analyticslaag** – ideaal voor zijn”. Of jullie hebben ideeën over hoe je dit slim kunt positioneren richting MKB: als **product**, als **dienst**, als **platform**, als **white label** oplossing.

Kort gezegd: ik heb een **sterke motor** gebouwd, grotendeels met AI, en die motor is al voorbereid op toekomstige **AI-, Data Science- en analytics-toepassingen** bij klanten zelf. De techniek, structuur en manier van werken zijn er. Waar ik hulp bij kan gebruiken, is het vertalen naar concrete proposities, doelgroepen en een aanpak om dit daadwerkelijk bij bedrijven op tafel te krijgen.

De **trein komt tenslotte maar één keer langs**… laten we in ieder geval even kijken of we instappen 😉
