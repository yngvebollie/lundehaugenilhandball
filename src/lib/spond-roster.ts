export const playerNameKey=(name:string)=>name.normalize("NFC").trim().replace(/\s+/g," ").toLocaleLowerCase("nb-NO");

export function parseSpondRoster(text:string):string[]{
 const names=new Map<string,string>();
 const lines=text.split(/\r?\n/).map(source=>source.replace(/\[image\]\([^)]*\)/gi,"").replace(/^\s*[-•*]\s+/,"")
  .trim().replace(/^\*\*|\*\*$/g,"").replace(/^["“«]+|["”»]+$/g,"").trim().normalize("NFC").replace(/\s+/g," "));
 const participantHeading=/^(?:svarte\s+)?(?:deltar|kommer)(?:\s*\(\d+\))?$/i;
 const otherHeading=/^(?:svarte\s+)?(?:deltar ikke|kommer ikke|kan ikke|ikke svart|har ikke svart|venteliste)(?:\s*\(\d+\))?$/i;
 const start=lines.findIndex(line=>participantHeading.test(line));
 for(const name of lines.slice(start+1)){
  if(otherHeading.test(name)){if(start>=0)break;continue;}
  if(!name||name.length>150||participantHeading.test(name))continue;
  if(!/^[\p{L}\p{M}][\p{L}\p{M} .’'\-]*$/u.test(name))continue;
  if(!names.has(playerNameKey(name)))names.set(playerNameKey(name),name);
 }
 return [...names.values()];
}
