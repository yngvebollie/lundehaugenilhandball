import {clubLink} from "./club-url";
import { createSupabaseBrowserClient } from "./supabase/client";
import { env, hasSupabaseEnv } from "./env";
import type { Program, Feedback } from "./programs";
import type { Exercise, EventKind } from "./workload";
import type { FocusMember } from "./focus";

export type Team = {id:string;name:string;discoverable?:boolean;logo?:string};
export type Member = { id: string; squad: string; name: string; role: "coach" | "athlete";position?:string;bio?:string;photo?:string;email?:string;shirt_number?:string|null };
export type Assignment = { id: string; athlete: string; squad: string; title: string; day: string; exercises: string[]; program_name?:string|null; kind?:EventKind; minutes?:number|null; start_time?:string|null;personal?:boolean };
export type Check = { assignment: string; step: number };
export type WorkoutReview={assignment:string;stars:number;exercise_stars:number[];comment:string};
export type Notice={id:string;batch:string;squad:string;coach:string;athlete:string;cadence:"Daily"|"Weekly";starts_on:string;body:string;posted_at:string;read_at:string|null};
export type Usage = {exercise_key:string;uses:number;last_used:string};
export type ClubRole={eligible:boolean;active:boolean};
export type Directory={teams:{id:string;name:string;admin:boolean}[];members:{team:string;id:string;name:string;role:"coach"|"athlete";admin:boolean}[];invitations:{team:string;role:string;email:string|null;expires:string;expired:boolean;kind:string}[]};
export async function clubRole(mode:"read"|"club"|"coach"="read"):Promise<ClubRole>{
  if(!demo)return (await db!.rpc("beta_club_role",{mode}).throwOnError()).data;
  const eligible=sessionStorage.getItem("nhf-persona")==="coach";if(mode!=="read")sessionStorage.setItem("demo-club-mode",String(eligible&&mode==="club"));
  return {eligible,active:eligible&&sessionStorage.getItem("demo-club-mode")==="true"};
}
export async function clubDirectory(data:Snapshot):Promise<Directory>{
  if(!demo)return (await db!.rpc("beta_club_directory").throwOnError()).data;
  if(data.me.role!=="coach")throw Error("Trenertilgang kreves");
  const links=localRows<{id:string;team:string}>("membership:"),teams=data.teams.map(t=>({...t,admin:data.club?.active||demoAdmins(t.id).includes(data.me.id)}));
  return {teams,members:teams.flatMap(t=>demoMembers().filter(m=>m.squad===t.id||links.some(k=>k.team===t.id&&k.id===m.id)).map(m=>({id:m.id,name:m.name,role:m.role,team:t.id,admin:demoAdmins(t.id).includes(m.id)}))),
    invitations:localRows<{team:string;role:string;email:string;expires:number}>("invite:").filter(i=>teams.some(t=>t.id===i.team&&(i.role==="athlete"||t.admin))).map(i=>({...i,kind:"E-post",expired:i.expires<=Date.now(),expires:new Date(i.expires).toISOString()}))};
}
export type Snapshot = { club?:ClubRole;me: Member; teams:Team[]; roster: Member[]; plans: Assignment[]; checks: Check[]; programs:Program[]; feedback:Feedback[]; library:Exercise[]; usage:Usage[];focusMembers:FocusMember[];reviews:WorkoutReview[];notices:Notice[];admins:string[] };
const hasAnyConfig = Boolean(env.supabaseUrl || env.supabaseAnonKey);
export const demo = !hasAnyConfig;
export const db = hasSupabaseEnv() ? createSupabaseBrowserClient() : null;
const roster: Member[] = [
  { id: "coach", squad: "demo", name: "Demo Coach", role: "coach" },
  { id: "liv", squad: "demo", name: "Liv Berg", role: "athlete" },
  { id: "ida", squad: "demo", name: "Ida Vik", role: "athlete" }
];
export const today = () => new Intl.DateTimeFormat("sv-SE", {timeZone:"Europe/Oslo"}).format(new Date());
const prefix = "nhf-beta-v1:";
async function pages<T>(fetchPage:(start:number,end:number)=>PromiseLike<{data:T[]|null}>):Promise<T[]> {
  const rows:T[]=[];
  for(;;){
    const {data}=await fetchPage(rows.length,rows.length+499);
    if(!data?.length) return rows;
    rows.push(...data);
  }
}
function localRows<T>(kind: string): T[] {
  return Object.keys(localStorage).filter(k => k.startsWith(prefix + kind)).flatMap(k => JSON.parse(localStorage.getItem(k) || "[]"));
}
const seedTeam:Team={id:"demo",name:"NHF Women · Senior squad",discoverable:true};
function demoAdmins(team:string):string[]{
  const saved=localStorage.getItem(prefix+"admins:"+team);
  if(saved)return JSON.parse(saved);
  const first=demoMembers().find(m=>m.role==="coach"&&m.squad===team)?.id||localRows<{id:string;team:string}>("membership:").find(m=>m.team===team)?.id;
  return first?[first]:[];
}
function demoMembers(){
  const members=new Map(roster.map(m=>[m.id,{...m,email:m.id+"@demo.test"} as Member]));
  localRows<Member>("member:").forEach(m=>members.set(m.id,m));
  return [...members.values()];
}
export const selectTeam=(member:string,team:string)=>sessionStorage.setItem("nhf-team:"+member,team);
function activeTeam(member:Member,teams:Team[]){
  return teams.find(t=>t.id===sessionStorage.getItem("nhf-team:"+member.id))?.id||member.squad;
}
export async function readBeta(persona: string): Promise<Snapshot | null> {
  if (demo) {
    const members=demoMembers();
    const identity=members.find(r=>r.id===(sessionStorage.getItem("nhf-persona")||persona))||members[0];
    const memberships=localRows<{id:string;team:string}>("membership:");
    const allTeams=new Map([seedTeam,...localRows<Team>("team:")].map(t=>[t.id,t]));
    const club=identity.role==="coach"?await clubRole():undefined;
    const teams=[...allTeams.values()].filter(t=>club?.active||t.id===identity.squad||memberships.some(m=>m.id===identity.id&&m.team===t.id));
    const me={...identity,squad:activeTeam(identity,teams)};
    if (!localStorage.getItem(prefix+"seed")) {
      localStorage.setItem(prefix+"plan:seed", JSON.stringify(roster.slice(1).map(r => ({
        id: "starter-"+r.id, squad: "demo", athlete:r.id, title:"Lower body power", day:today(),
        exercises:["Dynamic warm-up · 5 min","Squat · 4 x 8","Plank · 3 x 45 sec"]
      }))));
      localStorage.setItem(prefix+"seed","1");
    }
    const plans = localRows<Assignment>("plan:").filter(p => p.squad===me.squad&&(me.role==="coach" || p.athlete===me.id));
    const notices=localRows<Notice>("notice:"+me.squad+":").filter(n=>me.role==="coach"||(n.athlete===me.id&&n.starts_on<=today())).map(n=>({...n,read_at:localStorage.getItem(prefix+"accepted:"+n.id)}));
    return { club,me, teams,plans,notices,admins:me.role==="coach"?[...new Set([...demoAdmins(me.squad),...(club?.active?[me.id]:[])])]:[],reviews:localRows<WorkoutReview>("review:").filter(r=>plans.some(p=>p.id===r.assignment)),focusMembers:me.role==="coach"?localRows<FocusMember>("focus:"+me.squad+":"):[],usage:localRows<Usage>("uses:"+me.id+":"), roster:me.role==="coach"?members.filter(m=>m.squad===me.squad||memberships.some(x=>x.id===m.id&&x.team===me.squad)):[me], checks:localRows<Check>("check:").filter(c=>plans.some(p=>p.id===c.assignment)),
      library:me.role==="coach"?localRows<Exercise>("exercise:").filter(e=>e.squad===me.squad):[],programs:me.role==="coach"?localRows<Program>("program:").filter(p=>p.squad===me.squad):[], feedback:localRows<Feedback>("feedback:").filter(f=>plans.some(p=>p.id===f.assignment)) };
  }
  if (!db) throw Error("Set both public Supabase variables and rebuild.");
  const { data:{session},error } = await db.auth.getSession();
  if(error) throw error;
  if(!session) return null;
  const client=db;
  const identity = (await client.from("beta_members").select("*").eq("id",session.user.id).maybeSingle().throwOnError()).data as Member|null;
  if(!identity) throw Error("Finish joining your team using the team directory.");
  const club=identity.role==="coach"?await clubRole():undefined;
  const teams=await pages<Team>((s,e)=>client.from("beta_teams").select("id,name,discoverable,logo").order("id").range(s,e).throwOnError());
  const me={...identity,squad:activeTeam(identity,teams)};
  const [admins,messages,reviews,focusMembers,usage,members,library,programs,feedback,plans,checks] = await Promise.all([
    me.role==="coach"?client.rpc("beta_staff",{action:"list",t:me.squad}).throwOnError().then(r=>r.data as string[]):[],
    pages<Omit<Notice,"read_at">&{beta_notice_reads:{read_at:string}|null}>((s,e)=>client.from("beta_notices").select("*,beta_notice_reads(read_at)").eq("squad",me.squad).order("posted_at",{ascending:false}).order("id").range(s,e).throwOnError()),
    pages<WorkoutReview>((s,e)=>client.from("beta_workout_reviews").select("*").order("assignment").range(s,e).throwOnError()),
    me.role==="coach"?pages<FocusMember>((s,e)=>client.from("beta_focus_members").select("squad,athlete,focus").eq("squad",me.squad).order("focus").order("athlete").range(s,e).throwOnError()):[],
    me.role==="coach"?pages<Usage>((s,e)=>client.from("beta_exercise_usage").select("exercise_key,uses,last_used").eq("coach",me.id).order("exercise_key").range(s,e).throwOnError()):[],
    me.role==="coach"?pages<Member>((s,e)=>client.rpc("beta_team_roster",{team_id:me.squad}).order("id").range(s,e).throwOnError()):[me],
    me.role==="coach"?pages<Exercise>((s,e)=>client.from("beta_exercises").select("*").eq("squad",me.squad).order("id").range(s,e).throwOnError()):[],
    me.role==="coach"?pages<Program>((s,e)=>client.from("beta_programs").select("*").eq("squad",me.squad).order("id").range(s,e).throwOnError()):[],
    pages<Feedback>((s,e)=>client.from("beta_feedback").select("*").order("assignment").range(s,e).throwOnError()),
    pages<Assignment>((start,end)=>client.from("beta_assignments").select("*").eq("squad",me.squad).order("created_at").order("id").range(start,end).throwOnError()),
    pages<Check>((start,end)=>client.from("beta_checks").select("assignment,step").order("assignment").order("step").range(start,end).throwOnError())
  ]);
  const ids=new Set(plans.map(p=>p.id));
  return {me,teams,club,admins:club?.active?[...new Set([...admins,me.id])]:admins,notices:messages.map(({beta_notice_reads,...n})=>({...n,read_at:beta_notice_reads?.read_at||null})),reviews:reviews.filter(r=>ids.has(r.assignment)),focusMembers,usage,roster:members,plans,checks:checks.filter(c=>ids.has(c.assignment)),programs,feedback:feedback.filter(f=>ids.has(f.assignment)),library};
}
export async function postNotices(data:Snapshot,recipients:string[],cadence:Notice["cadence"],starts_on:string,body:string){
  const batch=crypto.randomUUID();
  const rows=[...new Set(recipients)].map(athlete=>({id:crypto.randomUUID(),batch,squad:data.me.squad,coach:data.me.id,athlete,cadence,starts_on,body:body.trim()}));
  if(!rows.length||!body.trim()||body.trim().length>2000)throw Error("Choose recipients and enter a message of up to 2,000 characters.");
  if(demo)localStorage.setItem(prefix+"notice:"+data.me.squad+":"+batch,JSON.stringify(rows.map(r=>({...r,posted_at:new Date().toISOString()}))));
  else await db!.from("beta_notices").insert(rows).throwOnError();
}
export async function acceptNotice(notice:string){
  if(demo){const key=prefix+"accepted:"+notice;if(!localStorage.getItem(key))localStorage.setItem(key,new Date().toISOString());}
  else {const {error}=await db!.from("beta_notice_reads").insert({notice});if(error&&error.code!=="23505")throw error;}
}
export async function saveReview(review:WorkoutReview,existing:boolean){
  if(demo)localStorage.setItem(prefix+"review:"+review.assignment,JSON.stringify([review]));
  else if(existing){const {assignment,...fields}=review;await db!.from("beta_workout_reviews").update(fields).eq("assignment",assignment).select("assignment").single().throwOnError();}
  else await db!.from("beta_workout_reviews").insert(review).throwOnError();
}
export async function toggleFocus(row:FocusMember,add:boolean){
  if(demo){
    const key=prefix+"focus:"+row.squad+":"+row.athlete+":"+row.focus;
    if(add)localStorage.setItem(key,JSON.stringify([row]));else localStorage.removeItem(key);
  }else if(add)await db!.from("beta_focus_members").insert(row).throwOnError();
  else await db!.from("beta_focus_members").delete().match(row).throwOnError();
}
export async function recordExerciseUse(coach:string,key:string){
  if(demo){
    const path=prefix+"uses:"+coach+":"+key;
    const previous:Usage|null=JSON.parse(localStorage.getItem(path)||"null");
    localStorage.setItem(path,JSON.stringify({exercise_key:key,uses:(previous?.uses||0)+1,last_used:new Date().toISOString()}));
  }else await db!.rpc("beta_used",{item:key}).throwOnError();
}
export async function createTeam(me:Member,name:string){
  let id:string=crypto.randomUUID();
  if(demo){
    localStorage.setItem(prefix+"team:"+id,JSON.stringify({id,name}));
    localStorage.setItem(prefix+"admins:"+id,JSON.stringify([me.id]));
    localStorage.setItem(prefix+"membership:"+me.id+id,JSON.stringify({id:me.id,team:id}));
  }else id=(await db!.rpc("beta_new_team",{label:name}).throwOnError()).data as string;
  // Creating a team only extends the coach's switcher; publishing stays in the active team.
}
export async function saveTeamDetails(id:string,name:string,logo:string){
  if(demo)localStorage.setItem(prefix+"team:"+id,JSON.stringify({...([seedTeam,...localRows<Team>("team:")].reverse().find(t=>t.id===id)),id,name,logo}));
  else await db!.from("beta_teams").update({name,logo}).eq("id",id).select("id").single().throwOnError();
}
function inviteAddresses(input:string){
  const addresses=Array.from(new Set(input.toLowerCase().split(/[\s,;]+/).filter(Boolean)));
  if(!addresses.length||addresses.length>100||addresses.some(e=>e.length>254||!/^\S+@[^@\s]+\.[^@\s]+$/.test(e)))throw Error("Enter up to 100 valid email addresses, separated by spaces, commas or new lines.");
  return addresses;
}
export async function emailInvites(team:string,input:string,role:Member["role"]){
  const addresses=inviteAddresses(input);
  const token=(await db!.auth.getSession()).data.session?.access_token;
  if(!token)throw Error("Sign in again to send invitations.");
  const res=await fetch("/api/invitations",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({team,addresses,role})});
  const payload=await res.json();
  if(!res.ok)throw Error(payload.error||"Could not send invitations.");
  return payload as {links:{email:string;url:string}[];accepted:boolean};
}
export async function inviteBatch(team:string,input:string,role:Member["role"]){
  const addresses=inviteAddresses(input);
  if(demo)return Promise.all(addresses.map(async email=>({email,url:await inviteMember(team,email,role)})));
  const records=(await db!.rpc("beta_bulk_invite",{team_id:team,addresses,member_role:role}).throwOnError()).data as {email:string;token:string}[];
  return records.map(r=>({email:r.email,url:clubLink("/login?new=1&invite="+encodeURIComponent(r.token),demo?location.origin:undefined)}));
}
export async function inviteMember(team:string,email:string,role:Member["role"]){
  let token:string=crypto.randomUUID();
  if(demo&&role==="coach"&&!demoAdmins(team).includes(sessionStorage.getItem("nhf-persona")||"coach"))throw Error("Admin coach required.");
  if(demo)localStorage.setItem(prefix+"invite:"+token,JSON.stringify({team,email,role,expires:Date.now()+7*86400000}));
  else token=(await db!.rpc("beta_invite",{team_id:team,address:email,member_role:role}).throwOnError()).data as string;
  return clubLink("/login?new=1&invite="+encodeURIComponent(token),demo?location.origin:undefined);
}
export function joinDemo(token:string,email:string,name:string){
  const invite=JSON.parse(localStorage.getItem(prefix+"invite:"+token)||"null");
  if(!invite||invite.expires<Date.now()||invite.email!==email)throw Error("This invitation needs its original email and browser, and expires after seven days.");
  const existing=demoMembers().find(m=>m.email===email);
  if(existing&&(existing.role!==invite.role||(existing.role==="athlete"&&existing.squad&&existing.squad!==invite.team)))throw Error("This account already has a different role or athlete team.");
  const member:Member=existing?{...existing,squad:existing.squad||invite.team}:{id:crypto.randomUUID(),email,name,role:invite.role,squad:invite.team};
  localStorage.setItem(prefix+"member:"+member.id,JSON.stringify(member));
  if(member.role==="coach")localStorage.setItem(prefix+"membership:"+member.id+invite.team,JSON.stringify({id:member.id,team:invite.team}));
  localStorage.removeItem(prefix+"invite:"+token);
  sessionStorage.setItem("nhf-persona",member.id);selectTeam(member.id,invite.team);
}
export function demoAccounts(){return demoMembers();}
export type Teammate={id:string;name:string;role:string;photo?:string;playing_position?:string};
export async function teamDirectory(team:string):Promise<Teammate[]>{
  if(demo){const links=localRows<{id:string;team:string}>("membership:");return demoMembers().filter(m=>m.squad===team||links.some(l=>l.id===m.id&&l.team===team)).map(m=>({id:m.id,name:m.name,role:m.role,photo:m.photo,playing_position:m.position}));}
  return (await db!.rpc("beta_directory",{target:team}).throwOnError()).data as Teammate[];
}
export type TeamMessage={id:string;team:string;athlete:string;sender:string;body:string;created_at:string};
export async function thread(team:string,athlete:string):Promise<TeamMessage[]>{
  if(demo)return localRows<TeamMessage>("msg:").filter(m=>m.team===team&&m.athlete===athlete).sort((a,b)=>a.created_at.localeCompare(b.created_at)).slice(-100);
  return ((await db!.from("beta_team_messages").select("*").match({team,athlete}).order("created_at",{ascending:false}).limit(100).throwOnError()).data as TeamMessage[]).reverse();
}
export async function sendTeamMessage(me:Member,athlete:string,body:string){
  if(demo){const id=crypto.randomUUID();localStorage.setItem(prefix+"msg:"+id,JSON.stringify({id,team:me.squad,athlete,sender:me.id,body,created_at:new Date().toISOString()}));}
  else await db!.from("beta_team_messages").insert({team:me.squad,athlete,body}).throwOnError();
}
export type Application={team:string;person:string;name:string;status:"Pending"|"Approved"|"Declined";role?:Member["role"];phone?:string;email?:string};
export function registerDemoAthlete(email:string,name:string){
  if(demoMembers().some(m=>m.email===email))throw Error("That demo account already exists. Sign in to continue.");
  const id=crypto.randomUUID();localStorage.setItem(prefix+"member:"+id,JSON.stringify({id,email,name,squad:"",role:"athlete"}));sessionStorage.setItem("nhf-persona",id);
}
export async function admissions(action:string,args:{target?:string;applicant?:string;value?:string;label?:string}={}){
  if(!demo){const {data}=await db!.rpc("beta_admit",{action,...args}).throwOnError();return data;}
  const me=demoMembers().find(m=>m.id===(sessionStorage.getItem("nhf-persona")||"coach"))!;
  const teams=[...new Map([seedTeam,...localRows<Team>("team:")].map(t=>[t.id,t])).values()];
  if(action==="list")return teams.filter(t=>t.discoverable);
  if(action==="rotate"||action==="review"){
    if(me.role!=="coach"||!(me.squad===args.target||localRows<{id:string;team:string}>("membership:").some(m=>m.id===me.id&&m.team===args.target)))throw Error("Coach access required.");
    if(action==="rotate"){const code=crypto.randomUUID().slice(0,6).toUpperCase();localStorage.setItem(prefix+"code:"+args.target,JSON.stringify({team:args.target,code,expires:Date.now()+604800000}));return code;}
    const key=prefix+"application:"+args.target+":"+args.applicant;
    const app:Application=JSON.parse(localStorage.getItem(key)||"null");
    if(!app||app.status!=="Pending")throw Error("Application already reviewed.");
    if(app.role==="coach"&&!demoAdmins(String(args.target)).includes(me.id))throw Error("Admin coach required.");
    if(args.value==="Approved"){
      const athlete=demoMembers().find(m=>m.id===app.person);
      if(!athlete||(athlete.squad&&(athlete.role!=="coach"||app.role!=="coach")))throw Error("Already belongs to another team or role.");
      localStorage.setItem(prefix+"member:"+athlete.id,JSON.stringify({...athlete,name:app.name,role:app.role||"athlete",squad:athlete.squad||app.team}));
      if(app.role==="coach")localStorage.setItem(prefix+"membership:"+athlete.id+app.team,JSON.stringify({id:athlete.id,team:app.team}));
    }
    localStorage.setItem(key,JSON.stringify({...app,status:args.value}));return true;
  }
  if(me.squad)throw Error("You already belong to a team.");
  if(action==="apply"){
    if(!teams.some(t=>t.id===args.target&&t.discoverable))throw Error("Team is private.");
    const key=prefix+"application:"+args.target+":"+me.id;if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({team:args.target,person:me.id,name:args.label,status:"Pending"}));return true;
  }
  const code=localRows<{team:string;code:string;expires:number}>("code:").find(c=>c.code===args.value?.trim().toUpperCase()&&c.expires>Date.now());
  if(!code)return "Invalid or expired code.";
  localStorage.setItem(prefix+"member:"+me.id,JSON.stringify({...me,name:args.label,squad:code.team}));return true;
}
export async function applications(team?:string):Promise<Application[]>{
  if(demo)return localRows<Application>("application:").filter(a=>team?a.team===team:a.person===sessionStorage.getItem("nhf-persona"));
  const q=db!.from("beta_applications").select("*");
  if(team)return (await q.eq("team",team).throwOnError()).data as Application[];
  const {data:{user}}=await db!.auth.getUser();
  return user?(await q.eq("person",user.id).throwOnError()).data as Application[]:[];
}
export async function changeStaff(data:Snapshot,member:Member,action:"remove"|"promote"|"demote"){
  const team=data.me.squad;
  if(!demo){await db!.rpc("beta_staff",{action,t:team,person:member.id}).throwOnError();return;}
  let admins=demoAdmins(team);
  if(member.role==="coach"&&!admins.includes(data.me.id))throw Error("Admin coach required.");
  if(action==="promote")admins=[...new Set([...admins,member.id])];
  else if(admins.includes(member.id)){if(admins.length===1)throw Error("Promote another admin coach first.");admins=admins.filter(id=>id!==member.id);}
  localStorage.setItem(prefix+"admins:"+team,JSON.stringify(admins));
  if(action!=="remove")return;
  localStorage.removeItem(prefix+"membership:"+member.id+team);
  if(member.squad===team){
    const other=localRows<{id:string;team:string}>("membership:").find(x=>x.id===member.id&&x.team!==team);
    localStorage.setItem(prefix+"member:"+member.id,JSON.stringify({...member,squad:other?.team||""}));
  }
  if(member.role==="athlete"){localStorage.removeItem(prefix+"code:"+team);for(const r of data.focusMembers.filter(r=>r.athlete===member.id))await toggleFocus(r,false);}
  localStorage.removeItem(prefix+"application:"+team+":"+member.id);
  for(const k of Object.keys(localStorage).filter(k=>k.startsWith(prefix+"invite:"))){const v=JSON.parse(localStorage.getItem(k)!);if(v.team===team&&v.email===member.email)localStorage.removeItem(k);}
}
type LinkRecord={token:string;expires:string;direct?:boolean};
export async function applicationLink(team:string,role:Member["role"],action:"get"|"issue"|"revoke"){
  if(!demo)return (await db!.rpc("beta_application_link",{action:action==="issue"?"issue_direct":action,t:team,member_role:role}).throwOnError()).data as LinkRecord|null;
  if(role==="coach"&&!demoAdmins(team).includes(sessionStorage.getItem("nhf-persona")||"coach"))throw Error("Admin coach required.");
  const key=prefix+"public-link:"+team+":"+role;
  if(action==="revoke")localStorage.removeItem(key);
  if(action==="issue")localStorage.setItem(key,JSON.stringify({token:crypto.randomUUID(),expires:new Date(Date.now()+90*86400000).toISOString(),team,role,direct:true}));
  const row=JSON.parse(localStorage.getItem(key)||"null");return row&&Date.parse(row.expires)>Date.now()?row as LinkRecord:null;
}
export type LinkInfo={id:string;name:string;role:Member["role"];direct?:boolean};
export async function linkInfo(code:string):Promise<LinkInfo|null>{
  if(!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(code))return null;
  if(!demo)return (await db!.rpc("beta_link_info",{code}).throwOnError()).data;
  const l=localRows<LinkRecord&{team:string;role:Member["role"]}>("public-link:").find(v=>v.token===code&&Date.parse(v.expires)>Date.now());
  const team=l&&[seedTeam,...localRows<Team>("team:")].reverse().find(t=>t.id===l.team);
  return team&&l?{id:team.id,name:team.name,role:l.role,direct:!!l.direct}:null;
}
export async function applyWithLink(code:string,name:string,phone:string,email:string){
  if(!demo){await db!.rpc("beta_application_link",{action:"submit",code,label:name,phone_number:phone}).throwOnError();return;}
  const info=await linkInfo(code);if(!info)throw Error("Invalid or expired link.");
  let me=demoMembers().find(m=>m.email===email);
  if(!me){registerDemoAthlete(email,name);me=demoMembers().find(m=>m.email===email)!;}
  if(me.squad&&(me.role!==info.role||me.role==="athlete"&&me.squad!==info.id))throw Error("Already belongs to this team or another role.");
  sessionStorage.setItem("nhf-persona",me.id);
  if(info.direct){localStorage.setItem(prefix+"member:"+me.id,JSON.stringify({...me,name,role:info.role,squad:me.squad||info.id}));if(info.role==="coach")localStorage.setItem(prefix+"membership:"+me.id+info.id,JSON.stringify({id:me.id,team:info.id}));}
  localStorage.setItem(prefix+"application:"+info.id+":"+me.id,JSON.stringify({team:info.id,person:me.id,role:info.role,status:info.direct?"Approved":"Pending",name,phone,email}));
}
export async function teamVisibility(team:Team,discoverable:boolean){
  if(demo)localStorage.setItem(prefix+"team:"+team.id,JSON.stringify({...team,discoverable}));
  else await db!.from("beta_teams").update({discoverable}).eq("id",team.id).select("id").single().throwOnError();
}
export async function saveProfile(me:Member,fields:Pick<Member,"name"|"bio"|"photo"|"position"|"shirt_number">){
  if(demo)localStorage.setItem(prefix+"member:"+me.id,JSON.stringify({...demoMembers().find(m=>m.id===me.id),...fields}));
  else await db!.from("beta_members").update(fields).eq("id",me.id).select("id").single().throwOnError();
}
export async function saveExercise(exercise:Exercise){
  if(demo)localStorage.setItem(prefix+"exercise:"+exercise.id,JSON.stringify([exercise]));
  else await db!.from("beta_exercises").insert(exercise).throwOnError();
}
export async function publish(rows: Assignment[]) {
  if(demo) localStorage.setItem(prefix+"plan:"+rows[0].id, JSON.stringify(rows));
  else await db!.from("beta_assignments").insert(rows).throwOnError();
}
export async function saveProgram(program:Program,existing:boolean) {
  if(demo) localStorage.setItem(prefix+"program:"+program.id,JSON.stringify([program]));
  else if(existing) await db!.from("beta_programs").update({name:program.name,sessions:program.sessions}).eq("id",program.id).select("id").single().throwOnError();
  else await db!.from("beta_programs").insert(program).throwOnError();
}
export async function rateSession(record:Feedback,existing:boolean) {
  if(demo) localStorage.setItem(prefix+"feedback:"+record.assignment,JSON.stringify([record]));
  else if(existing) await db!.from("beta_feedback").update({effort:record.effort}).eq("assignment",record.assignment).select("assignment").single().throwOnError();
  else await db!.from("beta_feedback").insert(record).throwOnError();
}
export async function checkExercise(assignment: string, step: number, checked=true) {
  if(!checked){
    if(demo) localStorage.removeItem(prefix+"check:"+assignment+":"+step);
    else await db!.from("beta_checks").delete().match({assignment,step}).throwOnError();
    return;
  }
  const record = {assignment,step};
  if(demo) localStorage.setItem(prefix+"check:"+assignment+":"+step,JSON.stringify([record]));
  else {
    const {error} = await db!.from("beta_checks").insert(record);
    if(error && error.code!=="23505") throw error;
  }
}
