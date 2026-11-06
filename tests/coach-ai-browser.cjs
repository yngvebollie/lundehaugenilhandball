const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{
  const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||"msedge"});
  try{
    const page=await browser.newPage();
    await page.goto(process.env.BETA_TEST_URL||"http://127.0.0.1:3217");
    const lines=page.getByLabel("Exercises, one per line");
    await lines.fill("squat 3x8");
    await page.getByText("AI coach assistant",{exact:true}).click();
    const reply=page.getByLabel("ChatGPT JSON reply");
    const preview=page.getByRole("button",{name:"Preview reply"});
    await reply.fill("invalid"); await preview.click();
    await page.getByText("Paste the JSON draft returned by ChatGPT.").waitFor();
    assert.equal(await lines.inputValue(),"squat 3x8");
    await reply.fill(JSON.stringify({text:"Squat · 3 x 8"})); await preview.click();
    await page.getByRole("button",{name:"Replace session text"}).click();
    assert.equal(await lines.inputValue(),"Squat · 3 x 8");
    await page.getByLabel("Draft task").selectOption("exercise");
    await reply.fill(JSON.stringify({name:"Band press",dose:"3 x 8 each side",region:"Core"}));await preview.click();
    await page.getByRole("button",{name:"Fill exercise editor"}).click();
    assert.equal(await page.getByLabel("Exercise name",{exact:true}).inputValue(),"Band press");
    await page.getByRole("button",{name:"Save and add exercise"}).click();
    await page.getByText("Exercise saved and added to the current session.").waitFor();
    await page.getByLabel("Draft task").selectOption("program");
    await reply.fill(JSON.stringify({name:"Match week",sessions:[{title:"Power",offset:0,exercises:["Squat 2 x 8"]},{title:"Mobility",offset:2,exercises:["Hip mobility 5 min"]}]}));
    await preview.click(); await page.getByRole("button",{name:"Replace program draft"}).click();
    assert.equal(await page.getByLabel("Program name").inputValue(),"Match week");
    await page.getByRole("button",{name:"Session 2",exact:true}).click();
    assert.equal(await lines.inputValue(),"Hip mobility 5 min");
    assert.equal(await page.getByLabel("Day of program").inputValue(),"3");
    console.log("PASS: invalid draft preserved content; reviewed rewrite, exercise library save and multi-session import.");
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
