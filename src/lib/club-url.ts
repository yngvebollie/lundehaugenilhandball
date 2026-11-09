export const clubOrigin="https://app.lundehaugenil.no";

// Connected team invites must work on a different device, even when copied
// from a development server. Browser-only demo invites stay in that demo.
export function clubLink(path:string,demoOrigin?:string){
  const base=demoOrigin||clubOrigin;
  const url=new URL(path,base);
  if(!path.startsWith("/")||url.origin!==new URL(base).origin||!["/apply","/join","/login","/player-reset"].includes(url.pathname))throw Error("Ugyldig returadresse.");
  url.hash="";
  return url.href;
}
