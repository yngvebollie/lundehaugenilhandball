const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{const b=await chromium.launch({channel:process.env.BROWSER_CHANNEL||"msedge"});try{
 const p=await b.newPage({viewport:{width:390,height:844}}),base=process.env.BETA_TEST_URL||"http://127.0.0.1:3217";
 await p.goto(base+"/login?role=coach");await p.getByRole("button",{name:"Sign in",exact:true}).click();await p.waitForURL(base+"/");await p.goto(base+"/team");
 await p.getByLabel("Rolle i laget").selectOption("coach");await p.getByRole("button",{name:"Kode",exact:true}).click();
 await p.getByRole("button",{name:"Opprett trenerkode"}).click();const code=await p.getByLabel("Aktiv kode").inputValue();assert.match(code,/^[A-Z0-9]{6}$/);
 await p.goto(base+"/apply?coach_code="+code);await p.getByLabel("Fullt navn").fill("Test Trener");await p.getByLabel("Telefonnummer").fill("12345678");await p.getByLabel("E-post",{exact:true}).fill("test-coach@example.invalid");
 await p.getByRole("button",{name:"Bli med på laget"}).click();await p.getByRole("heading",{name:"Du er med på laget!"}).waitFor();
 await p.getByRole("button",{name:"Åpne laget"}).click();await p.waitForURL(base+"/");await p.getByRole("navigation",{name:"Trenervalg"}).waitFor({timeout:8000}).catch(async e=>{throw Error(e.message+" "+(await p.locator("body").innerText()).slice(0,600));});
 console.log("PASS: mobile team invites, six-character coach code, registration and team dashboard");
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
