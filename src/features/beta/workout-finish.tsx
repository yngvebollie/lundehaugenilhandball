import { useEffect, useRef, useState } from "react";
import { CheckCheck, Star } from "lucide-react";
import { saveReview, type Assignment, type WorkoutReview } from "@/lib/beta";
import type { Run } from "./program-builder";
import "./workout-finish.css";

const quotes=["One focused session is a step you can build on.","Progress starts with showing up for today's work.","Small, deliberate efforts add up over a season."];
export function Celebration({title,onClose}:{title:string;onClose:()=>void}){
  const ref=useRef<HTMLDialogElement>(null);
  const [quote]=useState(()=>quotes[Math.floor(Math.random()*quotes.length)]);
  useEffect(()=>{const dialog=ref.current;dialog?.showModal();return ()=>dialog?.close();},[]);
  return <dialog className="finish-dialog" ref={ref} onCancel={onClose} aria-labelledby="finish-title">
    <div aria-hidden="true" className="confetti">{Array.from({length:32},(_,i)=><i key={i} style={{left:((i*37)%100)+"%",backgroundColor:["#ffda55","#84cdba","#ef767a","#b3d9ff"][i%4],animationDelay:((i%7)*.07)+"s"}}/>)}</div>
    <CheckCheck size={32}/><h2 id="finish-title">Congratulations!</h2><p>You completed {title}.</p><blockquote>{quote}</blockquote>
    <button className="btn primary" autoFocus onClick={onClose}>Continue to workout review</button>
  </dialog>;
}
function Stars({label,value,onChange,optional=false}:{label:string;value:number;onChange:(n:number)=>void;optional?:boolean}){
  return <fieldset className="star-picker"><legend>{label}</legend><div>{[1,2,3,4,5].map(n=><button key={n} type="button" aria-label={n+" out of 5"} aria-pressed={value===n} onClick={()=>onChange(optional&&value===n?0:n)}><Star size={22} fill={n<=value?"currentColor":"none"}/></button>)}</div></fieldset>;
}
export function ReviewForm({session,review,run,busy}:{session:Assignment;review?:WorkoutReview;run:Run;busy:boolean}){
  const [stars,setStars]=useState(review?.stars||0),[steps,setSteps]=useState(review?.exercise_stars||session.exercises.map(()=>0)),[comment,setComment]=useState(review?.comment||""),[status,setStatus]=useState("");
  return <form className="grid workout-review" onSubmit={async e=>{e.preventDefault();if(await run(()=>saveReview({assignment:session.id,stars,exercise_stars:steps,comment:comment.trim()},Boolean(review))))setStatus("Review shared with your coach.");}}>
    <h3>Workout review</h3><p className="muted">How useful was the training? Rate the workout and any exercises you want to review.</p>
    <Stars label="Overall workout" value={stars} onChange={n=>{setStars(n);setStatus("");}}/>
    <details className="library-tools"><summary>Rate individual exercises</summary>{session.exercises.map((x,i)=><Stars key={i} label={x} value={steps[i]} optional onChange={n=>{setSteps(steps.map((s,k)=>k===i?n:s));setStatus("");}}/>)}</details>
    <label>Comment for your coach<textarea maxLength={1000} value={comment} onChange={e=>{setComment(e.target.value);setStatus("");}}/></label>
    <button disabled={busy||!stars} className="btn">{review?"Update review":"Save review"}</button>{status&&<p role="status">{status}</p>}
  </form>;
}
