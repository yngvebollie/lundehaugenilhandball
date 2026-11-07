export function handballId(input:string,kind:"lag"|"turnering"){
  let value=input.trim();
  if(!/^\d+$/.test(value)){
    let url:URL;
    try{url=new URL(value);}catch{throw Error("Oppgi ID eller en lenke fra handball.no for "+kind+".");}
    if(!["https:","http:"].includes(url.protocol)||!["www.handball.no","handball.no"].includes(url.hostname)||
      url.pathname.replace(/\/$/,"")!=="/system/kamper/"+kind)throw Error("Velg "+(kind==="lag"?"lagets side, ikke seriesiden.":"seriesiden, ikke lagets side."));
    value=url.searchParams.get(kind==="lag"?"lagid":"turnid")||"";
  }
  const id=Number(value);
  if(!/^\d+$/.test(value)||!Number.isSafeInteger(id)||id<=0||id>2147483647)throw Error("Ugyldig ID for "+kind+".");
  return id;
}
export const leagueIds=(value:string)=>[...new Set(value.trim().split(/[,;\s]+/).filter(Boolean).map(v=>handballId(v,"turnering")))];
