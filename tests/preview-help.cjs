const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{
 const browser=await chromium.launch({channel:"msedge"});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const writes=[];
  page.on("request",r=>{if(/supabase|\/api\/development/.test(r.url()))writes.push(r.method());});
  await page.goto((process.env.BETA_TEST_URL||"http://127.0.0.1:3217")+"/utvikling/demo?eksempel=1");
  await page.getByRole("combobox",{name:"Utøver",exact:true}).selectOption("demo-b");
  await page.getByRole("heading",{name:"Bo Eksempel",exact:true}).waitFor();
  await page.getByText("Merker og neste mål",{exact:true}).click();
  await page.getByText(/54 mål denne sesongen/).waitFor();
  const info=page.getByRole("button",{name:"Om Min utvikling",exact:true});
  await info.focus();await page.keyboard.press("Enter");
  await page.getByRole("dialog",{name:"Min utvikling"}).waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await info.evaluate(e=>document.activeElement===e),true);
  await page.getByRole("button",{name:"Test som utøver"}).click();
  await page.getByLabel("Eksempelspiller").selectOption("demo-c");
  await page.getByText("Merker og neste mål",{exact:true}).click();
  await page.getByText(/3 mål denne sesongen/).waitFor();
  assert.equal(await page.getByRole("button",{name:"Vurder fremgang"}).count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(writes,[]);
  console.log("Coach, athlete, individual demo badges, keyboard help, mobile width, no production data requests: OK");
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
