import type {Report} from "./report-text";
export async function downloadReport(report:Report,revision:number){
  const {PDFDocument,StandardFonts,rgb}=await import("pdf-lib");
  const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
  const m=report.match;doc.setTitle("Kamprapport "+m.nif_id);doc.setAuthor("Lundehaugen IL");
  let page=doc.addPage([595,842]),y=790;
  const txt=(v:unknown,x:number,size=10,strong=false)=>{
    const value=Array.from(String(v??"–").replace(/[\r\n\t]/g," ")).map(c=>{try{font.encodeText(c);return c;}catch{return "?";}}).join("");
    page.drawText(value,{x,y,size,font:strong?bold:font,color:rgb(.09,.14,.13)});
  };
  const header=()=>{txt("LUNDEHAUGEN IL    /    KAMPRAPPORT",36,11,true);y-=34;
    txt(m.home+" – "+m.away+"   "+m.home_score+"–"+m.away_score,36,18,true);y-=22;
    txt([m.day,m.time,m.venue].filter(Boolean).join("  ·  "),36);y-=18;txt(m.competition,36);y-=18;
    txt("ResPIN "+m.nif_id+"   |   Kamp "+m.number+"   |   Lagret revisjon "+revision,36);y-=32;};
  header();
  for(const side of ["A","B"] as const){
    const heading=()=>{txt(side==="A"?m.home:m.away,36,14,true);y-=22;
      for(const [s,x] of [["Nr",36],["Navn",63],["Spilt",270],["Mål",314],["7 m",350],["Tot",385],["Adv",421],["2 min",457],["Diskv.",507]] as const)txt(s,x,10,true);y-=18;};
    if(y<130){page=doc.addPage([595,842]);y=790;header();}heading();
    for(const p of report.players.filter(p=>p.side===side)){
      if(y<70){page=doc.addPage([595,842]);y=790;header();heading();}
      txt(p.shirt,36);txt(p.name,63,Math.min(10,200/Math.max(1,p.name.length)*1.65));txt(p.played==null?"?":p.played?"Ja":"Nei",270);
      txt(p.goals,314);txt(p.penalty,350);txt(p.total,385);txt(p.warning==null?"?":Number(p.warning),421);txt(p.suspensions,457);txt(p.disqualification==null?"?":p.disqualification?"Ja":"Nei",507);y-=18;
    }y-=22;
  }
  doc.getPages().forEach((p,i)=>p.drawText("Privat trenerrapport  |  "+(i+1)+" / "+doc.getPageCount(),{x:36,y:32,font,size:9}));
  const bytes=await doc.save(),url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:"application/pdf"}));
  const a=document.createElement("a");a.href=url;a.download="Kamprapport-"+m.nif_id+"-r"+revision+".pdf";a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
