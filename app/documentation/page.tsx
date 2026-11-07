import { ArrowLeft, CalendarDays, ClipboardCheck, Gauge, Goal, Users, Library } from "lucide-react";
import { PublicShell } from "@/features/beta/public-shell";

export const metadata={title:"Platform documentation | NHF Performance Platform"};
const features=[
  [Users,"Bring a team together","Coaches can manage multiple teams, invite players and staff, and share team codes. An athlete joins one team, keeps a personal plan and can message the coaching staff."],
  [Library,"Build reusable sessions","Search 50 strength exercises by muscle or body area, add your own exercises, and save sessions for later. Coach AI can draft a program for a coach to review and edit."],
  [CalendarDays,"Plan the week","Build sessions from the exercise library, save programs, and schedule strength work alongside team practices, games and personal training."],
  [ClipboardCheck,"Follow up with each athlete","Athletes check off exercises and rate a session as easy, just right or hard. Coaches can see what was completed and draft an individual follow-up."],
  [Gauge,"Review training load","Compare planned and completed work by body area, court minutes and athlete feedback. Review suggested weeks before publishing, and make room for recovery around matches."],
  [Goal,"Record match day","On a tablet, select the lineup, mark shot locations, record goals and assists, and review each player's totals."],
] as const;
export default function Documentation(){
  return <PublicShell><article className="entry-content public-doc">
    <a className="entry-back" href="/login"><ArrowLeft size={16}/>Back to sign-in</a>
    <h1>Platform documentation</h1>
    <p className="entry-lead">One training record for athletes and coaches at Lundehaugen IL.</p>
    <h2>Why I built it</h2>
    <p>I built this platform to help coaches follow up with every athlete. A week that looks manageable on paper can feel very different after two practices and a match. Seeing the whole week alongside the athlete's feedback helps a coach decide what to adjust.</p>
    <p className="doc-credit">Created by Yngve for Lundehaugen IL.</p>
    <h2>What you can do</h2>
    <dl className="doc-features">{features.map(([Icon,title,body])=><div key={title}><dt><Icon size={19}/>{title}</dt><dd>{body}</dd></div>)}</dl>
    <h2>Train with guidance</h2><p>Use the exercise targets and session checklists to make the prescription clear. The platform can't see an athlete's technique or determine a safe training load on its own. Ask how the athlete feels, observe the movement, and adjust the plan together.</p>
    <footer className="entry-footer"><a href="/login"><ArrowLeft size={16}/>Return to sign-in</a></footer>
  </article></PublicShell>;
}
