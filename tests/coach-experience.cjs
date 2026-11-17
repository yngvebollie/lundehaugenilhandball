const assert=require("node:assert/strict"),{chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
(async()=>{const b=await chromium.launch({channel:"msedge"});try{
 const p=await b.newPage({viewport:{width:1440,height:1000}}),base=process.env.BETA_TEST_URL||"http://127.0.0.1:3329";
 p.setDefaultTimeout(12000);const errors=[];p.on("pageerror",e=>errors.push(e.message));
 await p.goto(base+"/login");
 const seeded=await p.evaluate(()=>{
  sessionStorage.setItem("nhf-persona","coach");localStorage.setItem("nhf-beta-v1:seed","1");const day=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Oslo"}).format(new Date()),id=crypto.randomUUID();
  const seed=(id,athlete,squad,personal,completed,title,minutes)=>{const a={id,athlete,squad,day,title,minutes,start_time:"17:00",personal,kind:"Session",exercises:["Push-up"],...(personal?{logged_sets:[{id:"strength:push-up",name:"Push-up",unit:"rep",sets:[12,10]}]}:{})};localStorage.setItem("nhf-beta-v1:plan:"+id,JSON.stringify([a]));if(completed)localStorage.setItem("nhf-beta-v1:check:"+id+":0",JSON.stringify({assignment:id,step:0}));};
  seed("quick-test","liv","demo",true,true,"Hurtiglogget styrke",25);seed("next-test","liv","demo",false,false,"Neste testtrening",45);seed("other-test","liv","other",false,true,"Skal ikke vises",99);
  localStorage.setItem("nhf-beta-v1:feedback:quick-test",JSON.stringify([{assignment:"quick-test",effort:"Hard"}]));
  localStorage.setItem("nhf-court-demo-v1:demo",JSON.stringify([{id,plan:{id,title:"Utkast som ikke sendes",goal:"",venue:"",start:day+"T18:00:00Z",target:3600,purpose:"team",origin:"manual",items:[],kit:"",expected:12},rev:1,published:false,archived:false,edited:new Date().toISOString()}]));
  return {day,id};
 });
 await p.goto(base+"/");await p.getByRole("heading",{name:"Oversikt",exact:true}).waitFor();const nav=p.getByRole("navigation",{name:"Hovedmeny"});
 for(const name of ["Kamper","Spillere","Trening","Utvikling"])await nav.locator("summary").filter({hasText:name}).click();
 const urls=await nav.locator("a").evaluateAll(a=>a.map(n=>n.getAttribute("href")));
 for(const url of ["/#overview","/#weekly","/#builder","/#monitor","/#ratings","/#messages","/spillere","/spillere?vis=plan","/spillere?vis=statistikk","/spillere?vis=rapportkoblinger","/match","/liveanalyse","/okter","/okter?vis=bank","/utvikling","/merker","/challenges","/directory","/team"])assert.ok(urls.includes(url),url);
 await p.getByRole("link",{name:/Utkast som ikke sendes · Utkast/}).waitFor();
 const follow=p.getByRole("region",{name:"Til oppfølging"});await follow.getByRole("link",{name:/1 Utkast/}).waitFor();assert.equal(await follow.getByRole("link",{name:/1 Utkast/}).getAttribute("href"),"/okter?edit="+seeded.id);await follow.getByRole("link",{name:/1 Tung trening/}).waitFor();
 if(process.env.SKETCH_DIR)await p.screenshot({path:process.env.SKETCH_DIR+"/treneroversikt-desktop.png",fullPage:true});
 await follow.getByRole("link",{name:/1 Utkast/}).click();await p.getByRole("heading",{name:"Øktplanlegger",exact:true}).waitFor();assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem("nhf-court-demo-v1:demo"))[0].published),false);
 await p.goto(base+"/?dag=2026-12-23#weekly");await p.getByLabel("Week containing").waitFor();assert.equal(await p.getByLabel("Week containing").inputValue(),"2026-12-21");
 for(const [hash,title] of [["builder","Styrkeprogram"],["weekly","Kalender"],["monitor","Belastning"],["ratings","Øvelsesvurderinger"],["messages","Meldinger"]]){
  await p.goto(base+"/#"+hash);await p.getByRole("heading",{name:title,exact:true,level:1}).waitFor();assert.equal(await nav.locator('a[aria-current="page"]').getAttribute("href"),"/#"+hash);
 }
 await p.goto(base+"/spillere?athlete=liv&uke="+seeded.day+"#plan");await p.getByRole("region",{name:"Spillerstatus"}).getByText("Neste testtrening",{exact:true}).waitFor();
 const row=p.locator("table tbody tr").filter({hasText:"Hurtiglogget styrke"});await row.waitFor();assert.deepEqual(await row.locator("td").allTextContents(),[seeded.day.slice(8)+"."+seeded.day.slice(5,7)+".","–","25 min","Gjennomført"]);assert.equal(await p.getByText("Skal ikke vises",{exact:true}).count(),0);
 for(const width of [390,360]){await p.setViewportSize({width,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.goto(base+"/#builder");await p.getByRole("heading",{name:"Styrkeprogram",exact:true,level:1}).waitFor();assert.equal(await p.locator('.phone-tabs a.current').count(),0);await p.getByRole("button",{name:"Mer",exact:true}).click();const mobile=p.getByRole("navigation",{name:"Flere trenerverktøy"});await mobile.getByRole("link",{name:"Styrkeprogram",exact:true}).waitFor();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.getByRole("button",{name:"Mer",exact:true}).click();}
 await p.goto(base+"/");await p.getByRole("region",{name:"Til oppfølging"}).waitFor();if(process.env.SKETCH_DIR)await p.screenshot({path:process.env.SKETCH_DIR+"/treneroversikt-mobil.png",fullPage:true});
 assert.deepEqual(errors,[]);console.log("PASS: all navigation targets, actionable draft, no automatic publishing, accurate titles/mobile state, scoped player summary, actual quick-log minutes, 360/390px layout");
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
