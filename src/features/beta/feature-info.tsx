"use client";
import {Info,X} from "lucide-react";
import {useId,useRef,type ReactNode} from "react";
import styles from "./feature-info.module.css";

const topics = {
  "agenda": [
    "Dagens oversikt",
    "Se dagens trening og neste kamp for hvert spillelag. Åpne en spiller for å følge opp individuelt.",
    "Oversikten samler aktiviteter fra andre deler av appen. Å åpne en rad endrer ikke planen."
  ],
  "feed": [
    "Utøveraktivitet",
    "Bla gjennom registreringene fra utøverne i det valgte laget.",
    "En registrering forteller hva spilleren har ført. Ingen aktivitet i listen betyr ikke nødvendigvis at spilleren har hatt fri."
  ],
  "builder": [
    "Programbygger",
    "Samle øvelser i økter, angi dag i programmet og lagre et program du vil bruke igjen.",
    "Et lagret program kan gjenbrukes. Kontroller lag, mottakere og dato før du publiserer økter."
  ],
  "library": [
    "Øvelser og øktmaler",
    "Søk etter en øvelse, eller velg en lagret økt med flere øvelser.",
    "Valget legges i programmet du arbeider med. Spillerne får ikke en ny økt bare fordi du åpner biblioteket."
  ],
  "ai": [
    "Trenerassistent",
    "Beskriv hva du trenger, for eksempel en middels tung økt for beina. Se over øvelser og dosering.",
    "Et forslag er et utkast. Treneren vurderer om innholdet passer spillerne før det deles."
  ],
  "week": [
    "Ukeplan",
    "Velg uke og dag for å se hva som er satt opp av økter, kamper og trening.",
    "En planlagt aktivitet er ikke en bekreftelse på at spilleren deltok."
  ],
  "suggest": [
    "Ukeforslag",
    "Velg ønsket ukeprofil og vurder forslaget opp mot eksisterende belastning og kamper.",
    "Et forslag erstatter ikke trenerens vurdering. Sjekk datoer og mottakere før publisering."
  ],
  "compare": [
    "Sammenlign uker",
    "Velg en referanseuke for å sammenligne treningsmengde og registrert aktivitet.",
    "Å endre sammenligningsuke flytter ingen økter."
  ],
  "monitor": [
    "Health monitor",
    "Velg periode og spiller. Se hva som var planlagt, og hva som faktisk er registrert.",
    "Belastning er et estimat, ikke en diagnose. Bruk tallene sammen med spillerens egen tilbakemelding."
  ],
  "load": [
    "Samlet belastning",
    "Bytt mellom uke og måned. Les skolegym, annen aktivitet, lagtrening og kamp hver for seg eller i totalen.",
    "Poeng er minutter ganger intensitet. En strek betyr manglende registrering, ikke null belastning."
  ],
  "regular": [
    "Faste aktiviteter",
    "Legg inn faste ukedager, varighet og intensitet for skolegym eller annen aktivitet én gang.",
    "Planen gjentas. Å justere eller hoppe over én gjennomføring endrer ikke den faste ukeplanen."
  ],
  "actual": [
    "Dagens gjennomføring",
    "Bekreft aktivitet på riktig dato. Juster minutter og intensitet hvis økten ble annerledes enn planlagt.",
    "Faktisk belastning for dagen oppdateres i oversikten. Planlagt belastning vises separat."
  ],
  "court": [
    "Øktplanlegger",
    "Bygg en økt manuelt eller lag et forslag ut fra spillere, tid, utstyr og fokus.",
    "Utkastet er trenerens arbeidskopi. Del økten når du er klar til at mottakerne skal se den."
  ],
  "share": [
    "Del økt",
    "Velg mottakere, tidspunkt og hva spillerne skal se. Kontroller forhåndsvisningen.",
    "Publiserte økter blir tilgjengelige for de valgte spillerne. Interne trenernotater er ikke spillertips."
  ],
  "bank": [
    "Øvelsesbank",
    "Filtrer på tema eller kilde, les instruksjonene og åpne filmen der det finnes en videolenke.",
    "En favoritt gjør øvelsen lettere å finne igjen. Å legge den i en økt er et eget valg."
  ],
  "field": [
    "På banen",
    "Åpne en planlagt økt, følg rekkefølgen og bruk tiden til hver aktivitet.",
    "Banevisningen hjelper treneren under økten. Tiden alene bekrefter ikke hver spillers deltakelse."
  ],
  "development": [
    "Min utvikling",
    "Se spillerens mål, øvinger, observasjoner og tilbakemeldinger. Velg spiller i trenerrommet.",
    "En registrert øving viser innsats. Den er ikke det samme som trenerbekreftet mestring."
  ],
  "setup": [
    "Lagets utviklingsoppsett",
    "Velg oppsett og øvelser som laget skal bruke i utviklingsarbeidet.",
    "Et lagoppsett og en personlig vurdering er to forskjellige ting. Se den enkelte spillerens mål før oppfølging."
  ],
  "journey": [
    "Målreise",
    "Følg målet fra avtale via øving til utprøving i spill.",
    "Å logge flere øvinger er ikke en automatisk godkjenning av neste ferdighetsnivå."
  ],
  "matches": [
    "Spillelag og sesong",
    "Velg sesong og riktig spillelag før du henter terminlisten. Hvert NIF-lag har egen ID.",
    "Spillelag i samme treningsgruppe beholder egne kamper, resultater og rapporter."
  ],
  "report": [
    "Kamprapport",
    "Lim inn rapportteksten eller les inn en PDF. Sjekk kamp-ID, deltakelse og mål på begge lag før import.",
    "Forhåndsvisningen lagrer ingenting. Den lagrede rapporten gir spillerlinjer til statistikken og kan redigeres."
  ],
  "stats": [
    "Spillerstatistikk",
    "Velg samlet visning eller ett nivå. Sammenlign kamper, mål, snitt og disiplin for sesongen.",
    "Manglende rapport er ikke en kamp med null mål. Gullballene viser toppscorerplasseringer, ikke en treneravstemning."
  ],
  "opponents": [
    "Motstandere",
    "Velg en motstander for å se kommende og tidligere møter og målscorere mot dere.",
    "Tallene beskriver møtene med eget lag der dere har data, ikke motstanderens fulle sesong."
  ],
  "live": [
    "Liveanalyse",
    "Velg kamp, start klokken og registrer skudd, plassering og utfall etter hvert.",
    "Disse tallene er trenerens egen kampanalyse. De endrer ikke den offisielle NHF-rapporten."
  ],
  "team": [
    "Lag og medlemmer",
    "Kontroller hvilket lag og hvilken rolle som er valgt før du inviterer. Bruk laglenke, kode eller e-post.",
    "En trenerinvitasjon gir en annen tilgang enn en utøverinvitasjon. Del trenerlenker bare med trenerstaben."
  ],
  "directory": [
    "Brukeroversikt",
    "Finn medlemmer og invitasjoner for lagene rollen din gir tilgang til.",
    "Å velge en rolle endrer visningen. Et søk oppretter ikke medlemskap og gir ingen nye tilganger."
  ],
  "profile": [
    "Spillerprofil",
    "Se treningshistorikk og kobling til kamprapporter. Kontroller både spiller og draktnummer før kobling.",
    "En kobling gjør at statistikk fra rapporten kan vises på riktig profil. Et draktnummer alene identifiserer ikke spilleren."
  ],
  "groups": [
    "Utviklingsgrupper",
    "Samle spillere med et felles treningsfokus, for eksempel fotarbeid eller skudd.",
    "Gruppene er trenerverktøy for utvalg og tildeling, ikke en offentlig rangering av spillerne."
  ],
  "challenge": [
    "Utfordringer",
    "Velg utfordringen og registrer det du gjorde denne gangen, ikke totalen fra tidligere. Du kan registrere flere ganger.",
    "Registreringene summeres i perioden. På en anonym resultatliste ser utøveren egen plass, men ikke navnene til de andre."
  ],
  "badge": [
    "Merker",
    "Velg en kategori og åpne et merke for å se kriteriene. BEEP gjelder testnivå og KMT gjelder skuddhastighet.",
    "Et merke viser at kravet er nådd. Et neste mål er en terskel å jobbe mot, ikke et merke spilleren allerede har."
  ],
  "ratings": [
    "Øvelsesvurderinger",
    "Se hvilke øvelser spillerne har vurdert. Les enkeltsvar sammen med antallet svar.",
    "Stjerner for en enkeltøvelse og vurderingen av hele økten er ulike tilbakemeldinger."
  ],
  "notice": [
    "Lagbeskjeder",
    "Send en datert beskjed til de valgte mottakerne. Utøveren kan bekrefte at den er lest.",
    "Lest betyr at spilleren har kvittert for beskjeden, ikke at spilleren har deltatt på trening."
  ],
  "chat": [
    "Samtaler",
    "Velg samtalen med spilleren eller trenerstaben før du skriver.",
    "Dette er en samtale, ikke en lagbeskjed med lesekvittering."
  ],
  "athlete": [
    "Min trening",
    "Åpne dagens økt og kryss av for øvelsene du utfører. Vurder øvelsene og økten når du er ferdig.",
    "Avkrysning viser hva du har gjort. Stjerner og kommentarer gir treneren tilbakemelding til neste økt."
  ],
  "progress": [
    "Treningshistorikk",
    "Se gjennom tidligere økter og avkrysninger.",
    "Historikken bygger på registreringene dine. Planlagte økter uten avkrysning er ikke fullførte."
  ],
  "wizard": [
    "Min profil",
    "Legg inn draktnummer, treningsønsker, posisjoner og faste gymdager. Du kan endre valgene senere.",
    "Treneren kan bruke ønskene i oppfølgingen. En ønsket posisjon er ikke et laguttak."
  ],
  "entry": [
    "Registrering og innlogging",
    "Velg riktig rolle. Har du lagets invitasjonslenke, start der for å komme til riktig lag.",
    "Utøvere kan bruke telefon og passord uten e-post. Innlogging som trener er adskilt fra utøverregistrering."
  ],
  "reset": [
    "Nytt passord",
    "Åpne gjenopprettingslenken og velg et nytt passord for kontoen.",
    "Det nye passordet brukes ved neste innlogging. Det oppretter ikke en ny spiller eller et nytt lag."
  ],
  "demo": [
    "Prøv med eksempeldata",
    "Bytt mellom trener og utøver og utforsk fiktive profiler og merker.",
    "Endringer i utviklingsplanen lagres bare i denne nettleserfanen og påvirker ikke klubben."
  ]
} as const;
export function FeatureInfo({topic,children}:{topic:keyof typeof topics;children?:ReactNode}){
 const [name,how,effect]=topics[topic],id=useId(),dialog=useRef<HTMLDialogElement>(null);
 return <div className={styles.title}>{children}<button type="button" className={styles.info} title={"Om "+name} aria-label={"Om "+name} aria-haspopup="dialog" onClick={()=>dialog.current?.showModal()}><Info size={17} aria-hidden="true"/></button>
 <dialog className={styles.dialog} aria-labelledby={id} ref={dialog}><header><h2 id={id}>{name}</h2><button type="button" aria-label="Lukk informasjon" onClick={()=>dialog.current?.close()}><X size={19}/></button></header><p>{how}</p><strong>Hva betyr det?</strong><p>{effect}</p></dialog></div>;
}
