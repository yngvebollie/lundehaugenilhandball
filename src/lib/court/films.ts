import type {Drill} from "./model";

export const phases = [
 ["Forsvar","Hindre gjennombrudd og samarbeide i forsvar."],
 ["Angrep","Skape rom, ta imot ballen og avslutte."],
 ["Kontra-retur","Veksle raskt mellom angrep og forsvar."],
 ["Målvakt","Grunnstilling, forflytning og redninger."],
 ["Fysisk","Styrke, hurtighet og bevegelseskontroll."],
 ["Mentalt og sosialt","Kommunikasjon og samarbeid i laget."]
] as const;
export function phaseOf(d:Drill){
 if(d.id==="club:close")return "Mentalt og sosialt";
 if(d.theme==="Keeper")return "Målvakt";
 if(["Kast og mottak","Skudd","Finter","Samspill"].includes(d.theme))return "Angrep";
 return d.theme;
}
// Editorial links only. The page and film stay with NHF; the coaching cues are ours.
export const referenceDrills:Drill[]=[
 ["Forsvar","forsvar","804248109","Beskytt målsonen","Hold avstand til nærmeste forsvarer. Avtal hvem som presser og hvem som sikrer."],
 ["Angrep","angrep","793713427","Finn en åpen skuddlinje","Flytt ballen til en medspiller med bedre vinkel mot kjegla."],
 ["Kontra-retur","kontra-retur","804889122","Smashball i omstilling","Orienter deg før berøring. Finn en ny posisjon straks ballen skifter lag."],
 ["Målvakt","malvakt","793607095","Reaksjon med fjærball","Finn grunnstillingen igjen etter hver sideveis forflytning."]
].map(([theme,slug,id,title,instructions])=>({id:"ref:"+id,title,instructions,source:"NHF-lenke",filmUrl:"https://vimeo.com/"+id,nhfLink:"https://www.ovelsesbanken.no/ovelser/13-15/"+slug+"/leker-og-oppvarming",age:"13–15",theme,technique:"",equipment:[],space:"",minPlayers:null,maxPlayers:null,minKeepers:null,challenge:"",training:null,vimeo:"",original:"",tip:"",block:""}));

export function filmAddress(value:string){
 try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password&&!url.port&&url.hostname.includes(".")?url.href:"";}catch{return "";}
}
// Public Vimeo oEmbed thumbnails for the curated films; the files remain with Vimeo.
const clubFilms:Record<string,[string,string,string]>={
 "club:zones":["969675399","forsvar/spill-og-motspill-1-mot-1/midtsektor","To mot to etter forflytning"],
 "club:defend":["804294176","forsvar/teknikk/presse","Én mot én: press ballføreren"],
 "club:feint":["804792146","angrep/teknikk/finte","Retningsskifte før skudd"],
 "club:shoot":["804793821","angrep/teknikk/skudd-fra-lufta","Hoppskudd etter oppspill"]
};
export function withClubFilm(d:Drill):Drill{
 const ref=clubFilms[d.id];return ref?{...d,filmUrl:"https://vimeo.com/"+ref[0],nhfLink:"https://www.ovelsesbanken.no/ovelser/13-15/"+ref[1],filmLabel:"Filmvariant fra NHF: "+ref[2]}:d;
}
const vimeoPosters:Record<string,string>={
 "969675399":"1883090899-0b42200aa42af6ce969fab229944d71c5b09b28930a25d876a6cf065ab597297",
 "804294176":"1623589194-cb8a4ab0578c18613f524af937a36015e93f10696ac62568677d81d1903041c1",
 "804792146":"1624831391-180199062245d7c5264b96c0ccd4d52bb633f432c793342a5364f7acf8aca052",
 "804793821":"1624838276-e8e4f0637d96b697c407b06eb587fc76abab06ef499c7e14088fe617c7bfe5e5",
 "171375042":"576810979-cebac51c36bf57892806d4ff8b6a57987ceb3a00ad12a1c7bfd6b00c14af8bc8",
 "804248109":"1623499128-c0e4b982472de09d3dd50d48618a4adcf05ab43c4e4a74d38d0dfcb9f2c79dca",
 "793713427":"1598049868-32ac6f3e75aa849b851deabe0be5eb0cb9cf6268d2cc7c64b268b72db451fcfd",
 "804889122":"1625083065-cb71908a18d67b74ef71d00cab276e417cac03e3113ff2170ec8325808b021b1",
 "793607095":"1597750675-ca1127554d0186bc069e6d0828061fb8cc6cec730bb02e2ad493801bc2ca4f8c"
};
export function media(d:Drill){
 const legacy=/^\d{1,15}$/.test(d.vimeo);
 const href=legacy?"https://vimeo.com/"+d.vimeo:d.source==="NHF"?"":filmAddress(d.filmUrl||"");
 if(!href)return null;
 const url=new URL(href),host=url.hostname.replace(/^www\./,"");
 const v=/^\/(?:video\/)?(\d{1,15})(?:\/([a-f0-9]{6,64}))?\/?$/i.exec(url.pathname);
 const yt=host==="youtu.be"?url.pathname.slice(1):host==="youtube.com"?(url.searchParams.get("v")||url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)$/)?.[1]):"";
 const canEmbed=legacy||d.source==="Klubb"&&d.embedFilm===true;
 let embed="",poster="";
 if(canEmbed&&["vimeo.com","player.vimeo.com"].includes(host)&&v){const hash=v[2]||url.searchParams.get("h")||"";embed="https://player.vimeo.com/video/"+v[1]+"?dnt=1"+(/^[a-f0-9]{6,64}$/i.test(hash)?"&h="+hash:"");}
 if(yt&&/^[a-zA-Z0-9_-]{11}$/.test(yt)){if(canEmbed)embed="https://www.youtube-nocookie.com/embed/"+yt;poster="https://i.ytimg.com/vi/"+yt+"/hqdefault.jpg";}
 if(["vimeo.com","player.vimeo.com"].includes(host)&&v&&vimeoPosters[v[1]])poster="https://i.vimeocdn.com/video/"+vimeoPosters[v[1]]+"-d_640";
 return {href,embed,poster,host};
}
