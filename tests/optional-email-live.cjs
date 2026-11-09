// Read-only live UI smoke. Intercept signup before it can write to production.
const assert=require("node:assert/strict"),{chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{
 const base="https://app.lundehaugenil.no",b=await chromium.launch({channel:"msedge"});
 try{
  const c=await b.newContext({viewport:{width:390,height:844}}),p=await c.newPage();
  let body;await c.route("**/functions/v1/player-access",async r=>{body=r.request().postDataJSON();await r.fulfill({status:400,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify({error:"Test stoppet før lagring."})});});
  for(const path of ["/login?role=athlete&register=1","/apply?athlete_code=QATEST"]){
   body=null;await p.goto(base+path);const email=p.getByLabel("E-post (valgfritt)");await email.waitFor();assert.equal(await email.evaluate(el=>el.required),false);
   await p.getByLabel("Fornavn").fill("Test");await p.getByLabel("Etternavn").fill("Spiller");
   await p.getByLabel(/Phone number|Telefonnummer/i).fill("12345678");await p.getByLabel(/^(Password|Passord)$/).fill("Sample-only-not-an-account");
   await p.getByRole("button",{name:/Continue to team selection|Opprett konto/}).click();await p.getByText("Test stoppet før lagring.").waitFor();assert.equal(body.email,"");assert.equal(body.phone,"12345678");
  }
  await p.goto(base+"/login?role=athlete");await p.getByLabel("Telefonnummer eller e-post").fill("12345678");assert.equal(await p.getByLabel("Telefonnummer eller e-post").evaluate(el=>el.validity.valid),true);
  await p.goto(base+"/login?role=coach");assert.equal(await p.getByLabel("Email",{exact:true}).evaluate(el=>el.required),true);
  console.log("PASS: live 390px signup and team-code forms submit blank email; athlete sign-in accepts phone; coach requires email. No writes.");
 }finally{await b.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
