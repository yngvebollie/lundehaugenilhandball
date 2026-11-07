export const focuses=[
  {id:"feet",name:"Quicker feet",session:"Footwork session",lines:["[Conditioning] Quick steps over a line · 2 x 10 sec","[Conditioning] Lateral shuffle and stop · 2 x 3 per side","[Lower body] Standing calf raise · 2 x 8"]},
  {id:"jump",name:"Jump development",session:"Jump and land",lines:["[Lower body] Jump and hold landing · 2 x 3","[Lower body] Step-up · 2 x 6 per side","[Lower body] Single-leg glute bridge · 2 x 8 per side"]},
  {id:"shot",name:"Shot power",session:"Throwing strength",lines:["[Full body] Medicine-ball rotational throw · 2 x 5 per side","[Core] Pallof press · 2 x 8 per side","[Upper body] Band external rotation · 2 x 10 per side"]}
] as const;
export type FocusId=typeof focuses[number]["id"];
export type FocusMember={squad:string;athlete:string;focus:FocusId};
