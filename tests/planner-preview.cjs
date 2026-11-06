const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
const assert=require("node:assert/strict");
(async()=>{
  const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||"msedge"});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1050}});
    await page.goto(process.env.BETA_TEST_URL||"http://127.0.0.1:3217");
    await page.getByRole("button",{name:"How to use Coach AI"}).click();
    await page.getByText(/Describe the body focus/).waitFor();
    await page.getByRole("button",{name:"How to use Coach AI"}).click();
    await page.getByLabel("Describe your workout").fill("Lower body medium workout");
    await page.getByRole("button",{name:"Suggest program",exact:true}).click();
    await page.getByRole("button",{name:/Use in builder/}).click();
    assert.match(await page.getByLabel("Exercises, one per line").inputValue(),/Lower body.*Goblet squat.*2 x/);
    const picker=page.locator("#strength-library");
    assert.equal(await picker.locator(".lift-list button").count(),50);
    await picker.getByLabel("Search exercises").fill("goblet");
    await picker.getByRole("img",{name:/Quads, Glutes/}).waitFor();
    await picker.getByRole("button",{name:"Add to session"}).click();
    await picker.getByText("Goblet squat added to session.").waitFor();
    await page.reload();
    assert.match(await picker.locator(".lift-list button").first().innerText(),/Goblet squat/);
    if(process.env.BETA_SCREENSHOT)await picker.screenshot({path:process.env.BETA_SCREENSHOT});
    const planner=page.locator("#weekly");
    await planner.getByRole("button",{name:"Next week"}).click();
    await planner.getByLabel("Planner athlete").selectOption("liv");
    await planner.getByRole("button",{name:"Hard",exact:true}).click();
    await planner.getByRole("button",{name:"Suggest week",exact:true}).click();
    await planner.getByRole("button",{name:"Add 3 suggested sessions to planner"}).click();
    await planner.getByText("3 suggested sessions added to the planner.").waitFor();
    await planner.getByRole("button",{name:"Suggest week",exact:true}).click();
    await planner.getByText(/No additional sessions fit/).waitFor();
    await page.goto(new URL("/login",page.url()).href);
    await page.getByRole("button",{name:"Create account",exact:true}).click();
    await page.getByLabel("Team invitation link or code").waitFor();
    console.log("PASS: visible help and prompt, 50 lifts, muscle zones, persistent ranking, free and loaded weeks, account setup.");
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
