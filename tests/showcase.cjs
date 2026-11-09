const assert=require("node:assert/strict"),fs=require("fs"),path=require("path"),{chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{const browser=await chromium.launch({channel:"msedge"}),base=process.env.SHOWCASE_URL||"http://127.0.0.1:3217/handballplattformen";
 try{const page=await browser.newPage();for(const width of [360,768,1440]){
  await page.setViewportSize({width,height:900});assert.equal((await page.goto(base)).status(),200);await page.getByRole("heading",{name:"Håndballplattformen",exact:true}).waitFor();
  await page.getByRole("link",{name:"Se trenerens plan"}).click();
  for(const img of await page.locator("main figure img").all()){await img.scrollIntoViewIfNeeded();await img.evaluate(el=>el.decode());assert.ok(await img.evaluate(el=>el.naturalWidth>0));}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"horizontal overflow at "+width);
  assert.equal(await page.getByRole("link",{name:"Prøv trenerrommet"}).count(),1);assert.equal(await page.getByRole("link",{name:"Prøv utøvervisningen"}).count(),1);
  await page.evaluate(()=>scrollTo(0,0));if(width!==768)await page.screenshot({path:path.resolve("outputs","handballplattform-"+width+".png")});
 }
 // Native blocks for the existing WordPress theme. Media stays on the club app.
 const blocks=await page.evaluate(()=>{
  const abs=u=>new URL(u,"https://app.lundehaugenil.no").href,block=(name,html,attrs="")=>"<!-- wp:"+name+(attrs?" "+attrs:"")+" -->\n"+html+"\n<!-- /wp:"+name+" -->";
  const list=[];for(const el of document.querySelectorAll("main h2,main h3,main p,main figure,main a.action,main a.plain")){
   const t=el.tagName.toLowerCase();if(el.classList.contains("kicker"))continue;
   if(t==="p"){list.push(block("paragraph","<p>"+el.innerHTML+"</p>"));continue;}
   if(t==="h2"||t==="h3"){list.push(block("heading","<"+t+' class="wp-block-heading">'+el.innerHTML+"</"+t+">",t==="h3"?'{"level":3}':""));continue;}
   if(t==="figure"){const f=el.cloneNode(true);f.className="wp-block-image";const i=f.querySelector("img"),a=f.querySelector("a");i.src=abs(i.getAttribute("src"));a.href=i.src;list.push(block("image",f.outerHTML));continue;}
   const href=el.getAttribute("href");if(href.startsWith("#"))continue;
   const link=document.createElement("a");link.href=abs(href);link.textContent=el.textContent.trim();list.push(block("paragraph","<p>"+link.outerHTML+"</p>"));
  }return list.join("\n\n");
 });
 const dir=path.resolve("outputs");fs.writeFileSync(path.join(dir,"handballplattformen-wordpress.html"),blocks);
 const xml='<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:wp="http://wordpress.org/export/1.2/"><channel><title>Lundehaugen IL</title><link>https://lundehaugenil.no</link><description></description><wp:wxr_version>1.2</wp:wxr_version><wp:base_site_url>https://lundehaugenil.no</wp:base_site_url><wp:base_blog_url>https://lundehaugenil.no</wp:base_blog_url><item><title>Håndballplattformen</title><content:encoded><![CDATA['+blocks.replaceAll("]]>","]]]]><![CDATA[>")+']]></content:encoded><wp:post_type>page</wp:post_type><wp:post_name>handballplattformen</wp:post_name><wp:status>draft</wp:status><wp:comment_status>closed</wp:comment_status></item></channel></rss>';
 fs.writeFileSync(path.join(dir,"handballplattformen-wordpress.xml"),xml);
 console.log("PASS: responsive page, four loaded screenshots, coach and athlete demo links; WordPress draft exported.");
 }finally{await browser.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
