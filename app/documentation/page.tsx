import { ArrowLeft, CalendarDays, ClipboardCheck, Gauge, Goal, Users, Library } from "lucide-react";
import { PublicShell } from "@/features/beta/public-shell";

export const metadata={title:"Platform documentation | Lundehaugen IL"};
const features=[
  [Users,"Bring a team together","Coaches can manage multiple teams, invite players and staff, and share team codes. An athlete joins one team, keeps a personal plan and can message the coaching staff."],
  [Users,"Apply to a specific team","Open a new team invitation and register with your name and phone number. Athletes can leave email blank and use their phone number and password. Coaches verify their email. A direct invitation adds the member to its team. Any team coach can approve an athlete. Only an admin coach can approve, invite or remove coaches, or appoint another admin. Every team must keep at least one admin coach."],
  [Users,"Three ways to invite","Share an application link without collecting email addresses, send a private invitation to one or more addresses, or generate a six-character athlete code. Athletes can enter the code at registration. Athletes choose a password; a team coach can provide password help. Team codes and invitations addressed to your own email grant direct admission; new shared invitation links grant direct access to their designated role. Older review links can be replaced by team staff."],
  [Library,"Build reusable sessions","Search 50 strength exercises by muscle or body area, add your own exercises, and save sessions for later. Coach AI can draft a program for a coach to review and edit."],
  [CalendarDays,"Plan the week","Switch between a week board, daily agenda and two-week comparison. Preview a suggested week, edit it in the builder, then save it or publish it to the calendar."],
  [ClipboardCheck,"Follow up with each athlete","Athletes start a workout, check off exercises and mark effort as easy, just right or hard. After completion, they can rate the workout and its exercises from one to five stars and leave their coach a comment."],
  [Gauge,"Review training load","Compare planned and completed work by body area, court minutes and athlete feedback. Review suggested weeks before publishing, and make room for recovery around matches."],
  [Users,"Plan focused training","Coaches can select athletes for footwork, jump development or throwing strength, then edit the exercises before publishing. Athletes see their training, not the coach's group labels."],
  [ClipboardCheck,"Acknowledge team notices","A coach can post a daily or weekly message to one athlete, selected athletes, a training group or the whole roster. Each athlete accepts it individually. Opening a message does not mark it as read."],
  [Goal,"Record match day","Open Kamper to see your squad’s fixtures and results. Import a report, check player goals against year-to-date averages, and export a private PDF. Authorized NIF sync updates fixture and participant information, never a coach's evaluations."],
] as const;
export default function Documentation(){
  return <PublicShell><article className="entry-content public-doc">
    <a className="entry-back" href="/login"><ArrowLeft size={16}/>Back to sign-in</a>
    <h1>Platform documentation</h1>
    <p className="entry-lead">One training record for athletes and coaches at Lundehaugen IL.</p>
    <a href="/handballplattformen">Se plattformen fra trenerens og spillerens perspektiv</a><h2>Why I built it</h2>
    <p>I built this platform to help coaches follow up with every athlete. A week that looks manageable on paper can feel very different after two practices and a match. Seeing the whole week alongside the athlete's feedback helps a coach decide what to adjust.</p>
    <p className="doc-credit">Created by Yngve for Lundehaugen IL.</p>
    <h2>What you can do</h2>
    <dl className="doc-features">{features.map(([Icon,title,body])=><div key={title}><dt><Icon size={19}/>{title}</dt><dd>{body}</dd></div>)}</dl>
    <h2>Train with guidance</h2><p>Use the exercise targets and session checklists to make the prescription clear. The platform can't see an athlete's technique or determine a safe training load on its own. Ask how the athlete feels, observe the movement, and adjust the plan together.</p>
    <footer className="entry-footer"><a href="/login"><ArrowLeft size={16}/>Return to sign-in</a></footer>
  </article></PublicShell>;
}
