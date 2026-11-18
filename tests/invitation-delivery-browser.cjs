const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'playwright');
const w=require('next/dist/compiled/webpack/webpack');w.init();
(async()=>{
 const out=path.resolve('output/invitation-ui-test');
 await new Promise((resolve,reject)=>w.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/invitation-ui.tsx'),output:{path:out,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@/lib/beta':path.resolve('tests/fixtures/invitation-ui.tsx'),'@':path.resolve('src')}},module:{rules:[{test:/\.(tsx?|css)$/,use:path.resolve('tests/fixtures/invitation-loader.cjs')}]},plugins:[new w.webpack.DefinePlugin({'process.env.NODE_ENV':JSON.stringify('development')})]},(e,s)=>e||s.hasErrors()?reject(e||Error(s.toString({all:false,errors:true}))):resolve()));
 const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript; charset=utf-8');res.end(fs.readFileSync(path.join(out,'bundle.js')));}else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script src="/bundle.js"></script>');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
  browser=await chromium.launch({channel:'msedge'});
  for(const width of [1280,390,360]){
   const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
   let status='queued',failure=false,calls=0;
   await page.route('**/api/invitations/status*',route=>{calls++;return route.fulfill({status:failure?503:200,contentType:'application/json',body:JSON.stringify(failure?{error:'Midlertidig feil. Prøv igjen.'}:{deliveries:[{id:'test',recipient:'yngve+test@bluemint.no',sender:'noreply@lundehaugenil.no',member_role:'athlete',provider_id:'00000000-0000-4000-8000-000000000020',status,error_code:null,created_at:'2026-11-18T13:00:00Z',checked_at:'2026-11-18T13:01:00Z',check_error:null}]})});});
   await page.goto(base);try{await page.getByText('I sendekø',{exact:true}).waitFor({timeout:8000});}catch(e){console.error({calls,body:await page.locator('body').innerText()});throw e;}status='delivered';await page.getByRole('button',{name:'Oppdater status',exact:true}).click();await page.getByText('Levert til e-postserver',{exact:true}).waitFor();
   assert.ok(await page.getByText(/ikke at den er lest/).isVisible());status='bounced';await page.getByRole('button',{name:'Oppdater status',exact:true}).click();await page.getByText('Avvist av mottaker',{exact:true}).waitFor();
   await page.screenshot({path:'output/invitation-delivery-'+width+'.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow at '+width);
   failure=true;await page.getByRole('button',{name:'Oppdater status',exact:true}).click();await page.getByRole('alert').filter({hasText:'Midlertidig feil'}).waitFor();assert.ok(await page.getByText('Avvist av mottaker',{exact:true}).isVisible());failure=false;
   await page.reload();await page.getByText('Avvist av mottaker',{exact:true}).waitFor();assert.ok(calls>=5);assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS: queued/delivered/bounced, manual refresh, failure retains history, reload, desktop and 390/360px layouts');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
