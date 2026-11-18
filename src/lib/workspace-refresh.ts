export function temporaryReadFailure(error:unknown):boolean {
 if(!error||typeof error!=="object")return false;
 const e=error as {status?:number;code?:string;name?:string;message?:string};
 if(e.status===401||e.status===403||e.code==="42501"||e.code==="PGRST301"||e.code==="PGRST302")return false;
 return e.status===429||!!(e.status&&e.status>=500&&e.status<600)
  ||e.name==="AuthRetryableFetchError"||e.name==="TimeoutError"
  ||/failed to fetch|fetch failed|networkerror|network request failed|load failed/i.test(e.message||"");
}
