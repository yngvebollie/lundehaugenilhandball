const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{
 const b=await chromium.launch({channel:process.env.BROWSER_CHANNEL||"msedge"});
 try{
  const ctx=await b.newContext({viewport:{width:1440,height:900}}),base=process.env.BETA_TEST_URL||"http://127.0.0.1:3217";
  const p=await ctx.newPage();p.setDefaultTimeout(12000);
  const image=async(page,name)=>{if(process.env.UI_QA_DIR)await page.screenshot({path:process.env.UI_QA_DIR+"/"+name+".png"});};
  async function login(page,role,id){await page.goto(base+"/login?role="+role);if(id)await page.getByLabel("Demo account").selectOption(id);await page.getByRole("button",{name:"Sign in",exact:true}).click();await page.waitForURL(role==="coach"?base+"/":base+"/athlete");}
  await p.goto(base+"/login");assert.equal(await p.locator(".public-shell").evaluate(el=>getComputedStyle(el).backgroundColor),"rgb(250, 251, 249)");
  await login(p,"coach");await p.goto(base+"/match");await p.getByRole("link",{name:/Hundvåg – Sola/}).waitFor();await image(p,"desktop-kamper");
  await p.goto(base+"/challenges");await p.getByText("Opprett utfordring",{exact:true}).click();await p.getByLabel("Navn på utfordringen").fill("Pushup challenge");
  await p.getByRole("button",{name:"Publiser utfordring"}).click();await p.getByRole("heading",{name:"Pushup challenge"}).waitFor();
  async function athlete(id){const a=await ctx.newPage();await a.setViewportSize({width:390,height:844});await login(a,"athlete",id);await a.getByText("Mine prestasjoner",{exact:true}).waitFor();await a.getByRole("button",{name:"Utfordringer",exact:true}).click();await a.getByRole("heading",{name:"Pushup challenge"}).waitFor();return a;}
  const a=await athlete("liv");
  for(const n of ["8","12"]){await a.getByLabel("repetisjoner i dette settet").fill(n);await a.getByRole("button",{name:"Registrer sett"}).click();await a.getByLabel("repetisjoner i dette settet").inputValue();}
  await a.locator(".my-score td").last().filter({hasText:/^20$/}).waitFor();
  const other=await athlete("ida");assert.match(await other.locator(".score-table").innerText(),/Spiller /);assert.ok(!(await other.locator(".score-table").innerText()).includes("Liv"));
  await image(a,"athlete-challenge");
  await p.setViewportSize({width:390,height:844});await p.goto(base+"/");await p.locator(".coach-agenda").waitFor();await image(p,"mobile-overview");
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  console.log("PASS: coach publishes anonymous challenge, athlete logs separate sets, total persists, aliases protect peers, achievements and responsive screens render.");
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
