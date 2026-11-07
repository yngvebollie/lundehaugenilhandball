// Run after a demo build, with all outbound transports mocked.
const assert=require("node:assert/strict");
Object.assign(process.env,{NEXT_PUBLIC_SUPABASE_URL:"https://auth.example.test",NEXT_PUBLIC_SUPABASE_ANON_KEY:"test",APP_ORIGIN:"https://app.lundehaugenil.no",RESEND_API_KEY:"test",INVITE_FROM:"noreply@lundehaugenil.no"});
let allowed=false,accepted=true,calls=0;
global.fetch=async(url,opts)=>{
  const path=new URL(url.toString()).pathname;
  if(path==="/auth/v1/user")return Response.json({id:"test",aud:"authenticated"});
  if(path==="/rest/v1/rpc/beta_bulk_invite")return allowed?Response.json([{email:"one@example.test",token:"first"},{email:"two@example.test",token:"second"}]):Response.json({message:"Coach access required"},{status:403});
  assert.equal(url.toString(),"https://api.resend.com/emails/batch");
  const items=JSON.parse(opts.body);assert.equal(items.length,2);
  for(const [i,m] of items.entries()){
    assert.equal(m.from,process.env.INVITE_FROM);assert.equal(m.to.length,1);assert.match(m.text,/https:\/\/app\.lundehaugenil\.no\/login\?new=1&invite=/);
    assert.ok(!m.text.includes(i?"first":"second"));
  }
  calls++;return Response.json(accepted?{data:[]}:{error:"rejected"},{status:accepted?200:422});
};
const {POST}=require("../.next/server/app/api/invitations/route.js").routeModule.userland;
const call=(authenticated=true)=>POST(new Request("https://untrusted-host.example/api/invitations",{method:"POST",headers:authenticated?{Authorization:"Bearer fake"}:{},body:JSON.stringify({role:"athlete",team:"demo",addresses:["one@example.test","two@example.test"]})}));
(async()=>{
  assert.equal((await call(false)).status,401);assert.equal((await call()).status,403);assert.equal(calls,0);
  allowed=true;const success=await (await call()).json();assert.equal(success.accepted,true);assert.equal(success.links.length,2);
  accepted=false;const failure=await (await call()).json();assert.equal(failure.accepted,false);assert.equal(failure.links.length,2);
  delete process.env.RESEND_API_KEY;assert.equal((await call()).status,503);assert.equal(calls,2);
  console.log("PASS: coach-only recipient-bound mail, trusted signup origin, fallback links and missing configuration.");
})().catch(e=>{console.error(e);process.exitCode=1;});
