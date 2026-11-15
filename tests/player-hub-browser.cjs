const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{const browser=await chromium.launch({channel:"msedge"});try{
 const base=process.env.BETA_TEST_URL||"http://127.0.0.1:3217",p=await browser.newPage({viewport:{width:360,height:800}});
 await p.goto(base+"/login?role=coach");await p.getByRole("button",{name:"Sign in",exact:true}).click();await p.waitForURL(base+"/");
 await p.goto(base+"/spillere");await p.getByRole("heading",{name:"Spilleroversikt"}).waitFor();
 for(const name of ["Draktnr.","Posisjon","Kamper","Mål","Mål/kamp","Gultkort","Rødtkort","2m","7m"])await p.getByRole("columnheader",{name,exact:true}).waitFor();
 for(const width of [360,1366]){await p.setViewportSize({width,height:800});
 const layout=await p.locator(".roster-grid").evaluate(table=>{const h=table.tHead.rows[1],r=table.tBodies[0].rows[0];return [...h.cells].every((c,i)=>Math.abs(c.getBoundingClientRect().x-r.cells[i].getBoundingClientRect().x)<1&&getComputedStyle(c).textAlign===getComputedStyle(r.cells[i]).textAlign);});
 assert.ok(layout,"Aligned headings and values at "+width);}
 await p.setViewportSize({width:360,height:800});await p.locator(".roster-scroll").evaluate(el=>el.scrollLeft=240);
 assert.ok(await p.locator(".roster-grid tbody th").first().evaluate(el=>el.getBoundingClientRect().left>=0),"Pinned player name");await p.locator(".roster-scroll").evaluate(el=>el.scrollLeft=0);
 await p.getByPlaceholder("Navn eller draktnummer").fill("Liv");assert.equal(await p.getByRole("link",{name:"Ida Vik",exact:true}).count(),0);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"Mobile roster overflow");
 await p.getByRole("link",{name:"Liv Berg",exact:true}).click();await p.getByRole("heading",{name:"Planlagt og gjennomført"}).waitFor();
 await p.getByRole("button",{name:"Neste uke"}).click();await p.getByRole("button",{name:"Forrige uke"}).click();
 const nav=p.getByRole("navigation",{name:"Spillerprofil"});
 await nav.getByRole("link",{name:"Vurderinger"}).click();await p.getByRole("heading",{name:"Øvelsesvurderinger"}).waitFor();
 await nav.getByRole("link",{name:"Trenerlogg"}).click();await p.getByRole("heading",{name:"Trenerlogg"}).waitFor();
 await nav.getByRole("link",{name:"Kamper og kobling"}).click();await p.getByRole("heading",{name:"Kobling til kamprapporter"}).waitFor();
 const hub=p.getByRole("navigation",{name:"Spillermeny"});await hub.getByRole("link",{name:"Plan",exact:true}).click();
 await p.getByRole("heading",{name:"Liv Berg"}).getByRole("link").click();assert.match(p.url(),/uke=\d{4}-\d{2}-\d{2}/);
 await hub.getByRole("link",{name:"Statistikk"}).click();for(const name of ["Gultkort","Rødtkort","2m","7m","Draktnr."])await p.getByRole("columnheader",{name,exact:true}).waitFor();await p.getByRole("link",{name:"Liv Berg",exact:true}).click();
 await p.getByRole("heading",{name:"Planlagt og gjennomført"}).waitFor();
 await p.goto(base+"/spillere?athlete=unrelated");await p.getByText("Spilleren er ikke registrert på valgt lag.").waitFor();
 console.log("PASS: mobile roster, search, profile, plan, ratings, coach log, stats links and invalid team member");
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
