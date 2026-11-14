const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{const b=await chromium.launch({channel:"msedge"});try{
 const base=process.env.BETA_TEST_URL||"http://127.0.0.1:3296",p=await b.newPage();
 await p.goto(base+"/login?role=coach");await p.getByRole("button",{name:"Sign in",exact:true}).click();await p.waitForURL(base+"/");
 await p.evaluate(()=>{localStorage.setItem("nhf-beta-v1:member:liv",JSON.stringify({id:"liv",name:"Liv Berg",role:"athlete",squad:"demo",shirt_number:"12"}));
 const players=[["Liv Rapport","12","A"],["Ukjent Spiller","4","A"],["Motstander Test","12","B"]].map(([name,shirt,side])=>({name,shirt,side,total:3,played:true}));
 sessionStorage.setItem("kamper-private-report:demo:nhf-8432765",JSON.stringify({reviewed:{players},revision:1}));});
 await p.goto(base+"/spillere");const nav=p.locator(".sidebar");const names=await nav.locator(".nav-item").allTextContents();assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b,"nb")));
 await nav.getByRole("link",{name:"Rapportkoblinger"}).click();await p.getByRole("heading",{name:"Ukoblede rapportspillere (2)"}).waitFor();
 const liv=p.locator(".report-row").filter({hasText:"Liv Rapport"}),other=p.locator(".report-row").filter({hasText:"Ukjent Spiller"});
 assert.equal(await liv.getByRole("combobox").inputValue(),"liv");assert.equal(await other.getByRole("button").isDisabled(),true);assert.equal(await p.getByText("Motstander Test").count(),0);
 await liv.getByRole("button").click();await p.getByRole("heading",{name:"Ukoblede rapportspillere (1)"}).waitFor();
 await p.reload();await p.getByRole("heading",{name:"Ukoblede rapportspillere (1)"}).waitFor();
 await other.getByRole("combobox").selectOption("ida");await other.getByRole("button").click();await p.getByText("Ingen ukoblede spillere i lagets kamprapporter.").waitFor();
 await p.setViewportSize({width:360,height:800});await p.getByRole("button",{name:"Mer",exact:true}).click();await p.locator(".phone-more").getByRole("link",{name:"Rapportkoblinger"}).waitFor();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log("PASS: sorted coach menu, mobile submenu, report scope, suggested/manual linking and persistence");
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
