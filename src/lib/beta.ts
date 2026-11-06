import { createSupabaseBrowserClient } from "./supabase/client";
import { env, hasSupabaseEnv } from "./env";
import type { Program, Feedback } from "./programs";
import type { Exercise, EventKind } from "./workload";

export type Team = {id:string;name:string};
export type Member = { id: string; squad: string; name: string; role: "coach" | "athlete";position?:string;bio?:string;photo?:string;email?:string };
export type Assignment = { id: string; athlete: string; squad: string; title: string; day: string; exercises: string[]; program_name?:string|null; kind?:EventKind; minutes?:number|null; start_time?:string|null;personal?:boolean };
export type Check = { assignment: string; step: number };
export type Usage = {exercise_key:string;uses:number;last_used:string};
export type Snapshot = { me: Member; teams:Team[]; roster: Member[]; plans: Assignment[]; checks: Check[]; programs:Program[]; feedback:Feedback[]; library:Exercise[]; usage:Usage[] };
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
const seedTeam:Team={id:"demo",name:"NHF Women · Senior squad"};
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
    const teams=[...allTeams.values()].filter(t=>t.id===identity.squad||memberships.some(m=>m.id===identity.id&&m.team===t.id));
    const me={...identity,squad:activeTeam(identity,teams)};
    if (!localStorage.getItem(prefix+"seed")) {
      localStorage.setItem(prefix+"plan:seed", JSON.stringify(roster.slice(1).map(r => ({
        id: "starter-"+r.id, squad: "demo", athlete:r.id, title:"Lower body power", day:today(),
        exercises:["Dynamic warm-up · 5 min","Squat · 4 x 8","Plank · 3 x 45 sec"]
      }))));
      localStorage.setItem(prefix+"seed","1");
    }
    const plans = localRows<Assignment>("plan:").filter(p => p.squad===me.squad&&(me.role==="coach" || p.athlete===me.id));
    return { me, teams,plans,usage:localRows<Usage>("uses:"+me.id+":"), roster:me.role==="coach"?members.filter(m=>m.squad===me.squad||memberships.some(x=>x.id===m.id&&x.team===me.squad)):[me], checks:localRows<Check>("check:").filter(c=>plans.some(p=>p.id===c.assignment)),
      library:me.role==="coach"?localRows<Exercise>("exercise:").filter(e=>e.squad===me.squad):[],programs:me.role==="coach"?localRows<Program>("program:").filter(p=>p.squad===me.squad):[], feedback:localRows<Feedback>("feedback:").filter(f=>plans.some(p=>p.id===f.assignment)) };
  }
  if (!db) throw Error("Set both public Supabase variables and rebuild.");
  const { data:{session},error } = await db.auth.getSession();
  if(error) throw error;
  if(!session) return null;
  const client=db;
  const identity = (await client.from("beta_members").select("*").eq("id",session.user.id).maybeSingle().throwOnError()).data as Member|null;
  if(!identity) throw Error("Open your team invitation to finish joining.");
  const teams=await pages<Team>((s,e)=>client.from("beta_teams").select("id,name").order("id").range(s,e).throwOnError());
  const me={...identity,squad:activeTeam(identity,teams)};
  const [usage,members,library,programs,feedback,plans,checks] = await Promise.all([
    me.role==="coach"?pages<Usage>((s,e)=>client.from("beta_exercise_usage").select("exercise_key,uses,last_used").eq("coach",me.id).order("exercise_key").range(s,e).throwOnError()):[],
    me.role==="coach"?pages<Member>((s,e)=>client.rpc("beta_team_roster",{team_id:me.squad}).order("id").range(s,e).throwOnError()):[me],
    me.role==="coach"?pages<Exercise>((s,e)=>client.from("beta_exercises").select("*").eq("squad",me.squad).order("id").range(s,e).throwOnError()):[],
    me.role==="coach"?pages<Program>((s,e)=>client.from("beta_programs").select("*").eq("squad",me.squad).order("id").range(s,e).throwOnError()):[],
    pages<Feedback>((s,e)=>client.from("beta_feedback").select("*").order("assignment").range(s,e).throwOnError()),
    pages<Assignment>((start,end)=>client.from("beta_assignments").select("*").eq("squad",me.squad).order("created_at").order("id").range(start,end).throwOnError()),
    pages<Check>((start,end)=>client.from("beta_checks").select("assignment,step").order("assignment").order("step").range(start,end).throwOnError())
  ]);
  const ids=new Set(plans.map(p=>p.id));
  return {me,teams,usage,roster:members,plans,checks:checks.filter(c=>ids.has(c.assignment)),programs,feedback:feedback.filter(f=>ids.has(f.assignment)),library};
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
    localStorage.setItem(prefix+"membership:"+me.id+id,JSON.stringify({id:me.id,team:id}));
  }else id=(await db!.rpc("beta_new_team",{label:name}).throwOnError()).data as string;
  selectTeam(me.id,id);
}
export async function renameTeam(id:string,name:string){
  if(demo)localStorage.setItem(prefix+"team:"+id,JSON.stringify({id,name}));
  else await db!.from("beta_teams").update({name}).eq("id",id).select("id").single().throwOnError();
}
export async function inviteMember(team:string,email:string,role:Member["role"]){
  let token:string=crypto.randomUUID();
  if(demo)localStorage.setItem(prefix+"invite:"+token,JSON.stringify({team,email,role,expires:Date.now()+7*86400000}));
  else token=(await db!.rpc("beta_invite",{team_id:team,address:email,member_role:role}).throwOnError()).data as string;
  return location.origin+"/login?invite="+token;
}
export function joinDemo(token:string,email:string,name:string){
  const invite=JSON.parse(localStorage.getItem(prefix+"invite:"+token)||"null");
  if(!invite||invite.expires<Date.now()||invite.email!==email)throw Error("This invitation needs its original email and browser, and expires after seven days.");
  const existing=demoMembers().find(m=>m.email===email);
  if(existing&&(existing.role!==invite.role||(existing.role==="athlete"&&existing.squad!==invite.team)))throw Error("This account already has a different role or athlete team.");
  const member:Member=existing||{id:crypto.randomUUID(),email,name,role:invite.role,squad:invite.team};
  localStorage.setItem(prefix+"member:"+member.id,JSON.stringify(member));
  if(member.role==="coach")localStorage.setItem(prefix+"membership:"+member.id+invite.team,JSON.stringify({id:member.id,team:invite.team}));
  localStorage.removeItem(prefix+"invite:"+token);
  sessionStorage.setItem("nhf-persona",member.id);selectTeam(member.id,invite.team);
}
export function demoAccounts(){return demoMembers();}
export async function saveProfile(me:Member,fields:Pick<Member,"name"|"bio"|"photo"|"position">){
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
