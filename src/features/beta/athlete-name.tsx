export const joinName=(given:string,family:string)=>[given.trim(),family.trim()].filter(Boolean).join(" ");
export function legacyNames(full:string){
  const [given,...rest]=full.trim().split(/\s+/);
  return {given:given||"",family:rest.join(" ")};
}
export function AthleteName({given,family,setGiven,setFamily}:{given:string;family:string;setGiven:(s:string)=>void;setFamily:(s:string)=>void}){
  return <><label>Fornavn<input required maxLength={99} autoComplete="given-name" value={given} onChange={e=>setGiven(e.target.value)}/></label>
    <label>Etternavn<input required maxLength={99} autoComplete="family-name" value={family} onChange={e=>setFamily(e.target.value)}/></label></>;
}
