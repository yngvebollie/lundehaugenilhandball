const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const m=new Module(file,module);cache.set(file,m);m.filename=file;m.paths=module.paths;m.require=p=>p.startsWith('@/')?load('src/'+p.slice(2)+'.ts'):require(p);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return m.exports;}
Object.assign(process.env,{NEXT_PUBLIC_SUPABASE_URL:'https://auth.example.test',NEXT_PUBLIC_SUPABASE_ANON_KEY:'test',SUPABASE_SERVICE_ROLE_KEY:'service',RESEND_API_KEY:'sending',RESEND_READ_API_KEY:'reading',APP_ORIGIN:'https://app.lundehaugenil.no'});
const team='00000000-0000-4000-8000-000000000010',pid='00000000-0000-4000-8000-000000000020';
let rows=[],allowed=true,reads=0,sends=0,sendCode=200,event='sent',lookupCode=200,omitId=false,timeout=false,writeFail=false,recipient='one@example.test',role='athlete';
global.fetch=async(input,opts={})=>{
 const u=new URL(String(input)),method=opts.method||'GET';
 if(u.pathname==='/auth/v1/user')return Response.json({id:'00000000-0000-4000-8000-000000000001',aud:'authenticated'});
 if(u.pathname==='/rest/v1/rpc/beta_bulk_invite')return allowed?Response.json([{email:'one@example.test',token:'personal-token'}]):Response.json({message:'denied'},{status:403});
 if(u.pathname==='/rest/v1/rpc/beta_guardian_invite')return allowed?Response.json({email:'one@example.test',token:'personal-token',child:'Test Child'}):Response.json({message:'denied'},{status:403});
 if(u.pathname==='/rest/v1/beta_invitation_deliveries'){
  if(method==='GET')return Response.json(allowed?structuredClone(rows):[]);
  assert.equal(new Headers(opts.headers).get('apikey'),'service');
  if(writeFail)return Response.json({message:'database unavailable'},{status:503});
  const body=JSON.parse(opts.body);
  if(method==='POST'){rows=body.map(r=>({...r,created_at:new Date().toISOString(),checked_at:null,check_error:null}));return new Response(null,{status:201});}
  if(method==='PATCH'){Object.assign(rows[0],body);return Response.json([{id:rows[0].id}]);}
 }
 if(u.pathname==='/emails/batch'){
  sends++;if(timeout)throw Error('timeout');
  const mail=JSON.parse(opts.body);assert.equal(mail[0].from,'noreply@lundehaugenil.no');assert.deepEqual(mail[0].to,['one@example.test']);assert.ok(mail[0].text.includes('https://app.lundehaugenil.no/'+(role==='guardian'?'foresatt?invite=personal-token':'login?new=1&role=athlete&invite=personal-token')));if(role==='guardian')assert.match(mail[0].text,/foresatt for Test Child/);
  return Response.json(sendCode===200?{data:omitId?[]:[{id:pid}]}:{name:'validation_error',message:'private raw provider error'}, {status:sendCode});
 }
 if(u.pathname==='/emails/'+pid){reads++;return Response.json(lookupCode===200?{id:pid,to:[recipient],from:'noreply@lundehaugenil.no',last_event:event}:{message:'private provider error'},{status:lookupCode});}
 throw Error('Unexpected '+method+' '+u);
};
const {POST}=load('app/api/invitations/route.ts'),{GET}=load('app/api/invitations/status/route.ts');
const send=(auth=true)=>POST(new Request('https://untrusted.example/api/invitations',{method:'POST',headers:auth?{Authorization:'Bearer fake'}:{},body:JSON.stringify({role,team,child:'Test Child',athlete:pid,addresses:['one@example.test']})}));
const get=()=>GET(new Request('https://app.example/api/invitations/status?team='+team,{headers:{Authorization:'Bearer fake'}}));
const stale=()=>{rows[0].checked_at=null;};
(async()=>{
 assert.equal((await send(false)).status,401);allowed=false;assert.equal((await send()).status,403);assert.equal(sends,0);allowed=true;
 assert.equal((await (await send()).json()).accepted,true);assert.equal(rows[0].status,'queued');assert.equal(rows[0].provider_id,pid);
 await get();assert.equal(rows[0].status,'sent');const n=reads;await get();assert.equal(reads,n,'cached checks must not hit provider');
 for(const [ev,want] of [['delivered','delivered'],['delivery_delayed','delivery_delayed'],['bounced','bounced'],['failed','failed'],['suppressed','suppressed'],['complained','complained'],['opened','delivered'],['novel-event','unknown']]){event=ev;stale();await get();assert.equal(rows[0].status,want);}
 event='sent';stale();await get();lookupCode=403;stale();const unread=await (await get()).json();assert.equal(rows[0].status,'sent');assert.equal(rows[0].check_error,'read_permission');assert.match(unread.warning,/Full access/);lookupCode=200;
 recipient='wrong@example.test';stale();await get();assert.equal(rows[0].check_error,'receipt_mismatch');assert.equal(rows[0].status,'sent');recipient='one@example.test';
 allowed=false;const before=reads;assert.deepEqual((await (await get()).json()).deliveries,[]);assert.equal(reads,before);allowed=true;
 for(const code of [401,403,422,429,500]){sendCode=code;await send();assert.equal(rows[0].status,code>=500?'unknown':'failed');assert.ok(rows[0].error_code);}
 sendCode=200;omitId=true;await send();assert.equal(rows[0].status,'unknown');assert.equal(rows[0].error_code,'missing_receipt');omitId=false;
 timeout=true;await send();assert.equal(rows[0].error_code,'timeout');timeout=false;
 role='guardian';await send();assert.equal(rows[0].member_role,'guardian');assert.equal(rows[0].provider_id,pid);role='athlete';
 writeFail=true;const count=sends;assert.match((await (await send()).json()).reason,/Ingen e-post/);assert.equal(sends,count);writeFail=false;
 delete process.env.SUPABASE_SERVICE_ROLE_KEY;const untracked=await (await send()).json();assert.equal(untracked.accepted,true);assert.match(untracked.reason,/levering er ikke bekreftet/);assert.match(untracked.reason,/SUPABASE_SERVICE_ROLE_KEY/);assert.equal(sends,count+1);
 sendCode=403;const denied=await (await send()).json();assert.equal(denied.accepted,false);assert.match(denied.reason,/avviste tilgangen/);
 delete process.env.RESEND_API_KEY;assert.equal((await send()).status,503);assert.equal(sends,count+2);
 console.log('PASS: durable provider IDs, authoritative delivery states, failures/timeouts, read permission, receipt mismatch, throttling, role isolation, fail-before-send storage/config errors');
})().catch(e=>{console.error(e);process.exitCode=1;});
