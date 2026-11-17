const assert=require("node:assert/strict"),{chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright"),{join}=require("node:path");
(async()=>{const b=await chromium.launch({channel:"msedge"});try{
 const p=await b.newPage({viewport:{width:390,height:844}}),base=process.env.BETA_TEST_URL||"http://127.0.0.1:3325";
 await p.goto(base+"/login");await p.evaluate(()=>{sessionStorage.setItem("nhf-persona","liv");const fixture="nhf-8432765";
 localStorage.setItem("nhf-merker:liv",JSON.stringify({counts:{hat_trick_hero:5},earned:[1,2].map(level=>({key:"hat_trick_hero",level,at:"2026-11-15",fixture,match:fixture,goals:5,opponent:"Fjordvik"})),receive:true,eligible:[],inbox:[],moderate:[]}));
 });
 await p.evaluate(()=>{
   const seed=(id,athlete,squad,exercise,reps,complete=true)=>{const p={id,athlete,squad,title:id,day:"2024-09-01",start_time:"18:30",exercises:["Push-up"],logged_sets:[{id:exercise,name:"Push-up",unit:"rep",sets:reps}]};localStorage.setItem("nhf-beta-v1:plan:"+id,JSON.stringify([p]));if(complete)localStorage.setItem("nhf-beta-v1:check:"+id+":0",JSON.stringify({assignment:id,step:0}));};
   seed("tidligere","liv","demo","strength:push-up",[8,7]);seed("annen spiller","ida","demo","strength:push-up",[99]);seed("annet lag","liv","other","strength:push-up",[77]);seed("likt navn","liv","demo","custom:push-up",[66]);seed("planlagt","liv","demo","strength:push-up",[55],false);
 });
 await p.goto(base+"/athlete");await p.getByRole("button",{name:"Registrer utført trening"}).click();await p.getByLabel("Finn øvelse").fill("pushups");
 await p.getByRole("button",{name:"Detaljer",exact:true}).click();const dialog=p.getByRole("dialog");
 await dialog.getByText("Muskelgrupper").waitFor();await dialog.getByText("Første registrering.",{exact:false}).waitFor();assert.equal(await dialog.locator('svg.body-diagram g[fill="#fa4b48"]').count(),3);await p.keyboard.press("Escape");
 await p.getByRole("button",{name:"Push-up · Styrke"}).click();await p.getByLabel("Øktnavn").fill("Test styrkelogg");await p.getByLabel("Sett 1 · rep",{exact:true}).fill("12");await p.getByRole("button",{name:"Kopier siste sett"}).click();await p.getByLabel("Sett 2 · rep",{exact:true}).fill("10");await p.getByRole("button",{name:"Lagre i treningsloggen"}).click();
 const feed=p.locator(".merit-feed");await feed.locator("summary").filter({hasText:"Test styrkelogg"}).click();await feed.getByRole("list",{name:"Sett for Push-up"}).waitFor();
 assert.deepEqual(await feed.locator("details[open] .feed-sets li").allTextContents(),["Sett 112 rep","Sett 210 rep"]);
 await p.evaluate(()=>sessionStorage.setItem("nhf-persona","coach"));await p.goto(base+"/spillere?athlete=liv");
 await feed.getByRole("heading",{name:"Spillerens høydepunkter"}).waitFor();await feed.locator("summary").filter({hasText:"Test styrkelogg"}).click();
 assert.deepEqual(await feed.locator("details[open] .feed-sets li").allTextContents(),["Sett 112 rep","Sett 210 rep"]);
 await feed.getByRole("button",{name:"Push-up",exact:true}).click();await dialog.getByText("Bryst · Armer").waitFor();
 const history=dialog.getByRole("region",{name:"Øvelseshistorikk"});await history.getByText("7 flere enn i forrige økt.",{exact:false}).waitFor();assert.equal(await history.locator("tbody tr").count(),2);assert.deepEqual(await history.locator("tbody tr td:nth-child(2)").allTextContents(),["12 / 10","8 / 7"]);assert.deepEqual(await history.locator("tbody tr td:last-child").allTextContents(),["22","15"]);assert.equal(await history.locator("time").last().getAttribute("datetime"),"2024-09-01");assert.equal(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
 if(process.env.SKETCH_DIR)await dialog.screenshot({path:join(process.env.SKETCH_DIR,"spiller-muskelkart.png")});
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await dialog.getByRole("button",{name:"Lukk øvelsesinformasjon"}).click();
 if(process.env.SKETCH_DIR)await feed.screenshot({path:join(process.env.SKETCH_DIR,"spiller-trenerfeed.png")});
 const award=feed.getByRole("link",{name:"Sølv i Mange på rad"});assert.equal(await award.getAttribute("href"),"/match?game=nhf-8432765");await award.click();await p.waitForURL("**/match?game=nhf-8432765");await p.getByRole("navigation",{name:"Kampdetaljer"}).waitFor();
 await p.goto(base+"/spillere?athlete=ida");await feed.getByRole("heading",{name:"Spillerens høydepunkter"}).waitFor();assert.equal(await feed.getByText("Test styrkelogg",{exact:false}).count(),0);assert.equal(await feed.getByText("Fjordvik",{exact:false}).count(),0);
 console.log("PASS: shared athlete/coach log, structured sets, clickable medal, red muscle map, separate player profiles and mobile layout");
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1;});
