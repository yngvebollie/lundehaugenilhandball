const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const m=new Module(file,module);cache.set(file,m);m.filename=file;m.paths=module.paths;m.require=p=>p.startsWith('@/')?load('src/'+p.slice(2)+'.ts'):require(p);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return m.exports;}
Object.assign(process.env,{NEXT_PUBLIC_SUPABASE_URL:'https://auth.example.test',NEXT_PUBLIC_SUPABASE_ANON_KEY:'test',SUPABASE_SERVICE_ROLE_KEY:'service'});
let address='parent@example.test',exists=false,creates=0;
global.fetch=async(input,opts={})=>{const u=new URL(String(input)),body=JSON.parse(opts.body);assert.equal(new Headers(opts.headers).get('apikey'),'service');
 if(u.pathname==='/rest/v1/rpc/beta_guardian_registration'){assert.equal(body.code.length,72);assert.match(body.bucket,/^[0-9a-f]{64}$/);return Response.json(address);}
 if(u.pathname==='/auth/v1/admin/users'){creates++;assert.equal(body.email,address);assert.equal(body.email_confirm,true);assert.equal(body.app_metadata.club_login,'guardian');assert.equal(body.user_metadata.full_name,'Test Parent');return exists?Response.json({msg:'already registered'},{status:422}):Response.json({id:'parent',email:address});}
 throw Error('Unexpected request '+u.pathname);
};
const {POST}=load('app/api/guardians/register/route.ts');
const call=(overrides={})=>POST(new Request('https://app.example/api/guardians/register',{method:'POST',headers:{'x-vercel-forwarded-for':'127.0.0.1'},body:JSON.stringify({code:'a'.repeat(72),name:'Test Parent',password:'Only-a-local-test-123',email:'parent@example.test',...overrides})}));
(async()=>{
 assert.equal((await call({password:'short'})).status,400);assert.equal(creates,0);
 assert.equal((await call({email:'stranger@example.test'})).status,400);assert.equal(creates,0);
 address=null;assert.equal((await call()).status,400);assert.equal(creates,0);
 address='parent@example.test';assert.equal((await call()).status,200);assert.equal(creates,1);
 exists=true;const existing=await call();assert.equal(existing.status,400);assert.match((await existing.json()).error,/Ingen eksisterende konto er endret/);
 delete process.env.SUPABASE_SERVICE_ROLE_KEY;assert.equal((await call()).status,503);assert.equal(creates,2);
 console.log('PASS: guardian signup validates invitation/email, hashes throttle key, creates separate identity, never resets existing accounts, rejects missing server config');
})().catch(e=>{console.error(e);process.exitCode=1;});
