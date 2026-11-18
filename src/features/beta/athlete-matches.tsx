import {useEffect,useState} from "react";
import {db,demo,type Snapshot} from "@/lib/beta";

import {MobileMatchList,type AthleteGame as Game} from './mobile-match-list';
const categories={vote_teammate:"Lagspiller",vote_best:"Banens beste",defensive_guardian:"Forsvarskjempe"};
type Packet={players:{id:string;name:string}[];votes:Record<string,string>};
function example():Game[]{return [{id:"example-played",fixture:"example-played",reg:"j13",team_name:"J13 A-serie",day:"2026-11-15",time:"17:00",opponent:"Fjordvik",title:"Fjordvik – Lundehaugen",venue:"Fjordvikhallen",score:"15-18",completed:true,played:true,goals:5,warnings:0,saves:null},{id:"example-next",fixture:"example-next",reg:"j13",team_name:"J13 A-serie",day:"2026-11-22",time:"14:00",opponent:"Strand",title:"Lundehaugen – Strand",venue:"Idrettshallen",score:null,completed:false,played:false,goals:null,warnings:null,saves:null}];}
function MatchVotes({game,data}:{game:Game;data:Snapshot}){
 const [packet,P]=useState<Packet>(),[err,E]=useState(""),[busy,B]=useState(false),[msg,M]=useState("");
 const query=async(cat?:string,person?:string):Promise<Packet>=>{
 if(!demo)return (await db!.rpc("beta_match_ballot",{mid:game.id,cat:cat||null,person:person||null}).throwOnError()).data;
 const k="example-votes:"+data.me.squad+":"+data.me.id+":"+game.id,votes=JSON.parse(localStorage.getItem(k)||"{}");if(cat){if(person)votes[cat]=person;else delete votes[cat];localStorage.setItem(k,JSON.stringify(votes));}return {players:[{id:"liv",name:"Liv Berg"},{id:"ida",name:"Ida Vik"}].filter(p=>p.id!==data.me.id),votes};
 };
 useEffect(()=>{let live=true;query().then(p=>{if(live)P(p);}).catch(e=>{if(live)E(e.message);});return()=>{live=false;};},[game.id,data.me.id,data.me.squad]);
 return <section className="grid"><h3>Mine kampstemmer</h3>{packet?.players.length?<><small>Én lagkamerat per kategori. Du kan endre stemmen din.</small>{Object.entries(categories).map(([cat,label])=><label key={cat}>{label}<select aria-label={label} disabled={busy} value={packet.votes[cat]||""} onChange={async e=>{const v=e.target.value;B(true);E("");M("");try{P(await query(cat,v));M(v?"Stemmen er lagret.":"Stemmen er fjernet.");}catch(e){E((e as Error).message);}finally{B(false);}}}><option value="">Ingen stemme</option>{packet.players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>)}</>:packet?<small>Ingen andre koblede deltakere som tar imot stemmer.</small>:null}{err&&<p role="alert">{err}</p>}{msg&&<small role="status">{msg}</small>}</section>;
}
export function AthleteMatches({data}:{data:Snapshot}){
 const [games,G]=useState<Game[]>(),[err,E]=useState("");
 useEffect(()=>{let live=true;const requested=new URLSearchParams(location.search).get("fixture");
 Promise.resolve(demo?Promise.resolve(data.me.squad==="demo"?example():[]):db!.rpc("beta_my_fixture_log").throwOnError().then(r=>(r.data||[]) as Game[])).then(async rows=>{if(requested&&!demo&&!rows.some(g=>g.id===requested)&&/^[0-9a-f-]{36}$/i.test(requested)){const {data:past}=await db!.rpc("beta_my_awarded_match",{wanted:requested}).throwOnError();if(past)rows=[...rows,past as Game];}if(live){G(rows);if(requested&&!rows.some(g=>g.id===requested))E("Kampen er ikke tilgjengelig i aktiv sesong.");}}).catch((e:Error)=>{if(live)E(e.message);});return()=>{live=false;};},[data.me.id,data.me.squad]);
 return <>{err&&<p role="alert">{err}</p>}{!games&&!err&&<p role="status">Henter kamper …</p>}{games&&<MobileMatchList games={games} name={data.me.name} initial={new URLSearchParams(location.search).get('fixture')||''} votes={g=><MatchVotes game={g} data={data}/>}/>}</>;
}
