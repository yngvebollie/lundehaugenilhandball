const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{
  const base=process.env.BETA_TEST_URL||"http://127.0.0.1:3217";
  const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||"msedge"});
  try{
    const ctx=await browser.newContext();ctx.setDefaultTimeout(12000);
    const coach=await ctx.newPage();await coach.goto(base+"/login?role=coach");
    await coach.getByRole("button",{name:"Sign in",exact:true}).click();
    await coach.waitForURL(base+"/");await coach.goto(base+"/team");
    await coach.getByText("Add another team",{exact:true}).click();
    await coach.getByLabel("New team name").fill("Link test juniors");
    await coach.getByRole("button",{name:"Create team",exact:true}).click();
    const select=coach.getByLabel("Current team");await select.selectOption({label:"Link test juniors"});
    async function issue(role){
      await coach.getByLabel("Application role").selectOption(role);
      await coach.getByRole("button",{name:"Create application link",exact:true}).click();
      const field=coach.getByLabel("Shareable team application link");await field.waitFor();
      return field.inputValue();
    }
    async function apply(url,name){
      const p=await ctx.newPage();await p.goto(url);
      await p.getByRole("heading",{name:"Apply to Link test juniors"}).waitFor();
      await p.getByLabel("Full name").fill(name);await p.getByLabel("Phone number").fill("+47 5555 0123");
      await p.getByLabel("Email",{exact:true}).fill(name.toLowerCase()+"@example.test");
      await p.getByRole("button",{name:"Submit application"}).click();
      await p.getByText(/Applied · Pending approval/).waitFor();
      assert.equal(await p.getByRole("button",{name:"Open team"}).count(),0);return p;
    }
    const athleteLink=await issue("athlete"),player=await apply(athleteLink,"TestPlayer");
    await select.selectOption({label:"NHF Women · Senior squad"});
    await coach.getByLabel("Team name",{exact:true}).waitFor();
    assert.equal(await coach.getByText("testplayer@example.test").count(),0);
    await select.selectOption({label:"Link test juniors"});
    const candidate=coach.locator(".result").filter({hasText:"testplayer@example.test"});
    await candidate.getByText("+47 5555 0123").waitFor();
    await candidate.getByRole("button",{name:"Approve"}).click();
    await player.reload();await player.getByRole("button",{name:"Open team"}).click();
    await player.getByRole("heading",{name:"Today's training"}).waitFor();
    const assistantLink=await issue("coach"),assistant=await apply(assistantLink,"TestCoach");
    await coach.reload();await coach.locator(".result").filter({hasText:"testcoach@example.test"}).getByRole("button",{name:"Approve"}).click();
    await assistant.reload();await assistant.getByRole("button",{name:"Open team"}).click();
    await assistant.waitForURL(base+"/");await assistant.goto(base+"/team");
    assert.deepEqual(await assistant.getByLabel("Application role").locator("option").allTextContents(),["Athlete"]);
    await coach.getByText("Staff & roster permissions").click();
    await coach.locator(".result").filter({hasText:"TestCoach"}).getByRole("button",{name:"Make admin coach"}).click();
    await assistant.reload();await assistant.getByLabel("Application role").waitFor();
    assert.deepEqual(await assistant.getByLabel("Application role").locator("option").allTextContents(),["Athlete","Coach"]);
    await coach.getByLabel("Application role").selectOption("athlete");await coach.getByRole("button",{name:"Revoke link"}).click();
    const expired=await ctx.newPage();await expired.goto(athleteLink);await expired.getByText(/invalid, expired or has been replaced/).waitFor();
    console.log("PASS: team-bound application, contact details, pending access, correct-team approval, admin promotion and link revocation.");
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
