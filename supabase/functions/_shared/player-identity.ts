export function phoneLogin(value:string){
 if(!/^\+?[\d ().-]+$/.test(value.trim()))return "";
 let digits=value.replace(/\D/g,"");
 if(digits.startsWith("00"))digits=digits.slice(2);
 else if(!value.trim().startsWith("+")&&digits.length===8)digits="47"+digits;
 return /^[1-9]\d{6,14}$/.test(digits)?"+"+digits:"";
}
export async function playerAlias(identity:string){
 const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(identity));
 return "p."+Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("").slice(0,60)+"@players.lundehaugenil.invalid";
}
