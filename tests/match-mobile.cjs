const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{
  const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||"msedge"});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(12000);
    const base=process.env.BETA_TEST_URL||"http://127.0.0.1:3217";
    await page.goto(base+"/login");await page.getByRole("button",{name:"Open workspace"}).click();
    await page.getByRole("link",{name:"Team management",exact:true}).click();
    const pic=await page.evaluate(()=>document.createElement("canvas").toDataURL().split(",")[1]);
    await page.getByLabel("Team logo",{exact:true}).setInputFiles({name:"club.png",mimeType:"image/png",buffer:Buffer.from(pic,"base64")});
    await page.getByRole("button",{name:"Save",exact:true}).click();await page.getByText("Team details saved.").waitFor();
    await page.getByLabel("Invite emails").fill("one@example.test; two@example.test\nONE@example.test");
    await page.getByRole("button",{name:"Create invitation links"}).click();
    await page.getByLabel("Invitation link · two@example.test").waitFor();
    assert.equal(await page.locator(".invite-results input").count(),2);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.getByRole("link",{name:"Match pad",exact:true}).click();
    await page.setViewportSize({width:1024,height:768});
    await page.getByLabel("Opponent").fill("Visitors");await page.getByLabel("Liv Berg",{exact:true}).check();await page.getByLabel("Ida Vik",{exact:true}).check();
    await page.getByRole("button",{name:"Start match recorder"}).click();
    await page.getByRole("combobox",{name:/Shooter/}).waitFor().catch(async error=>{console.error(await page.locator(".match-pad").innerText());throw error;});
    await page.getByRole("combobox",{name:/Shooter/}).selectOption("liv");await page.getByRole("combobox",{name:/Assist/}).selectOption("ida");
    await page.getByRole("button",{name:/Shot origin map/}).click({position:{x:70,y:60}});await page.getByRole("button",{name:/Goal target map/}).click({position:{x:100,y:70}});
    await page.getByRole("button",{name:"Record goal",exact:true}).click();
    await page.getByRole("heading",{name:"1 goals · 1 attempts"}).waitFor();
    const stat=page.getByRole("row").filter({has:page.getByRole("rowheader",{name:"Ida Vik"})});
    assert.equal(await stat.locator("td").last().innerText(),"1");
    if(process.env.BETA_MATCH_SCREENSHOT)await page.locator(".match-pad").screenshot({path:process.env.BETA_MATCH_SCREENSHOT});
    await page.reload();const matchList=page.getByRole("combobox",{name:/^Match\b/});await matchList.selectOption({label:await matchList.locator("option").filter({hasText:"Visitors"}).innerText()});
    await page.getByRole("heading",{name:"1 goals · 1 attempts"}).waitFor();
    await page.getByRole("button",{name:"Undo last attempt"}).click();await page.getByRole("heading",{name:"0 goals · 0 attempts"}).waitFor();
    await page.setViewportSize({width:375,height:812});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    console.log("PASS: phone team navigation, logo, bulk links, tablet lineup, shot maps, goals and assists, reload, undo.");
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
