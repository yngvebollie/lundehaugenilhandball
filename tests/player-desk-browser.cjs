const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{const b=await chromium.launch({channel:"msedge"});try{
 const base=process.env.BETA_TEST_URL||"http://127.0.0.1:3217",ctx=await b.newContext(),p=await ctx.newPage();
 await p.goto(base+"/login?role=coach");await p.getByRole("button",{name:"Sign in",exact:true}).click();await p.waitForURL(base+"/");await p.goto(base+"/#spillerplan");
 const player=p.locator(".desk-player").filter({has:p.getByRole("heading",{name:"Liv Berg"})});
 await player.getByRole("button",{name:"Legg til aktivitet",exact:true}).click();await player.getByLabel("Navn på aktivitet").fill("Ekstra skudd");await player.locator("form").getByLabel("Øvelser, én per linje").fill("Skudd fra kant");await player.getByRole("button",{name:"Legg til i spillerens plan"}).click();
 const row=player.locator("li").filter({hasText:"Ekstra skudd"});await row.locator("summary").click();await row.getByRole("textbox").fill("Skudd fra kant\nFotarbeid");await row.getByRole("button",{name:"Lagre øvelser"}).click();await row.getByRole("button",{name:"Lagre øvelser",disabled:true}).waitFor();
 await player.getByRole("button",{name:"Melding",exact:true}).click();await player.getByLabel("Message",{exact:true}).fill("Husk ballen");await player.getByRole("button",{name:"Send message"}).click();await player.getByText("Husk ballen",{exact:true}).waitFor();
 const a=await ctx.newPage();await a.goto(base+"/login?role=athlete");await a.getByRole("button",{name:"Sign in",exact:true}).click();await a.waitForURL(base+"/athlete");await a.getByRole("button",{name:"Messages",exact:true}).click();await a.getByText("Husk ballen",{exact:true}).waitFor();
 p.on("dialog",d=>d.accept());await player.getByRole("button",{name:"Trekk tilbake melding"}).click();await a.getByText("Husk ballen",{exact:true}).waitFor({state:"hidden"});await row.getByRole("button",{name:"Fjern aktivitet"}).click();await row.waitFor({state:"detached"});
 await player.getByRole("button",{name:"Trenerlogg"}).click();await player.getByText("Melding trukket tilbake",{exact:true}).waitFor();await player.getByText("Aktivitet fjernet",{exact:true}).waitFor();await player.getByText("Øvelser endret",{exact:true}).waitFor();
 await p.setViewportSize({width:360,height:800});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log("PASS: player roster, personal plan edits, athlete conversation, retraction, coach history, mobile width");
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
