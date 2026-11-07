const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{const b=await chromium.launch({channel:process.env.BROWSER_CHANNEL||"msedge"});try{
 const ctx=await b.newContext(),p=await ctx.newPage(),base=process.env.BETA_TEST_URL||"http://127.0.0.1:3217";p.setDefaultTimeout(9000);
 await p.goto(base+"/login?role=coach");await p.getByRole("button",{name:"Sign in",exact:true}).click();await p.waitForURL(base+"/");await p.goto(base+"/merker");
 await p.getByLabel(/^Utøver/).selectOption("liv");await p.getByText("Trenerregistrering",{exact:true}).click();
 await p.getByLabel("Oppnådd BEEP-nivå").fill("8");await p.getByRole("button",{name:"Lagre måling"}).click();await p.getByText("Registreringen er lagret.").waitFor();
 const a=await ctx.newPage();await a.setViewportSize({width:390,height:844});await a.goto(base+"/login?role=athlete");await a.getByLabel("Demo account").selectOption("liv");await a.getByRole("button",{name:"Sign in",exact:true}).click();await a.waitForURL(base+"/athlete");await a.goto(base+"/merker");
 await a.locator(".merke-item").first().waitFor();assert.equal(await a.locator(".merke-item").count(),45);
 await a.getByRole("button",{name:"Tester",exact:true}).click();assert.equal(await a.locator(".merke-item").count(),2);
 await a.getByRole("button",{name:/BEEP.*Nivå 8/}).click();assert.equal(await a.locator(".merke-detail li").count(),11);
 await a.getByRole("button",{name:/KMT.*Låst/}).click();assert.equal(await a.locator(".merke-detail li").count(),13);
 await a.getByText("Anerkjennelser etter kamp",{exact:true}).click();assert.ok(!(await a.getByLabel("Vis mitt navn til den som mottar anerkjennelsen").isChecked()));
 for(const w of [390,768,1440]){await a.setViewportSize({width:w,height:900});assert.ok(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 if(process.env.UI_QA_DIR){await a.getByRole("button",{name:"Trening",exact:true}).click();await a.screenshot({path:process.env.UI_QA_DIR+"/merker-desktop.png"});await a.setViewportSize({width:390,height:844});await a.getByRole("button",{name:"Tester",exact:true}).click();await a.screenshot({path:process.env.UI_QA_DIR+"/merker-mobile.png"});}
 console.log("PASS: coach records BEEP, athlete sees 45 badges, all BEEP/KMT levels and privacy defaults on mobile and desktop.");
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
