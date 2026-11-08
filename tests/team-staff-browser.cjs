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
    await coach.getByRole("button",{name:"Lagprofil",exact:true}).click();await coach.getByText("Add another team",{exact:true}).click();
    await coach.getByLabel("New team name").fill("Link test juniors");
    await coach.getByRole("button",{name:"Create team",exact:true}).click();
    const select=coach.getByLabel("Current team");await select.selectOption({label:"Link test juniors"});
    async function issue(role){
      await coach.getByLabel("Rolle i laget").selectOption(role);
      await coach.getByRole("button",{name:"Opprett invitasjonslenke",exact:true}).click();
      const field=coach.getByLabel("Lagets invitasjonslenke");await field.waitFor();
      return field.inputValue();
    }
    async function apply(url,name){
      const p=await ctx.newPage();await p.goto(url);
      await p.getByRole("heading",{name:"Bli med i Link test juniors"}).waitFor();
      if(await p.getByLabel("Fornavn",{exact:true}).count()){await p.getByLabel("Fornavn",{exact:true}).fill(name);await p.getByLabel("Etternavn",{exact:true}).fill("Test");}else await p.getByLabel("Fullt navn").fill(name);await p.getByLabel("Telefonnummer").fill("+47 5555 0123");
      await p.getByLabel("E-post",{exact:true}).fill(name.toLowerCase()+"@example.test");
      await p.getByRole("button",{name:"Bli med på laget"}).click();
      await p.getByRole("heading",{name:"Du er med på laget!"}).waitFor();
      assert.equal(await p.getByRole("button",{name:"Åpne laget"}).count(),1);return p;
    }
    const athleteLink=await issue("athlete"),player=await apply(athleteLink,"TestPlayer");
    await select.selectOption({label:"NHF Women · Senior squad"});
    await coach.getByRole("button",{name:"Lagprofil",exact:true}).click();await coach.getByLabel("Team name",{exact:true}).waitFor();
    assert.equal(await coach.getByText("testplayer@example.test").count(),0);
    await select.selectOption({label:"Link test juniors"});
    await player.reload();await player.getByRole("button",{name:"Åpne laget"}).click();
    await player.getByRole("heading",{name:"Today's training"}).waitFor();
    const assistantLink=await issue("coach"),assistant=await apply(assistantLink,"TestCoach");
    await coach.reload();
    await assistant.reload();await assistant.getByRole("button",{name:"Åpne laget"}).click();
    await assistant.waitForURL(base+"/");await assistant.goto(base+"/team");
    assert.deepEqual(await assistant.getByLabel("Rolle i laget").locator("option").allTextContents(),["Utøver"]);
    await coach.getByRole("button",{name:"Medlemmer",exact:true}).click();await coach.getByText("Staff & roster permissions").click();
    await coach.locator(".result").filter({hasText:"TestCoach"}).getByRole("button",{name:"Make admin coach"}).click();
    await assistant.reload();await assistant.getByLabel("Rolle i laget").waitFor();
    assert.deepEqual(await assistant.getByLabel("Rolle i laget").locator("option").allTextContents(),["Utøver","Trener"]);
    await coach.getByRole("button",{name:"Inviter",exact:true}).click();await coach.getByLabel("Rolle i laget").selectOption("athlete");await coach.getByRole("button",{name:"Deaktiver lenke"}).click();
    const expired=await ctx.newPage();await expired.goto(athleteLink);await expired.getByText(/utløpt eller er erstattet/).waitFor();
    console.log("PASS: team-bound application, contact details, direct joining without approval, admin promotion and link revocation.");
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
