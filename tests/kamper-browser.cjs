const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||"msedge"});
 try{
  const base=process.env.BETA_TEST_URL||"http://127.0.0.1:3217",p=await browser.newPage({viewport:{width:390,height:844}});p.setDefaultTimeout(12000);
  await p.goto(base+"/login?role=coach");await p.getByRole("button",{name:"Sign in",exact:true}).click();await p.waitForURL(base+"/");
  await p.getByRole("link",{name:"Kamper",exact:true}).click();
  await p.getByRole("link",{name:/Hundvåg – Sola/}).click();
  const row=(n,name,total)=>[n,"",name,"X","01.01.2000","","","","","","","",total,"",total].join("\t");
  const report=["Turnering: Jenter 13, A-serie 04","Kamp Nr\t54041311009\tResPIN\t8432765","Hundvåghallen A\t01.11.2026 - 13:20","A\tHjemmelag"," Hundvåg","B\tBortelag"," Sola","Sluttresultat\tA","20\tB","21","Lag A\tDeltatt: >",row(5,"Test hjemme",20),"Lag B\tDeltatt: >",row(6,"Test borte",21)].join("\n");
  await p.getByLabel("Lim inn NHF-kamprapport").fill(report);await p.getByRole("button",{name:"Les inn tekst"}).click();
  await p.getByRole("button",{name:"Importer rapport"}).click();await p.getByText("Lagret · revisjon 1").waitFor();await p.getByRole("button",{name:"Spillere",exact:true}).click();const leader=p.locator(".player-list tbody tr").first();await leader.getByRole("img",{name:"Kampens toppscorer"}).waitFor();assert.equal(await leader.locator("td").nth(0).innerText(),"20");assert.equal(await leader.locator("td").nth(1).innerText(),"20");await p.reload();
  await p.getByRole("button",{name:"Rediger lagret rapport"}).click();await p.getByLabel("Hall",{exact:true}).fill("Korrigert hall");
  await p.getByRole("button",{name:"Lagre rapportendringer"}).click();await p.getByText("Lagret · revisjon 2").waitFor();const download=p.waitForEvent("download");await p.getByRole("button",{name:"Last ned PDF"}).click();assert.match((await download).suggestedFilename(),/Kamprapport-8432765-r2\.pdf/);
  await p.getByRole("link",{name:"Kampoversikt",exact:true}).click();await p.getByRole("link",{name:"Lagprofil",exact:true}).click();
  await p.getByLabel("Lagnotat").fill("Første spillelag");await p.getByRole("button",{name:"Lagre lagprofil"}).click();
  await p.getByText("Legg til lag",{exact:true}).last().click();await p.getByLabel("NIF lag-ID",{exact:true}).fill("226597");await p.getByRole("button",{name:"Legg til lag og hent kamper"}).click();
  await p.getByText(/ikke tilkoblet i lokal demo/).waitFor();
  assert.equal(await p.getByLabel("Lagnotat").inputValue(),"");
  await p.getByRole("navigation",{name:"Kampmeny"}).getByRole("link",{name:"Kamper",exact:true}).click();await p.getByText("Ingen kamper i dette utvalget.").waitFor();
  await p.getByLabel("Aktiv NIF-lagprofil").selectOption({label:"Hundvåg J13 · 226751"});await p.getByRole("link",{name:/Hundvåg – Sola/}).waitFor();
  await p.getByLabel("Sesong",{exact:true}).selectOption("new");await p.getByLabel("Sesongnavn").fill("2027/28");await p.getByLabel("NIF sesong-ID").fill("888888");await p.getByRole("button",{name:"Lagre sesong",exact:true}).click();await p.getByText("Ingen kamper i dette utvalget.").waitFor();
  await p.reload();await p.getByText("Aktiv: 2027/28").waitFor();await p.getByLabel("Sesong",{exact:true}).selectOption("201068");await p.getByRole("button",{name:"Lagre sesong",exact:true}).click();await p.getByRole("link",{name:/Hundvåg – Sola/}).waitFor();assert.equal(await p.locator(".fixture-line").count(),14);
  for(const width of [390,768,1280]){await p.setViewportSize({width,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  console.log("PASS: separate profiles by numeric ID, scoped fixtures and notes, paste confirmation, correction and responsive layouts.");
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
