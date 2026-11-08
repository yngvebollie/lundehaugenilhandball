import type {Drill} from "./model";
export function sourceRecords(raw:unknown):Drill[]{
 if(!Array.isArray(raw)||!raw.length||raw.length>20000)throw Error("Ugyldig eller tom kildekatalog.");const ids=new Set();
 return raw.map((r,i)=>{if(!r||typeof r!=="object"||!["string","number"].includes(typeof r.id)||!String(r.id).match(/^[A-Za-z0-9_-]{1,80}$/)||typeof r.title!=="string"||!r.title.trim()||r.title.length>1500)throw Error("Ugyldig metadata i rad "+(i+1));
 const id="nhf:"+r.id;if(ids.has(id))throw Error("Duplikat-ID i kildegrunnlaget.");ids.add(id);
 const value=(x:unknown,max=120)=>typeof x==="string"||typeof x==="number"?String(x).trim().slice(0,max):"",video=r.vimeo_video_id==null?"":String(r.vimeo_video_id);
 if(!/^\d{0,15}$/.test(video))throw Error("Ugyldig videoreferanse i rad "+(i+1));const age=value(r.level),slug=[r.subjectSlug,r.categorySlug,r.techniqueSlug].filter(Boolean);
 const path=[age,...slug].map(x=>encodeURIComponent(String(x))).join("/");
 return {sourceMeta:{level:age,subjectSlug:value(r.subjectSlug),category:value(r.category),categorySlug:value(r.categorySlug),techniqueSlug:value(r.techniqueSlug),published:typeof r.published==="boolean"?r.published:null},id,title:r.title.trim(),instructions:typeof r.description==="string"?value(r.description,4000):"",theme:value(r.subject)||"Annet",technique:value(r.technique)||value(r.category),age:age||"Ukjent",equipment:[],space:"",minPlayers:null,maxPlayers:null,minKeepers:null,challenge:"",training:null,source:"NHF",vimeo:video,original:"https://www.ovelsesbanken.no/ovelser/"+path,tip:"",block:""};
 });
}
export async function fetchNHF(request:typeof fetch=fetch){
 const res=await request("https://www.ovelsesbanken.no/api/sheet/",{redirect:"error",cache:"no-store",signal:AbortSignal.timeout(10000)});
 if(!res.ok||!res.headers.get("content-type")?.toLowerCase().includes("json")||!res.body)throw Error("Kilden svarte ikke med en JSON-katalog.");
 const reader=res.body.getReader(),parts:Uint8Array[]=[];let bytes=0;try{for(;;){const r=await reader.read();if(r.done)break;bytes+=r.value.length;if(bytes>8_000_000)throw Error("Uventet stor katalog.");parts.push(r.value);}}finally{await reader.cancel();}
 const all=new Uint8Array(bytes);let pos=0;for(const part of parts){all.set(part,pos);pos+=part.length;}return sourceRecords(JSON.parse(new TextDecoder().decode(all)));
}
