import {originals} from "../development/model";
export const themes=["Kast og mottak","Skudd","Finter","Forsvar","Samspill","Keeper","Fysisk"];
export const blocks=["Oppvarming","Teknikk","Spill","Avslutning"] as const;
export type Drill={filmUrl?:string;embedFilm?:boolean;filmLabel?:string;nhfLink?:string;sourceMeta?:{category:string};id:string;title:string;instructions:string;theme:string;technique:string;age:string;equipment:string[];space:string;minPlayers:number|null;maxPlayers:number|null;minKeepers:number|null;challenge:string;training:number|null;source:"Klubb"|"NHF"|"NHF-lenke";vimeo:string;original:string;tip:string;block:string};
function drill(id:string,title:string,instructions:string,theme:string,block:string,minPlayers:number,equipment:string[]=["Baller"],space="Korridor",minKeepers=0):Drill{return {id,title,instructions,theme,technique:theme,age:"Alle",equipment,space,minPlayers,maxPlayers:null,minKeepers,challenge:"Tilpasset",training:600,source:"Klubb",vimeo:"",original:"",tip:"Avtal tempo og avstand med treneren.",block};}
export const baseDrills:Drill[]=[
 {...drill("club:warm","Bevegelse med ball","Beveg dere i ledig rom. På signal bytter dere retning og finner en ny pasningspartner.","Kast og mottak","Oppvarming",2),filmUrl:"https://vimeo.com/171375042",filmLabel:"Beslektet film: Lek med ball (NHF)"},
 drill("club:balance","Speil føttene","Følg partnerens sideveis bevegelser. Bytt hvem som leder.","Fysisk","Oppvarming",2,[]),
 ...originals.map((x,i)=>drill(x.id,x.title,x.instructions,i===2?"Finter":"Kast og mottak","Teknikk",2,i===0?["Baller"]:["Baller","Kjegler"])),
 drill("club:defend","Én mot én gjennom port","Forsvarer holder seg mellom angriper og port. Bytt roller etter hvert forsøk.","Forsvar","Teknikk",2,["Kjegler"]),
 drill("club:keep","Keeper og skuddvinkel","Avtal skuddside og intensitet. Keeper flytter seg med ballen før skytteren avslutter.","Keeper","Teknikk",3,["Baller"],"Halvbane",1),
 drill("club:shoot","Skudd etter pasning","Ta imot i fart og velg en avtalt skuddsone. Hent ballene samlet.","Skudd","Teknikk",2,["Baller"],"Halvbane"),
 drill("club:small","Småspill med pasningsvalg","Spill på avgrenset flate. Ballfører søker en ledig medspiller før avslutning.","Samspill","Spill",4,["Baller"],"Halvbane"),
 drill("club:zones","Forsvar to soner","To små lag forsvarer hver sin sone. Bytt roller etter ballvinning.","Forsvar","Spill",4,["Baller"],"Halvbane"),
 drill("club:keeper-game","Småspill med keeperstart","Keeper setter ballen i spill. Laget finner bredde før avslutning.","Keeper","Spill",5,["Baller"],"Halvbane",1),
 drill("club:pairgame","Pasningsduell i korridor","Jobb parvis for å spille gjennom porten. Bytt side og rolle.","Kast og mottak","Spill",2,["Baller"]),
 drill("club:close","Oppsummering i par","Fortell partneren om et valg som fungerte, og ett dere vil prøve neste gang.","Samspill","Avslutning",2,[])
];
export type Item={prepareVideo?:boolean;snapshot?:Drill|null;id:string;ex:string;manual:string;block:string;work:number;setup:number;locked:boolean;instructions:string;points:string;group:string};
export type Plan={id:string;title:string;goal:string;venue:string;start:string;target:number;purpose:"team"|"individual";origin:"manual"|"generated"|"template";items:Item[];kit:string;expected:number};
export type Rules={age:string;minutes:number;players:number;keepers:number;focus:string[];equipment:string[];space:string;challenge:string};
export const initialRules:Rules={age:"13–15",minutes:90,players:14,keepers:1,focus:["Kast og mottak","Forsvar"],equipment:["Baller","Kjegler","Vester"],space:"Halvbane",challenge:"Tilpasset"};
export const blank=():Plan=>({id:crypto.randomUUID(),title:"Ny håndballøkt",goal:"",venue:"",start:"",target:5400,purpose:"team",origin:"manual",items:[],kit:"",expected:14});
export const item=(ex="",manual="",block="Teknikk",work=600):Item=>({id:crypto.randomUUID(),ex,manual,block,work,setup:0,locked:false,instructions:"",points:"",group:""});
export const total=(p:Plan)=>p.items.reduce((sum,i)=>sum+i.work+i.setup,0);
export const mins=(seconds:number)=>+(seconds/60).toFixed(1);
export const nextLine=(p:Plan)=>{let t=0;return p.items.map(i=>{const start=t;t+=i.work+i.setup;return {...i,offset:start,end:t};});};
export function wallTime(instant:string){return instant?new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Oslo",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(instant)).replace(" ","T"):"";}
export function osloInstant(local:string){
 if(!local)return "";const trial=Date.parse(local+"Z");if(!Number.isFinite(trial))throw Error("Ugyldig lokal tid.");
 const found=[1,2].map(h=>new Date(trial-h*3600000).toISOString()).filter(t=>wallTime(t)===local);
 if(found.length!==1)throw Error("Denne tiden er tvetydig eller finnes ikke ved klokkeendring. Velg et annet tidspunkt.");return found[0];
}
export const eligible=(d:Drill,r:Rules)=>!!d.block&&d.minPlayers!=null&&d.minKeepers!=null&&(d.age==="Alle"||d.age===r.age)&&d.minPlayers<=r.players&&(!d.maxPlayers||r.players<=d.maxPlayers)&&d.minKeepers<=r.keepers&&d.equipment.every(e=>r.equipment.includes(e))&&["Korridor","Halvbane","Helbane"].indexOf(d.space)<=["Korridor","Halvbane","Helbane"].indexOf(r.space)&&(d.challenge==="Tilpasset"||d.challenge===r.challenge);
export function generate(bank:Drill[],r:Rules,old?:Plan,seed=0){
 if(!Number.isInteger(r.minutes)||r.minutes<10||r.minutes>240||!Number.isInteger(r.players)||r.players<1||!Number.isInteger(r.keepers)||r.keepers<0||r.keepers>r.players)throw Error("Kontroller varighet, spillerantall og antall keepere.");
 const allowed=bank.filter(d=>eligible(d,r)),layout=["Oppvarming","Teknikk","Teknikk","Pause","Spill","Spill","Avslutning"],weights=[10,15,20,5,20,15,5],used=new Set<string>();
 for(const [n,i] of (old?.items||[]).entries())if(i.locked&&(n>=layout.length||i.ex&&!allowed.some(d=>d.id===i.ex)))throw Error("En låst aktivitet passer ikke med de nye rammene. Lås den opp eller endre rammene.");
 const items=layout.map((b,n)=>{const before=old?.items[n];if(before?.locked){used.add(before.ex);return {...before};}
  if(b==="Pause")return before?.block===b&&!before.ex?{...before}:item("","Vannpause",b);
  const options=allowed.filter(d=>d.block===b);if(!options.length)throw Error("Ingen godkjent øvelse passer i "+b+". Endre utstyr, baneplass eller spillerantall.");
  const ranked=options.map((d,i)=>({d,score:(r.focus.includes(d.theme)?8:0)+(r.keepers&&d.minKeepers?5:0)-(used.has(d.id)?20:0),rotate:(i+seed)%options.length})).sort((a,b)=>b.score-a.score||a.rotate-b.rotate);
  const d=ranked[0].d;used.add(d.id);return before?.ex===d.id?{...before}:item(d.id,"",b);
 });
 const locked=items.reduce((n,i)=>n+(i.locked?i.work+i.setup:0),0),remaining=r.minutes*60-locked,free=items.filter(i=>!i.locked);
 if(remaining<60*free.length||!free.length&&remaining!==0)throw Error("Låst tid passer ikke med øktmålet. Endre tid eller lås opp en aktivitet.");
 let allocated=0;const weight=items.reduce((n,i,k)=>n+(i.locked?0:weights[k]),0);
 items.forEach((it,k)=>{if(it.locked)return;const share=60+Math.floor((remaining-60*free.length)*weights[k]/weight),duration=it===free.at(-1)?remaining-allocated:share;allocated+=duration;it.setup=it.block==="Pause"||it.block==="Avslutning"?0:Math.min(60,duration-30);it.work=duration-it.setup;});
 return {...(old||blank()),title:old?.title&&old.title!=="Ny håndballøkt"?old.title:r.focus.join(" og ")||"Håndballtrening",target:r.minutes*60,origin:"generated" as const,expected:r.players,items,kit:r.equipment.join(", ")};
}
export function copyPlan(p:Plan,template=false){return {...structuredClone(p),id:crypto.randomUUID(),title:p.title+(template?" · mal":" · kopi"),start:"",origin:template?"template" as const:p.origin==="template"?"manual" as const:p.origin,items:p.items.map(i=>({...i,id:crypto.randomUUID()}))};}
export function validatePlan(p:Plan,publishing=false){
 if(!p.title.trim()||p.title.length>120||p.items.length>80||!Number.isInteger(p.target)||p.target<60||p.target>86400||(!p.items.length&&publishing))throw Error("Oppgi øktnavn, målvarighet og minst én aktivitet før deling.");
 const ids=new Set();for(const i of p.items){if(ids.has(i.id)||!i.block.trim()||!i.ex&&!i.manual.trim()||!Number.isInteger(i.work)||!Number.isInteger(i.setup)||i.work<(publishing?1:0)||i.setup<0||i.work+i.setup>86400)throw Error("Kontroller blokk, aktivitet og tid.");ids.add(i.id);}
}
