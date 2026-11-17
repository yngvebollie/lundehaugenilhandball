import type {MetadataRoute} from "next";
export default function manifest():MetadataRoute.Manifest{return {
 id:"/",name:"Lundehaugen IL",short_name:"Lundehaugen",lang:"nb",description:"Trening, kalender, kamper og utvikling i Lundehaugen IL.",
 start_url:"/",scope:"/",display:"standalone",background_color:"#ffffff",theme_color:"#111c38",
 icons:[{src:"/app-icon/192",sizes:"192x192",type:"image/png",purpose:"any"},{src:"/app-icon/512",sizes:"512x512",type:"image/png",purpose:"any"},{src:"/app-icon/512",sizes:"512x512",type:"image/png",purpose:"maskable"}]
};}
