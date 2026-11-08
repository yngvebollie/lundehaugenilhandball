import type {Plan,CatalogItem} from "./model";
import type {SessionRef} from "./catalog";
export type Packet={rev:number;plan:Plan;limit:number;keeper:boolean;keeperAxes:string[];coach:boolean;catalog:CatalogItem[];sessions:SessionRef[];notes:{at:string;text:string}[]};
