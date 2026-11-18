import {createClient} from '@supabase/supabase-js';
import {env} from '@/lib/env';
export const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function invitationUser(req:Request){
 const token=req.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token||!env.supabaseUrl||!env.supabaseAnonKey)return null;
 const db=createClient(env.supabaseUrl,env.supabaseAnonKey,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.auth.getUser(token);
 return !error&&data.user?{db,user:data.user}:null;
}
export function deliveryStore(){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 return key&&env.supabaseUrl?createClient(env.supabaseUrl,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;
}
