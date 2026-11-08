import {serveDevelopment} from "./lib/development/server.js";
Deno.serve(req=>serveDevelopment(req,{url:Deno.env.get("SUPABASE_URL"),anonKey:Deno.env.get("SUPABASE_ANON_KEY"),serviceKey:Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}));
