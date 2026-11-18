const assert=require("node:assert/strict"),{join}=require("node:path"),{chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{const browser=await chromium.launch({channel:"msedge"});try{
 const p=await browser.newPage({viewport:{width:390,height:844}}),base=process.env.BETA_TEST_URL||"http://127.0.0.1:3322";p.setDefaultTimeout(7000);
 const shot=async(loc,n)=>{if(process.env.SKETCH_DIR)await loc.screenshot({path:join(process.env.SKETCH_DIR,n+".png")});};
 await p.goto(base+"/login");await p.evaluate(()=>{sessionStorage.setItem("nhf-persona","liv");localStorage.setItem("nhf-merker:liv",JSON.stringify({receive:true,eligible:[],inbox:[],moderate:[],counts:{hat_trick_hero:5},earned:[1,2].map(level=>({key:"hat_trick_hero",level,at:"2026-11-15",fixture:"example-played",match:"example-played",opponent:"Fjordvik",goals:5}))}));});
 await p.goto(base+"/athlete");await p.getByText("Gratulerer med sølv i Mange på rad!").waitFor();await shot(p.locator(".merit-feed"),"utover-feed");
 await p.getByRole("button",{name:"Registrer utført trening"}).click();const form=p.locator("form").filter({has:p.getByLabel("Finn øvelse")});
 await p.getByLabel("Finn øvelse").fill("pushups");await form.getByRole("button",{name:"Push-up · Styrke"}).waitFor();await shot(form,"utover-sok");await form.getByRole("button",{name:"Push-up · Styrke"}).click();
 await p.getByLabel("Sett 1 · rep",{exact:true}).fill("12");await p.getByRole("button",{name:"Kopier siste sett"}).click();assert.equal(await p.getByLabel("Sett 2 · rep",{exact:true}).inputValue(),"12");
 await p.getByRole("button",{name:"Kopier siste sett"}).click();await p.getByLabel("Sett 3 · rep",{exact:true}).fill("10");await shot(form,"utover-sett");
 await p.getByRole("button",{name:"Lagre i treningsloggen"}).click();await p.getByText("Push-up er lagt til i treningsloggen.").waitFor();await p.reload();await p.getByText("Push-up · 12 / 12 / 10 rep",{exact:true}).first().waitFor();
 await p.getByRole("link",{name:"Se merket",exact:true}).first().click();await p.getByText("Kamper som ga merket").waitFor();const card=p.locator("#merke-hat_trick_hero");await shot(card,"utover-merke");await card.getByRole("link",{name:/Fjordvik/}).click();
 await p.getByRole("heading",{name:"Mine kampstemmer"}).waitFor();await p.getByLabel("Lagspiller",{exact:true}).selectOption({index:1});await p.getByText("Stemmen er lagret.").waitFor();await shot(p.locator(".athlete-matches"),"utover-kamp");
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));console.log("PASS: mobile search, repeat sets, completed log, badge feed, match link and voting");
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
