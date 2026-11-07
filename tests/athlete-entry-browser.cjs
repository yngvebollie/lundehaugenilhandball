const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{
  const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||"msedge"});
  try{
    const ctx=await browser.newContext();ctx.setDefaultTimeout(12000);
    const base=process.env.BETA_TEST_URL||"http://127.0.0.1:3217";
    const coach=await ctx.newPage();await coach.goto(base);
    await coach.getByRole("link",{name:"Platform documentation"}).click();
    await coach.getByRole("heading",{name:"Why I built it"}).waitFor();
    await coach.getByRole("link",{name:"Back to sign-in"}).click();
    await coach.getByRole("link",{name:"Coach login",exact:true}).click();
    await coach.getByRole("button",{name:"Sign in",exact:true}).click();
    await coach.waitForURL(base+"/");await coach.goto(base+"/team");
    await coach.getByRole("button",{name:"Generate new team code"}).click();
    const code=await coach.getByRole("status").filter({hasText:"Athlete join code"}).locator("strong").innerText();
    assert.match(code,/^[A-F0-9]{6}$/);
    async function applicant(name){
      const page=await ctx.newPage();await page.goto(base+"/login?role=athlete");
      await page.getByRole("button",{name:"Create account",exact:true}).click();
      await page.getByLabel("Your name").fill(name);await page.getByLabel("Email",{exact:true}).fill(name+"@example.test");
      await page.getByLabel("Phone number").fill("+47 5555 0123");
      await page.getByRole("button",{name:"Continue to team selection"}).click();
      await page.getByRole("heading",{name:"Join a team"}).waitFor();return page;
    }
    const athlete=await applicant("CodeTester");await athlete.getByLabel("Six-character team code").fill(code);
    await athlete.getByRole("button",{name:"Join with code"}).click();
    await athlete.getByRole("button",{name:"Team",exact:true}).click();
    await athlete.getByText("Liv Berg",{exact:true}).waitFor();
    await athlete.getByRole("button",{name:"Messages",exact:true}).click();
    await athlete.getByLabel("Message",{exact:true}).fill("Ready for practice");
    await athlete.getByRole("button",{name:"Send message",exact:true}).click();
    await athlete.getByText("Ready for practice",{exact:true}).waitFor();
    const other=await applicant("Applicant");
    await other.getByRole("button",{name:"Apply to team"}).click();
    await coach.getByRole("button",{name:"Approve",exact:true}).click();
    await other.getByRole("heading",{name:"Today's training"}).waitFor();
    console.log("PASS: public introduction, athlete registration, generated code, team application and approval, roster and messaging.");
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
