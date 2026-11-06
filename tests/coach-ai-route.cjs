// Run after a demo production build. Replace both transports before loading the route.
const assert=require("node:assert/strict");
process.env.NEXT_PUBLIC_SUPABASE_URL="https://auth.example.test";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY="test-public-key";
process.env.OPENAI_API_KEY="test-server-key";
let role="athlete", upstreamCalls=0, upstreamText='{"text":"Squat 3 x 8"}';
global.fetch=async(resource,options)=>{
  const url=new URL(typeof resource==="string"?resource:resource.url||resource.toString());
  if(url.origin==="https://auth.example.test"&&url.pathname==="/auth/v1/user")return Response.json({id:"test-user",aud:"authenticated",email:"coach@example.test"});
  if(url.origin==="https://auth.example.test"&&url.pathname==="/rest/v1/beta_members")return Response.json([{role}]);
  assert.equal(url.href,"https://api.openai.com/v1/responses");
  upstreamCalls++;
  const request=JSON.parse(options.body);
  assert.equal(request.store,false);
  assert.equal(request.text.format.strict,true);
  assert.equal(request.input,"Squat 3x8");
  return Response.json({status:"completed",output:[{type:"message",content:[{type:"output_text",text:upstreamText}]}]});
};
const {POST}=require("../.next/server/app/api/coach-ai/route.js").routeModule.userland;
const call=(bearer=true)=>POST(new Request("http://localhost/api/coach-ai",{method:"POST",headers:bearer?{Authorization:"Bearer test-access-token"}:{},body:JSON.stringify({mode:"rewrite",prompt:"Squat 3x8"})}));
(async()=>{
  assert.equal((await call(false)).status,401);
  assert.equal((await call()).status,403);
  assert.equal(upstreamCalls,0);
  role="coach";
  const result=await call();
  assert.equal(result.status,200,JSON.stringify(await result.clone().json()));
  assert.deepEqual(await result.json(),{mode:"rewrite",text:"Squat 3 x 8"});
  upstreamText="broken reply";
  assert.equal((await call()).status,502);
  delete process.env.OPENAI_API_KEY;
  assert.equal((await call()).status,503);
  console.log("PASS: server checks coach identity, sends structured request and handles success, malformed reply and missing key (mock transports).");
})().catch(e=>{console.error(e);process.exitCode=1;});
