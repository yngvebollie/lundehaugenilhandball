const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{const b=await chromium.launch({channel:process.env.BROWSER_CHANNEL||"msedge"});try{
 const p=await b.newPage({viewport:{width:1024,height:768}}),base=process.env.BETA_TEST_URL||"http://127.0.0.1:3217";p.setDefaultTimeout(10000);
 await p.goto(base+"/login?role=coach");await p.getByRole("button",{name:"Sign in",exact:true}).click();await p.waitForURL(base+"/");
 await p.getByRole("link",{name:"Liveanalyse",exact:true}).click();
 const matchSelect=p.getByRole("combobox",{name:"Kamp",exact:true});await matchSelect.waitFor();const alternative=await matchSelect.locator("option").first().getAttribute("value");await matchSelect.selectOption(alternative);await p.reload();await matchSelect.locator("option").first().waitFor({state:"attached"});assert.equal(await matchSelect.inputValue(),alternative);
 const zone=p.getByRole("button",{name:"Treffpunkt: Oppe venstre"});assert.equal(await zone.isDisabled(),true);
 await p.getByLabel("Aktiv keeper").fill("#1 Testkeeper");await p.getByRole("button",{name:"Start kampen",exact:true}).click();await zone.click();
 await p.getByRole("status").filter({hasText:"Redning registrert"}).waitFor();
 await p.getByRole("button",{name:"Baklengsmål",exact:true}).click();await p.getByRole("button",{name:"Treffpunkt: Nede høyre"}).click();await p.getByRole("status").filter({hasText:"Mål registrert"}).waitFor();
 await p.reload();await p.getByText("50 %",{exact:true}).waitFor();assert.equal(await p.getByLabel("Aktiv keeper").inputValue(),"#1 Testkeeper");
 await p.getByRole("button",{name:"Pause klokka"}).click();await p.getByRole("button",{name:"Fortsett",exact:true}).waitFor();assert.equal(await zone.isDisabled(),true);
 const paused=await p.locator(".live-clock h2").innerText();await p.waitForTimeout(1150);assert.equal(await p.locator(".live-clock h2").innerText(),paused);
 await p.getByRole("button",{name:"Start 2. omgang"}).click();await p.getByText("2. omgang · Pågår").waitFor();await p.getByLabel("Aktiv keeper").fill("#12 Andrekeeper");await p.getByRole("button",{name:"Redning",exact:true}).click();await zone.click();await p.getByText("100 %",{exact:true}).waitFor();
 await p.getByRole("button",{name:"Angrep",exact:true}).click();await p.getByLabel("Skytter / spiller").fill("Testskytter");await p.getByLabel("Assist (valgfritt)").fill("Testassist");await zone.click();
 await p.getByRole("button",{name:"Oversikt",exact:true}).click();await p.getByRole("row",{name:/Testskytter/}).waitFor();await p.getByRole("row",{name:/Testassist/}).waitFor();
 await p.getByRole("button",{name:/Angre siste hendelse/}).click();await p.getByText("Siste hendelse angret.").waitFor();assert.equal(await p.getByRole("row",{name:/Testskytter/}).count(),0);
 await p.getByRole("button",{name:"Keeper",exact:true}).click();
 for(const width of [1024,390]){await p.setViewportSize({width,height:768});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await p.setViewportSize({width:1024,height:850});if(process.env.UI_QA_DIR)await p.locator(".live-layout").screenshot({path:require("path").join(process.env.UI_QA_DIR,"liveanalyse-keeper.png")});
 await p.getByRole("button",{name:"Avslutt",exact:true}).click();await p.getByRole("button",{name:"Avslutt kampen"}).click();await p.getByText("2. omgang · Avsluttet").waitFor();assert.equal(await zone.isDisabled(),true);
 await p.getByRole("button",{name:"Sesonganalyse"}).click();await p.getByText("1 kamp med egen registrering").waitFor();assert.equal(await p.getByRole("row",{name:/Testkeeper/}).count(),1);
 console.log("PASS: tablet keeper target, accuracy, second keeper, pause, period, reload, attack, assist, undo, finish, scoped season and mobile layout.");
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
