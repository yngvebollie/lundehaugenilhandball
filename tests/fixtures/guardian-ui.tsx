import React from 'react';
import {createRoot} from 'react-dom/client';
import GuardianPage from '../../app/foresatt/page';
import {GuardianManagement} from '../../src/features/beta/guardian-management';
import {MobileMatchList} from '../../src/features/beta/mobile-match-list';
import '../../app/globals.css';
import '../../app/workspace.css';
export const demo=false;
export const today=()=> '2026-11-18';
export const db={auth:{getSession:async()=>({data:{session:{access_token:'test',user:{id:'parent',email:'parent@example.test'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({error:null})},rpc:(name:string,args:unknown)=>({throwOnError:async()=>{const r=await fetch('/test-rpc',{method:'POST',body:JSON.stringify({name,args})});const data=await r.json();if(!r.ok)throw Error(data.error);return {data};}})};
export const games=[{id:'game-1',fixture:'same-game',reg:'j13',team_name:'J13 A-serie',day:'2026-11-15',time:'17:00',opponent:'Fjordvik',title:'Fjordvik – Lundehaugen IL',venue:'Idrettshallen',score:'15-18',completed:true,played:true,goals:5,penalty:2,warnings:1,suspensions:1,disqualifications:0,saves:null,result:'W'},
 {id:'game-2',fixture:'other-game',reg:'j14',team_name:'J14 A-serie',day:'2026-11-16',time:'18:00',opponent:'Strand',title:'Lundehaugen IL – Strand',venue:'Idrettshallen',score:'12-19',completed:true,played:true,goals:3,penalty:1,warnings:0,suspensions:0,disqualifications:0,saves:null,result:'L'}];
const data:any={me:{id:'coach',role:'coach',squad:'team'},roster:[{id:'kid',name:'Live Testspiller',role:'athlete',shirt_number:'13'}]};
const mode=new URLSearchParams(location.search).get('mode');
createRoot(document.getElementById('root')!).render(mode==='coach'?<main className="guardian-page"><GuardianManagement data={data}/></main>:mode==='stats'?<main className="guardian-page"><MobileMatchList games={games} name="Live Testspiller"/></main>:<GuardianPage/>);
