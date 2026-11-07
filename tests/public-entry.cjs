const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{
  const base=process.env.BETA_TEST_URL||"http://127.0.0.1:3217";
  const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||"msedge"});
  try{
    for(const width of [375,1440]){
      const page=await browser.newPage({viewport:{width,height:width===375?812:900}});
      await page.goto(base+"/login");
      assert.equal(await page.getByLabel("Password",{exact:true}).count(),0);
      for(const label of ["Athlete login","Coach login"]){
        const row=page.getByRole("link",{name:label,exact:true});
        assert.ok((await row.boundingBox()).height>=44);
        if(process.env.ENTRY_SCREENSHOTS&&label==="Athlete login")await page.screenshot({path:process.env.ENTRY_SCREENSHOTS+"/team-sign-in-"+width+".png"});
        await row.click();await page.getByRole("button",{name:"Sign in",exact:true}).waitFor();
        await page.getByRole("button",{name:"Create account",exact:true}).click();
        await page.getByLabel(label==="Athlete login"?"Your name":"Team invitation link or code").waitFor();
        await page.getByRole("link",{name:"Choose another role"}).click();
      }
      await page.getByRole("link",{name:"Platform documentation"}).click();
      await page.getByText("Created by Yngve for Lundehaugen IL.").waitFor();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.getByRole("link",{name:"Return to sign-in"}).click();
      await page.getByRole("heading",{name:"Team sign-in"}).waitFor();
      await page.close();
    }
    console.log("PASS: mobile and desktop role selection, account creation forms, documentation and return navigation.");
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
