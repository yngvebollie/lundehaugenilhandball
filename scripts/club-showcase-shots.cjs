// Isolated demo only. Never point this capture at a connected team.
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright"),fs=require("fs"),path=require("path");
(async()=>{const base="http://127.0.0.1:3217",dir=path.resolve("public/handballplattformen"),b=await chromium.launch({channel:"msedge"});
 try{fs.mkdirSync(dir,{recursive:true});const ctx=await b.newContext({viewport:{width:1360,height:880}}),p=await ctx.newPage();p.setDefaultTimeout(12000);
 await p.goto(base+"/login?role=coach");await p.getByText("Browser-local demo").waitFor();await p.getByRole("button",{name:"Sign in",exact:true}).click();await p.waitForURL(base+"/");
 await p.goto(base+"/okter");await p.getByRole("button",{name:"Lag økt automatisk"}).click();await p.getByLabel("Øktnavn").fill("Pasninger i bevegelse");await p.getByRole("button",{name:"Generer forslag"}).click();await p.getByText("Forslag · 90 minutter").waitFor();
 await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:path.join(dir,"treningsplan.jpg"),type:"jpeg",quality:88});
 await p.goto(base+"/utvikling/demo?eksempel=1");await p.getByText("Øvd 3 av 4 avtalte ganger").waitFor();
 await p.locator(".dev-room").screenshot({path:path.join(dir,"trenerutvikling.jpg"),type:"jpeg",quality:88});
 const a=await ctx.newPage();await a.setViewportSize({width:390,height:844});await a.goto(base+"/utvikling/demo?eksempel=1&rolle=utover");await a.getByText("Øvd 3 av 4 avtalte ganger").waitFor();
 await a.locator(".dev-personbar").scrollIntoViewIfNeeded();await a.evaluate(()=>window.scrollTo(0,document.querySelector(".dev-personbar").getBoundingClientRect().top+scrollY-8));await a.screenshot({path:path.join(dir,"spillermal.jpg"),type:"jpeg",quality:90});
 await a.getByRole("button",{name:/Pasning i bevegelse/}).click();await a.getByRole("button",{name:"Registrer øving"}).waitFor();await a.locator(".dev-personbar").scrollIntoViewIfNeeded();await a.evaluate(()=>window.scrollTo(0,document.querySelector(".dev-personbar").getBoundingClientRect().top+scrollY-8));await a.screenshot({path:path.join(dir,"spilleroving.jpg"),type:"jpeg",quality:90});
 console.log("Four screenshots from isolated demo views.");
 }finally{await b.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
