type Draft={club:string;coach:string;expires:number};
const storageKey=(email:string)=>"nhf-club-request:"+email.trim().toLowerCase();

export function rememberClubDraft(email:string,club:string,coach:string){
 try{
  localStorage.setItem(storageKey(email),JSON.stringify({club,coach,expires:Date.now()+24*60*60*1000}));
 }catch{
  // Auth metadata still carries the details when the email creates an account.
 }
}

export function readClubDraft(email:string):Draft|null{
 try{
  const key=storageKey(email);
  const saved=localStorage.getItem(key);
  if(!saved)return null;
  const draft=JSON.parse(saved) as Partial<Draft>|null;
  if(draft&&typeof draft.expires==="number"&&draft.expires>Date.now()&&
   typeof draft.club==="string"&&draft.club.length<=80&&typeof draft.coach==="string"&&draft.coach.length<=100)return draft as Draft;
  localStorage.removeItem(key);
 }catch{
  // Storage can be unavailable in a restricted browser session.
 }
 return null;
}

export function clearClubDraft(email:string){
 try{localStorage.removeItem(storageKey(email));}catch{}
}
