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
 if(canEmbed&&yt&&/^[a-zA-Z0-9_-]{11}$/.test(yt)){embed="https://www.youtube-nocookie.com/embed/"+yt;poster="https://i.ytimg.com/vi/"+yt+"/hqdefault.jpg";}
 return {href,embed,poster,host};
}
