import {ImageResponse} from "next/og";
import {readFile} from "node:fs/promises";
import {join} from "node:path";
export const runtime="nodejs";
export async function GET(_request:Request,{params}:{params:Promise<{size:string}>}){
 const size=Number((await params).size);if(![180,192,512].includes(size))return new Response("Not found",{status:404});
 const logo=await readFile(join(process.cwd(),"app","icon.png"));
 return new ImageResponse(<div style={{display:"flex",width:"100%",height:"100%",alignItems:"center",justifyContent:"center",background:"#d00060"}}><img alt="" src={"data:image/png;base64,"+logo.toString("base64")} width={size*.62} height={size*.62}/></div>,{width:size,height:size,headers:{"Cache-Control":"public, max-age=86400"}});
}
