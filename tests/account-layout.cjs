const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||"msedge"});try{
 const p=await browser.newPage({viewport:{width:1440,height:900}}),base=process.env.BETA_TEST_URL||"http://127.0.0.1:3217";
 await p.goto(base+"/login?role=coach");await p.getByRole("button",{name:"Sign in",exact:true}).click();await p.waitForURL(base+"/");await p.goto(base+"/match");
 for(const width of [1440,1024,390]){
  await p.setViewportSize({width,height:900});if(width===390)await p.getByRole("button",{name:"Kontomeny"}).click();
  const account=p.locator(width===390?".phone-more .account":".page-head .account");await account.getByLabel("Arbeidsrolle").waitFor();
  const boxes=await account.locator(":scope>strong,select,:scope>.btn").evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {height:r.height,bottom:r.bottom,x:r.x};}));
  assert.equal(boxes.length,4);for(const box of boxes)assert.equal(box.height,boxes[0].height);
  if(width>390)for(const box of boxes)assert.ok(Math.abs(box.bottom-boxes[0].bottom)<1,JSON.stringify(boxes));
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 console.log("PASS: aligned coach account controls at 1440/1024px and usable mobile account menu");
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
