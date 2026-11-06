import type { Zone } from "@/lib/strength";

// One side of the body, mirrored around x=50 for bilateral muscle groups.
const silhouette="M50 29 C43 29 40 24 40 16 C40 3 60 3 60 16 C60 24 57 29 50 29 Z M45 29 L44 34 Q40 37 32 37 Q23 38 22 52 L18 73 L13 95 L10 106 Q10 113 14 112 L19 105 L21 96 L28 79 L33 61 Q35 75 32 89 Q28 99 32 120 L35 143 Q32 153 36 170 L39 188 L36 197 Q35 200 46 199 L47 189 L47 163 L49 144 L50 112 L51 144 L53 163 L53 189 L54 199 Q65 200 64 197 L61 188 L64 170 Q68 153 65 143 L68 120 Q72 99 68 89 Q65 75 67 61 L72 79 L79 96 L81 105 L86 112 Q90 113 90 106 L87 95 L82 73 L78 52 Q77 38 68 37 Q60 37 56 34 L55 29 Q50 32 45 29 Z";
type Patch = [Zone,string];
const front:Patch[]=[
  ["Chest","M48 42 Q40 39 32 44 L34 54 Q41 60 48 54Z"],
  ["Shoulders","M32 39 Q24 38 23 53 Q29 56 33 46Z"],
  ["Arms","M24 55 Q20 66 20 74 Q27 71 31 54Z"],
  ["Abs","M48 59 L42 59 Q39 72 43 85 L48 92Z"],
  ["Obliques","M36 57 L40 60 L40 79 L34 86 Q37 70 36 57Z"],
  ["Quads","M34 98 Q30 107 36 134 L39 141 Q46 133 45 107Z"],
  ["Adductors","M40 96 L48 102 L47 123 Q43 114 40 96Z"]
];
const back:Patch[]=[
  ["Upper back","M49 36 L33 42 L35 51 L48 61Z"],
  ["Shoulders","M32 39 Q24 38 23 53 L30 51 L35 44Z"],
  ["Lats","M34 53 L47 62 L45 78 L38 70Z"],
  ["Arms","M24 55 Q20 65 20 75 L26 68 L31 53Z"],
  ["Glutes","M48 85 Q36 82 33 93 L33 101 Q40 107 48 100Z"],
  ["Hamstrings","M33 104 Q34 124 38 140 Q44 140 47 106 Q39 110 33 104Z"],
  ["Calves","M38 146 Q33 155 40 177 L43 184 Q47 156 44 146Z"]
];
export function BodyMap({zones}:{zones:Zone[]}){
  return <svg className="body-diagram" viewBox="0 0 220 230" role="img" aria-label={"Front and back body map. Highlighted: "+(zones.join(", ")||"no mapped muscles")}>
    {[front,back].map((patches,index)=><g key={index} transform={`translate(${index*106+7} 2)`}>
      <path d={silhouette} fill="#eac84f" stroke="#ffdf77" strokeWidth="1.4"/>
      {patches.map(([zone,d])=><g key={zone} fill={zones.includes(zone)?"#fa4b48":"#e2b946"} stroke={zones.includes(zone)?"#952b29":"#ad9137"} strokeWidth=".8"><path d={d}/><path d={d} transform="translate(100 0) scale(-1 1)"/></g>)}
      <text x="50" y="218" textAnchor="middle" fill="#d6dde2" fontSize="10">{index?"BACK":"FRONT"}</text>
    </g>)}
  </svg>;
}
