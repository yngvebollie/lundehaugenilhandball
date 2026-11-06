import type { Region } from "./workload";

export type Zone = "Quads"|"Glutes"|"Hamstrings"|"Calves"|"Adductors"|"Chest"|"Shoulders"|"Upper back"|"Lats"|"Arms"|"Abs"|"Obliques";
export type Lift = {id:string; name:string; region:Region; zones:Zone[]; dose:string};
type Entry = [name:string, dose:string, ...zones:Zone[]];
function group(region:Region, entries:Entry[]):Lift[]{
  return entries.map(([name,dose,...zones])=>({id:"strength:"+name.toLowerCase().replace(/[^a-z0-9]+/g,"-"),name,region,dose,zones}));
}
export const strength:Lift[]=[
  ...group("Lower body",[
    ["Back squat","3 x 6","Quads","Glutes"],["Front squat","3 x 6","Quads","Glutes"],
    ["Goblet squat","3 x 8","Quads","Glutes"],["Split squat","2 x 8 per side","Quads","Glutes"],
    ["Rear-foot elevated split squat","2 x 6 per side","Glutes","Quads"],["Reverse lunge","2 x 8 per side","Glutes","Quads"],
    ["Lateral lunge","2 x 8 per side","Adductors","Quads"],["Step-up","2 x 8 per side","Glutes","Quads"],
    ["Romanian deadlift","3 x 8","Hamstrings","Glutes"],["Single-leg Romanian deadlift","2 x 6 per side","Hamstrings","Glutes"],
    ["Trap-bar deadlift","3 x 5","Glutes","Quads","Hamstrings"],["Hip thrust","3 x 8","Glutes"],
    ["Single-leg glute bridge","2 x 10 per side","Glutes","Hamstrings"],["Assisted Nordic curl","2 x 4","Hamstrings"],
    ["Slider hamstring curl","2 x 8","Hamstrings"],["Standing calf raise","3 x 12","Calves"],
    ["Seated calf raise","3 x 12","Calves"],["Copenhagen short-lever hold","2 x 15 sec per side","Adductors","Obliques"],
    ["Lateral band walk","2 x 10 steps each way","Glutes"],["Leg press","3 x 8","Quads","Glutes"]
  ]),
  ...group("Upper body",[
    ["Bench press","3 x 6","Chest","Arms"],["Dumbbell bench press","3 x 8","Chest","Arms"],
    ["Push-up","3 x 8","Chest","Arms"],["Incline dumbbell press","3 x 8","Chest","Shoulders"],
    ["Half-kneeling landmine press","2 x 8 per side","Shoulders","Arms"],["Dumbbell overhead press","2 x 8","Shoulders","Arms"],
    ["Pull-up","3 x 5","Lats","Arms"],["Lat pulldown","3 x 8","Lats","Arms"],
    ["One-arm dumbbell row","3 x 8 per side","Lats","Upper back"],["Seated cable row","3 x 8","Upper back","Lats"],
    ["Inverted row","3 x 8","Upper back","Arms"],["Face pull","2 x 12","Upper back","Shoulders"],
    ["Band external rotation","2 x 12 per side","Shoulders"],["Band internal rotation","2 x 12 per side","Shoulders"],
    ["Prone Y raise","2 x 10","Upper back","Shoulders"],["Dumbbell pullover","2 x 8","Lats","Chest"]
  ]),
  ...group("Core",[
    ["Front plank","2 x 30 sec","Abs"],["Side plank","2 x 20 sec per side","Obliques"],
    ["Dead bug","2 x 8 per side","Abs"],["Bird dog","2 x 8 per side","Abs","Glutes"],
    ["Pallof press","2 x 10 per side","Obliques","Abs"],["Cable woodchop","2 x 8 per side","Obliques"],
    ["Suitcase carry","2 x 20 m per side","Obliques","Arms"],["Ab wheel rollout","2 x 6","Abs","Lats"],
    ["Hanging knee raise","2 x 8","Abs"],["Shoulder-tap plank","2 x 10 per side","Obliques","Shoulders"]
  ]),
  ...group("Full body",[
    ["Medicine-ball rotational throw","3 x 5 per side","Obliques","Shoulders","Glutes"],["Medicine-ball chest pass","3 x 5","Chest","Arms"],
    ["Kettlebell swing","3 x 8","Glutes","Hamstrings"],["Push press","3 x 5","Shoulders","Quads","Arms"]
  ])
];
export const broadZones:Partial<Record<Region,Zone[]>>={"Upper body":["Chest","Shoulders","Upper back","Arms"],"Core":["Abs","Obliques"],"Lower body":["Quads","Hamstrings","Glutes","Calves"],"Full body":["Chest","Abs","Quads","Upper back","Glutes"]};
