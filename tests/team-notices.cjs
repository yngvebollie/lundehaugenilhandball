const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{
  const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||"msedge"});
  try{
    const base=process.env.BETA_TEST_URL||"http://127.0.0.1:3217",ctx=await browser.newContext();ctx.setDefaultTimeout(12000);
    const coach=await ctx.newPage(),player=await ctx.newPage(),other=await ctx.newPage();
    await coach.goto(base+"/login?role=coach");await coach.getByRole("button",{name:"Sign in",exact:true}).click();
    const panel=coach.locator("#notices");await panel.getByText("Team notices & read receipts",{exact:true}).click();
    await panel.getByLabel("Notice recipients").selectOption("selected");await panel.getByLabel("Liv Berg").check();
    await panel.getByLabel("Message for athletes").fill("Individual reminder");await panel.getByRole("button",{name:"Post to 1 athlete(s)"}).click();
    await panel.getByText("Notice posted for 1 athlete(s).").waitFor();
    await panel.getByLabel("Notice period").selectOption("Weekly");await panel.getByLabel("Notice recipients").selectOption("team");
    await panel.getByLabel("Message for athletes").fill("Weekly meeting");await panel.getByRole("button",{name:"Post to 2 athlete(s)"}).click();
    for(const [p,id] of [[player,"liv"],[other,"ida"]]){
      await p.goto(base+"/login?role=athlete");await p.getByLabel("Demo account").selectOption(id);
      await p.getByRole("button",{name:"Sign in",exact:true}).click();await p.getByRole("button",{name:/notice\(s\) to acknowledge/}).click();
    }
    assert.equal(await other.getByText("Individual reminder").count(),0);
    await panel.getByText(/Weekly .*0\/2 read/).waitFor();
    await player.locator("article").filter({hasText:"Weekly meeting"}).getByRole("button",{name:/Accept/}).click();
    await panel.getByText(/Weekly .*1\/2 read/).click();
    const report=panel.locator("details").filter({hasText:"Weekly meeting"});
    await report.getByText(/Read \d/).waitFor();await report.getByText("Awaiting acceptance").waitFor();
    await player.reload();await player.getByRole("button",{name:"Messages",exact:true}).click();await player.getByText("Accepted notices (1)").waitFor();
    console.log("PASS: selected and whole-team notices, opening is not acceptance, private recipients, persistent timestamped receipts.");
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
