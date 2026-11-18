import {useEffect,useState} from "react";
import {today,type Snapshot} from "@/lib/beta";
import {court,courtEnabled,type Doc} from "@/lib/court/client";
import {regular} from "@/lib/coach-feedback";
import {sessionLoad} from "@/lib/session-load";
import {recordedActivities,type RecordedActivity} from "@/lib/recorded-activity";

export function useRecordedActivity(data:Snapshot,from:string,until:string,person?:string){
 const key=[data.me.squad,data.me.id,person||"",from,until].join(":"),[state,S]=useState<{key:string;rows:RecordedActivity[];docs:Doc[]}>(),[failure,E]=useState<{key:string;message:string}>(),[version,V]=useState(0);
 useEffect(()=>{let live=true,loading=false;S(undefined);E(undefined);
  const read=async()=>{if(loading)return;loading=true;try{const [packet,rules,logs]=await Promise.all([courtEnabled?court(data):Promise.resolve({sessions:[]}),regular(data),sessionLoad(data,from,until)]);if(live){S({key,docs:packet.sessions,rows:recordedActivities(data,packet.sessions,rules,logs,from,until,today(),person)});E(undefined);}}catch{if(live)E({key,message:"Aktivitetshistorikken kunne ikke lastes."});}finally{loading=false;}};
  void read();const refresh=()=>void read();window.addEventListener("focus",refresh);const timer=setInterval(()=>{if(!document.hidden)refresh();},60000);
  return()=>{live=false;clearInterval(timer);window.removeEventListener("focus",refresh);};
 },[data,key,from,until,person,version]);
 return {rows:state?.key===key?state.rows:[],docs:state?.key===key?state.docs:[],ready:state?.key===key,error:failure?.key===key?failure.message:"",retry:()=>V(n=>n+1)};
}
