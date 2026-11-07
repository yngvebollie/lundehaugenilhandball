// Only whitelisted cells leave the parser. Do not persist raw text: the source contains dates of birth.
export const parserVersion="nhf-layout-1";
function cell(tokens,x1,x2,y,slop=3){
  return tokens.filter(z=>Math.abs(z.y-y)<=slop&&z.x>=x1&&z.x<x2).sort((a,b)=>a.x-b.x).map(z=>z.text).join(" ").trim();
}
const integer=s=>/^\d+$/.test(s)?Number(s):null;
const date=s=>s?.replace(/^(\d\d)\.(\d\d)\.(\d{4})$/,"$3-$2-$1")||null;
export function layout(pages,method){
  const players=[],issues=[],match={};let complete=true;
  for(const [i,t] of pages.entries()){
    const find=(rx)=>t.find(z=>rx.test(z.text)),near=(rx,x1,x2,dy=0)=>{const a=find(rx);return a?cell(t,x1,x2,a.y+dy):"";};
    if(i===0){
      match.nif_id=integer(near(/^ResPIN$/i,195,250));match.number=near(/^Kamp Nr$/i,80,155)||null;
      match.competition=find(/^Turnering:/i)?.text.replace(/^Turnering:\s*/i,"")||null;
      match.venue=near(/^Hall$/i,25,138,13)||null;
      const dt=near(/^Dato og tid$/i,138,242,13).match(/(\d\d\.\d\d\.\d{4}).*?(\d\d:\d\d)/);
      match.day=date(dt?.[1]);match.time=dt?.[2]||null;
      match.home=near(/^Hjemmelag$/i,25,240,9)||null;match.away=near(/^Bortelag$/i,300,470,9)||null;
      match.home_score=integer(near(/^Sluttresultat$/i,521,545,5));match.away_score=integer(near(/^Sluttresultat$/i,545,570,5));
      match.half_home=integer(near(/^Halv tid$/i,72,93,6));match.half_away=integer(near(/^Halv tid$/i,94,120,6));
    }
    const sections=t.filter(z=>/^Lag [AB]$/i.test(z.text));
    for(const anchor of sections){
      const side=anchor.text.slice(-1).toUpperCase();
      const headers=t.filter(z=>Math.abs(z.y-anchor.y)<3);
      const get=(rx)=>headers.find(z=>rx.test(z.text));
      const goals=get(/^Mål$/i),pen=get(/^7\s*M$/i),total=get(/^Tot$/i),birth=get(/^Fødselsdato/i),warn=get(/^Adv$/i),disq=get(/^D$/),susp=headers.filter(z=>/^2['’]$/.test(z.text)).sort((a,b)=>a.x-b.x);
      if(!birth||!goals||!pen||!total||!warn||!disq||susp.length!==3){issues.push("Ukjente kolonner, lag "+side);complete=false;continue;}
      const end=Math.min(...t.filter(z=>z.y>anchor.y&&/^Leder\s*A/i.test(z.text)).map(z=>z.y),...sections.filter(z=>z.y>anchor.y).map(z=>z.y),anchor.y+185);
      for(const nr of t.filter(z=>z.y>anchor.y+12&&z.y<end&&z.x>=67&&z.x<92&&/^\d{1,3}$/.test(z.text)).sort((a,b)=>a.y-b.y)){
        const y=nr.y,c=(left,right)=>cell(t,left,right,y);
        const name=c(94,birth.x-24);if(!name){issues.push("Uleselig spiller på side "+(i+1));continue;}
        const value=(s)=>s===""&&method==="text"?0:integer(s);
        const mark=(s)=>s===""?method==="text"?false:null:/^x$/i.test(s)?true:null;
        const marks=susp.map(z=>mark(c(z.x-4,z.x+8)));
        const attendance=c(birth.x-22,birth.x-2);
        players.push({side,shirt:nr.text,name,played:/^(nei|no|0|-)$/i.test(attendance)?false:mark(attendance),participation_blank:method==="text"&&attendance==="",
          goals:value(c(goals.x-5,pen.x-7)),penalty:value(c(pen.x-7,total.x-7)),total:value(c(total.x-7,total.x+18)),
          warning:((s)=>s===""?(method==="text"?0:null):/^[0-3]$/.test(s)?Number(s):/^x{1,3}$/i.test(s)?s.length:null)(c(warn.x-3,susp[0].x-4)),suspensions:marks.some(v=>v===null)?null:marks.filter(Boolean).length,
          disqualification:mark(c(disq.x-3,disq.x+10)),page:i+1,x:nr.x,y,source_key:side+":"+nr.text});
      }
    }
  }
  if(!players.length||!complete)issues.push("Rapportoppsettet krever manuell gjennomgang.");
  return {version:parserVersion,method,match,players,issues};
}
async function ocrPage(page,worker){
  const {createCanvas}=await import("@napi-rs/canvas");const v=page.getViewport({scale:2.5});
  if(v.width*v.height>10000000)throw Error("For stor PDF-side.");
  const canvas=createCanvas(Math.ceil(v.width),Math.ceil(v.height));
  await page.render({canvas,viewport:v}).promise;
  const r=await worker.recognize(canvas.toBuffer("image/png"),{},{blocks:true});
  const words=(r.data.blocks||[]).flatMap(b=>b.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.words)));
  const scale=595/v.width;
  return words.filter(w=>w.confidence>=65).map(w=>({text:w.text,x:w.bbox.x0*scale,y:w.bbox.y1*scale}));
}
export async function parseReport(bytes){
  const {getDocument}=await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc=await getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useSystemFonts:true,stopAtErrors:true}).promise;
  let worker;
  try{
    if(doc.numPages>5)throw Error("Maksimalt fem sider per kamprapport.");
    const pages=[];for(let n=1;n<=doc.numPages;n++){
      const p=await doc.getPage(n),v=p.getViewport({scale:1}),scale=595/v.width;
      const items=(await p.getTextContent()).items.filter(i=>i.str?.trim());
      pages.push(items.map(i=>{const [x,y]=v.convertToViewportPoint(i.transform[4],i.transform[5]);return {text:i.str.trim(),x:x*scale,y:y*scale};}));
    }
    const report=layout(pages,"text");if(report.players.length&&report.match.nif_id)return report;
    // Unknown digital layouts are flagged, not reinterpreted as scans.
    if(pages.some(p=>p.length>40))return report;
    const {createWorker}=await import("tesseract.js"),nor=(await import("@tesseract.js-data/nor")).default;
    worker=await createWorker("nor",1,{langPath:nor.langPath,cacheMethod:"none"});
    const scan=[];for(let n=1;n<=doc.numPages;n++)scan.push(await ocrPage(await doc.getPage(n),worker));
    const out=layout(scan,"ocr");out.issues.push("OCR: kontroller alle felt mot originalen.");return out;
  }finally{if(worker)await worker.terminate();await doc.destroy();}
}
