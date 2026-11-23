export function selectFixtures(doc:unknown,registration:{season:number;org_id:number;leagues:number[]}):{
  id:number;league:number;day:string;time:string|null;home:string;away:string;opponent:string;
  competition:string;age:string;venue:string;score:string|null;status:string;completed:boolean;
}[];
