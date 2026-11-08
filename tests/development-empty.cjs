const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||"msedge"});
 try{const base=process.env.BETA_TEST_URL||"http://127.0.0.1:3217",p=await browser.newPage({viewport:{width:390,height:844}});
  await p.goto(base+"/login");await p.evaluate(()=>{sessionStorage.setItem("nhf-persona","coach");sessionStorage.setItem("nhf-team:coach","empty");
   localStorage.setItem("nhf-beta-v1:team:empty",JSON.stringify({id:"empty",name:"Tomt testlag"}));localStorage.setItem("nhf-beta-v1:membership:empty",JSON.stringify({team:"empty",id:"coach"}));});
  await p.goto(base+"/utvikling");await p.getByText(/Ingen utøvere på dette laget/).waitFor();await p.getByLabel("Ferdighetsoppsett").selectOption("keeper");await p.getByText("Redningsteknikk",{exact:true}).waitFor();
  await p.getByRole("button",{name:"Lagets videoer"}).click();await p.getByText(/Ingen øvelser med video/).waitFor();await p.getByRole("link",{name:"Åpne øvelsesbanken"}).click();await p.getByRole("button",{name:"Ny klubbøvelse"}).waitFor();
  await p.goto(base+"/utvikling");await p.getByRole("link",{name:"Se som utøver"}).click();await p.getByRole("heading",{name:/Mitt fokus/}).waitFor();assert.equal(await p.getByRole("button",{name:"Vurder fremgang"}).count(),0);
  await p.getByRole("button",{name:"Test som trener"}).click();await p.getByRole("button",{name:"Vurder fremgang"}).waitFor();await p.getByRole("link",{name:"Til klubben"}).click();await p.getByText(/Ingen utøvere på dette laget/).waitFor();
  assert.equal(await p.evaluate(()=>sessionStorage.getItem("nhf-persona")),"coach");assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  console.log("PASS: empty roster setup, video bank, isolated role previews and return to same coach/team on mobile.");
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
