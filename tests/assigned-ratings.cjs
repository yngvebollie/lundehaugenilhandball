const assert=require("node:assert/strict"),{chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||"msedge"});try{
 const p=await browser.newPage({viewport:{width:375,height:812}}),base=process.env.BETA_TEST_URL||"http://127.0.0.1:3217";p.setDefaultTimeout(8000);
 await p.goto(base+"/login");await p.evaluate(()=>{sessionStorage.setItem("nhf-persona","liv");const day=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Oslo"}).format(new Date());
 localStorage.setItem("nhf-beta-v1:plan:rating-demo",JSON.stringify([{id:"p1",athlete:"liv",squad:"demo",title:"Styrke",day,kind:"Session",exercises:["Pushups","Planke"]},{id:"p2",athlete:"liv",squad:"demo",title:"Lagtrening",kind:"Practice",day,exercises:["Attended practice"]}]));
 localStorage.setItem("nhf-challenge-v1:list:demo",JSON.stringify([{id:"challenge",team:"demo",title:"Antall",starts:day,ends:day,unit:"reps",exercises:["Pushups","Planke"]}]));});
 const open=async name=>{await p.getByText("Vurder "+name,{exact:true}).click();return p.getByRole("group",{name:"Vurder "+name,exact:true})};
 const set=async(r,n)=>{await r.getByRole("button",{name:n+" av 5 stjerner"}).click();await r.getByText("Vurdering lagret.").waitFor();};
 await p.goto(base+"/athlete");await set(await open("Pushups"),5);await set(await open("Planke"),2);await set(await open("Lagtrening"),4);
 await p.reload();await (await open("Pushups")).getByRole("button",{name:"5 av 5 stjerner",pressed:true}).waitFor();await (await open("Planke")).getByRole("button",{name:"2 av 5 stjerner",pressed:true}).waitFor();
 assert.equal(await p.getByRole("checkbox",{checked:true}).count(),0);await p.getByRole("button",{name:"Utfordringer",exact:true}).click();const c=await open("Pushups");await c.getByText("Ikke vurdert").waitFor();await set(c,1);assert.equal(await p.evaluate(()=>localStorage.getItem("nhf-challenge-v1:challenge")),null);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));console.log("PASS: separate pushup/plank/practice/challenge ratings, reload, no attendance or reps changed.");
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
