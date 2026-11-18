import {useState,type ReactNode} from 'react';
import {ChevronDown,MapPin,Trophy} from 'lucide-react';
import './athlete-mobile.css';
export type AthleteGame={id:string;fixture:string;reg:string;team_name:string;day:string;time:string|null;opponent:string;title:string;venue:string|null;score:string|null;completed:boolean;played:boolean;goals:number|null;warnings:number|null;saves:number|null;penalty?:number|null;suspensions?:number|null;disqualifications?:number|null;result?:string|null};
const date=(day:string)=>new Intl.DateTimeFormat('nb-NO',{day:'numeric',month:'short',year:'numeric'}).format(new Date(day+'T12:00:00'));
export function MobileMatchList({games,name,initial='',votes}:{games:AthleteGame[];name:string;initial?:string;votes?:(game:AthleteGame)=>ReactNode}){
 const [level,L]=useState(''),[view,V]=useState(initial&&games.find(g=>g.id===initial&&!g.completed)?'Kommende':'Min statistikk'),[selected,S]=useState(initial),[query,Q]=useState('');
 const rows=games.filter(g=>!level||g.reg===level),unique=[...new Map(rows.filter(g=>g.completed&&g.played).map(g=>[g.fixture,g])).values()];
 const measured=unique.filter(g=>g.goals!==null),goals=measured.reduce((n,g)=>n+g.goals!,0);
 const total=(key:'penalty'|'suspensions'|'warnings'|'disqualifications')=>{const known=unique.filter(g=>g[key]!=null);return known.length?known.reduce((n,g)=>n+g[key]!,0):'–';};
 const list=rows.filter(g=>(view==='Kommende'?!g.completed:view==='Min statistikk'?g.completed&&g.played:g.completed)&&(!query||[g.opponent,g.team_name,g.title].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase()))).sort((a,b)=>(a.day.localeCompare(b.day)||(a.time||'').localeCompare(b.time||''))*(view==='Kommende'?1:-1));
 const trend=unique.filter(g=>g.result).sort((a,b)=>b.day.localeCompare(a.day)||(b.time||'').localeCompare(a.time||'')).slice(0,10).reverse();
 function open(g:AthleteGame){Q('');V('Min statistikk');S(g.id);requestAnimationFrame(()=>document.getElementById('game-'+g.id)?.scrollIntoView({block:'nearest',behavior:'smooth'}));}
 return <section className="athlete-matches grid"><header><span className="eyeline">Spillerstatistikk</span><h2>{name}</h2></header>
 <label>Lag og nivå<select aria-label="Lag og nivå" value={level} onChange={e=>{L(e.target.value);S('');}}><option value="">Alle lag</option>{[...new Map(games.map(g=>[g.reg,g.team_name]))].map(([id,title])=><option key={id} value={id}>{title}</option>)}</select></label>
 <div className="player-metrics"><div><strong>{unique.length}</strong><span>Kamper</span></div><div><strong>{measured.length?goals:'–'}</strong><span>Mål</span></div><div><strong>{measured.length?(goals/measured.length).toLocaleString('nb-NO',{maximumFractionDigits:1}):'–'}</strong><span>Mål / kamp</span></div></div>
 <dl className="discipline-metrics">{[['7m',total('penalty')],['2m',total('suspensions')],['Gultkort',total('warnings')],['Rødtkort',total('disqualifications')]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
 <div className="result-totals" aria-label="Sesongresultater">{[['W','Seire'],['D','Uavgjort'],['L','Tap']].map(([key,label])=><span key={key}><b className={'result-letter result-'+key}>{key}</b>{unique.filter(g=>g.result===key).length} {label}</span>)}</div>
 {trend.length>0&&<section className="match-trend"><h3>Siste {trend.length} kamper</h3><div>{trend.map(g=><button key={g.fixture} className={'result-letter result-'+g.result} title={date(g.day)+' · '+g.opponent+' · '+g.score} aria-label={g.result+' '+date(g.day)+' mot '+g.opponent+' '+g.score} onClick={()=>open(g)}>{g.result}</button>)}</div><small>Eldste til venstre · nyeste til høyre</small></section>}
 <nav className="match-view-tabs" aria-label="Kampvisning">{['Min statistikk','Resultater','Kommende'].map(v=><button key={v} aria-pressed={v===view} onClick={()=>{V(v);S('');}}>{v}</button>)}</nav>
 <label>Søk etter kamp<input type="search" value={query} onChange={e=>Q(e.target.value)} placeholder="Motstander eller lag"/></label>
 <p className="muted">{list.length} kamper · Snittet bruker kamper med registrerte mål. «–» betyr at data mangler. 7m er straffemål, inkludert i mål totalt.</p>
 <div className="mobile-game-list">{list.map(g=><article key={g.id} className="mobile-game" id={'game-'+g.id}>
 <button className="mobile-game-toggle" aria-expanded={selected===g.id} onClick={()=>S(selected===g.id?'':g.id)}><span className="game-date">{date(g.day)}{g.time&&' · '+g.time.slice(0,5)}</span><span className="game-team">{g.team_name}</span><strong className="game-title">{g.title}</strong><strong className="game-score">{g.score?.replace(' (egne mål først)','')||'–'}</strong><span className="game-personal">{g.played?<><Trophy size={14}/> {g.goals??'–'} mål</>:g.completed?'Deltakelse ikke registrert':'Kommende kamp'}{g.fixture.startsWith('cup:')&&' · Egne mål først'}</span><ChevronDown size={17} className={selected===g.id?'expanded':''}/></button>
 {selected===g.id&&<div className="mobile-game-detail"><p><MapPin size={15}/> {g.venue||'Sted ikke oppgitt'}</p>{g.played&&<dl className="game-stat-grid">{[['Mål',g.goals],['7m',g.penalty],['2m',g.suspensions],['Gultkort',g.warnings],['Rødtkort',g.disqualifications],['Redninger',g.saves]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value??'–'}</dd></div>)}</dl>}{g.completed&&g.played&&votes?.(g)}</div>}
 </article>)}</div>{!list.length&&<p>Ingen kamper i dette utvalget.</p>}
 </section>;
}

