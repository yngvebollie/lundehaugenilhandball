"use client";
import {useEffect} from "react";
import {demo} from "@/lib/beta";
export default function DemoSessions(){
 useEffect(()=>{if(demo)sessionStorage.setItem("nhf-persona",new URLSearchParams(location.search).get("rolle")==="utover"?"liv":"coach");location.replace(new URLSearchParams(location.search).get("vis")==="bank"?"/okter?vis=bank":"/okter");},[]);
 return <p>Åpner økter …</p>;
}
