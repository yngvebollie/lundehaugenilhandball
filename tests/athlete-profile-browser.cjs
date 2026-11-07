const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{const b=await chromium.launch({channel:process.env.BROWSER_CHANNEL||"msedge"});try{
 const ctx=await b.newContext({viewport:{width:390,height:844}}),p=await ctx.newPage(),base=process.env.BETA_TEST_URL||"http://127.0.0.1:3217";p.setDefaultTimeout(9000);
 await p.goto(base+"/login?role=coach");await p.getByRole("button",{name:"Sign in",exact:true}).click();await p.waitForURL(base+"/");
 await p.getByRole("heading",{name:/Neste kamp per spillelag/}).waitFor();await p.getByRole("heading",{name:"Utøveraktivitet"}).waitFor();assert.equal(await p.locator("#builder").count(),0);
 await p.goto(base+"/team");await p.getByRole("button",{name:"Kode",exact:true}).click();await p.getByRole("button",{name:"Opprett utøverkode"}).click();
 const code=await p.getByLabel("Aktiv kode").inputValue(),a=await ctx.newPage();await a.goto(base+"/apply?athlete_code="+code);
 await a.getByRole("heading",{name:"Bli med som utøver"}).waitFor();await a.getByLabel("Fullt navn").fill("Test Player");await a.getByLabel("Telefonnummer").fill("12345678");
 await a.getByLabel("Draktnummer (valgfritt)").fill("28");await a.getByLabel("E-post",{exact:true}).fill("test-athlete@example.invalid");
 await a.getByRole("button",{name:"Bli med på laget"}).click();await a.getByRole("heading",{name:"Du er med på laget!"}).waitFor();await a.getByRole("button",{name:"Åpne laget"}).click();await a.waitForURL(base+"/athlete");
 await a.getByRole("button",{name:"Profile",exact:true}).click();assert.equal(await a.getByLabel("Draktnummer",{exact:true}).inputValue(),"28");
 await p.goto(base+"/spillerstats");await p.getByRole("button",{name:/Test Player/}).click();await p.getByRole("link",{name:"Åpne utøverprofil"}).click();
 await p.getByRole("heading",{name:"#28 Test Player"}).waitFor();await p.getByRole("heading",{name:"Treningshistorikk"}).waitFor();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log("PASS: mobile athlete invite, jersey persistence, coach dashboard, cross-level menu and individual athlete profile.");
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
