import { Bell, CalendarDays, Check, Home, Play, TrendingUp, UserRound, Users } from "lucide-react";
import { exercises } from "@/data/mock";

export function AthleteApp() {
  return (
    <div className="mobile-shell">
      <main className="mobile-main">
        <div className="mobile-top">
          <div className="mobile-brand">
            <div className="brand-mark" style={{ width: 34, height: 34, fontSize: 12 }}>HB</div>
            HANDBALL
          </div>
          <Bell color="var(--accent)" />
        </div>
        <p className="muted">Hey, Marcus!</p>
        <h1 style={{ fontSize: 44, marginBottom: 6 }}>Today's Training</h1>
        <p className="muted" style={{ marginBottom: 18 }}>Thursday, May 21, 2026</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 14 }}>
          <button className="btn primary">My Plan</button>
          <button className="btn">Team Plan</button>
        </div>
        <section className="panel panel-pad mobile-hero">
          <div>
            <span className="badge orange">Focus of the day</span>
            <h2 style={{ fontSize: 28, marginTop: 10 }}>Speed, Power & Shooting</h2>
            <p className="muted" style={{ marginTop: 8 }}>High intensity workout to improve explosiveness, shot power, and endurance.</p>
          </div>
          <div className="ball" />
        </section>
        <section className="grid metric-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", marginTop: 18 }}>
          <MiniMetric label="Exercises" value="7" />
          <MiniMetric label="Minutes" value="55-70" />
          <MiniMetric label="Intensity" value="High" />
          <MiniMetric label="Focus" value="Full Body" />
        </section>
        <button className="btn primary" style={{ width: "100%", minHeight: 66, fontSize: 20, margin: "18px 0" }}>
          <Play size={24} fill="currentColor" />
          Let's go! Start workout
        </button>
        <div className="page-head" style={{ marginBottom: 10 }}>
          <h2>Exercises</h2>
          <span className="muted">0 / 7 completed</span>
        </div>
        <div className="grid">
          {exercises.map((exercise, index) => (
            <article className="panel exercise-card" key={exercise.name}>
              <div className="badge orange" style={{ width: 34, height: 34, justifyContent: "center" }}>{index + 1}</div>
              <div className="exercise-thumb" />
              <div>
                <h3>{exercise.name}</h3>
                <p className="muted" style={{ fontSize: 13 }}>{exercise.description}</p>
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{exercise.sets} sets · {exercise.reps}</div>
              </div>
              <button className="btn" aria-label={`Complete ${exercise.name}`}>
                <Check size={18} />
              </button>
            </article>
          ))}
        </div>
      </main>
      <nav className="bottom-nav">
        <a className="active" href="#"><Home size={22} />Home</a>
        <a href="#"><CalendarDays size={22} />Today</a>
        <a href="#"><TrendingUp size={22} />Progress</a>
        <a href="#"><Users size={22} />Team</a>
        <a href="#"><UserRound size={22} />Profile</a>
      </nav>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="panel panel-pad" style={{ minHeight: 78 }}>
      <strong>{value}</strong>
      <div className="muted" style={{ fontSize: 13 }}>{label}</div>
    </article>
  );
}

