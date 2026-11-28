import {useId,useLayoutEffect,useRef,type ReactNode} from "react";
import {X} from "lucide-react";
import "./live-matches.css";

export function MatchEventDialog({title,children,onCancel}:{title:string;children:ReactNode;onCancel:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 const titleId=useId();
 useLayoutEffect(()=>{
  const dialog=ref.current;
  const opener=document.activeElement;
  dialog?.showModal();
  dialog?.querySelector<HTMLElement>("[data-event-focus]")?.focus();
  return()=>{
   dialog?.close();
   if(opener instanceof HTMLElement&&opener.isConnected)opener.focus({preventScroll:true});
  };
 },[]);
 return <dialog ref={ref} className="match-event-dialog" aria-labelledby={titleId}
  onCancel={event=>{event.preventDefault();onCancel();}}
  onKeyDown={event=>{
   if(event.key!=="Escape")return;
   event.preventDefault();
   event.stopPropagation();
   onCancel();
  }}>
  <header>
   <h3 id={titleId}>{title}</h3>
   <button className="btn" type="button" aria-label="Lukk hendelsen" onClick={onCancel}><X size={19}/></button>
  </header>
  {children}
 </dialog>;
}
