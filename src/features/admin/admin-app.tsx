import {
  Activity,
  BarChart3,
  CalendarDays,
  Dumbbell,
  FileText,
  Home,
  Mail,
  Plus,
  Settings,
  Shield,
  Users,
  UserRound
} from "lucide-react";
import { athletes, calendarDays, metrics, workoutRows } from "@/data/mock";

const nav = [
  { label: "Dashboard", icon: Home, active: true },
  { label: "Workouts", icon: Dumbbell },
  { label: "Calendar", icon: CalendarDays },
  { label: "Team", icon: Users },
  { label: "Athletes", icon: UserRound },
  { label: "Progress", icon: Activity },
  { label: "Messages", icon: Mail },
  { label: "Reports", icon: FileText },
  { label: "Settings", icon: Settings }
];

export function AdminApp() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">NH</div>
          <div>
            Norges Handballforbund
            <br />
            Kvinner
          </div>
        </div>
        <nav className="nav-section">
          <div className="nav-label">Admin Panel</div>
          {nav.map((item) => (
            <a className={`nav-item ${item.active ? "active" : ""}`} href="#" key={item.label}>
              <item.icon size={18} />
              {item.label}
            </a>
          ))}
          <div className="nav-label">Library</div>
          <a className="nav-item" href="#">
            <Shield size={18} />
            Saved Workouts
          </a>
          <a className="nav-item" href="#">
            <BarChart3 size={18} />
            Templates
          </a>
        </nav>
        <div className="sidebar-footer">
          <div className="user-card">
            <div className="avatar">A</div>
            <div>
              <strong>Admin</strong>
              <div className="muted">admin@handball.no</div>
            </div>
          </div>
          <div className="muted">Log out</div>
        </div>
      </aside>
      <main className="main">
        <Header />
        <section className="grid metric-grid">
          {metrics.map((metric) => (
            <article className="panel panel-pad metric" key={metric.label}>
              <span className={`badge ${metric.tone}`}>{metric.label}</span>
              <div>
                <div className="metric-value">{metric.value}</div>
                <div className="trend">{metric.trend}</div>
              </div>
            </article>
          ))}
        </section>
        <div className="tabs">
          <span className="tab active">Overview</span>
          <span className="tab">Workout Builder</span>
          <span className="tab">Calendar</span>
          <span className="tab">Athletes</span>
          <span className="tab">Load Management</span>
        </div>
        <section className="grid dashboard-grid">
          <div className="grid">
            <WorkoutBuilder />
            <CalendarPanel />
          </div>
          <div className="grid">
            <AthleteDetail />
            <AthleteTable />
          </div>
        </section>
      </main>
    </div>
  );
}

function Header() {
  return (
    <div className="page-head">
      <div>
        <div className="eyeline">Dashboard</div>
        <h1>Performance Operations</h1>
        <p className="muted">Plan training, monitor athlete load, and keep the national squad aligned.</p>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button className="btn">Export Report</button>
        <button className="btn primary">
          <Plus size={18} />
          Create Workout
        </button>
      </div>
    </div>
  );
}

function WorkoutBuilder() {
  return (
    <article className="panel panel-pad">
      <div className="page-head" style={{ marginBottom: 14 }}>
        <div>
          <h2>Create Workout Plan</h2>
          <p className="muted">AI preview and editable exercise rows before publishing.</p>
        </div>
        <button className="btn primary">Publish Workout Plan</button>
      </div>
      <div className="tabs">
        <span className="tab">1 Input</span>
        <span className="tab active">2 Preview & Edit</span>
        <span className="tab">3 Plan for Week</span>
        <span className="tab">4 Publish</span>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Exercise</th>
            <th>Sets</th>
            <th>Reps</th>
            <th>Rest</th>
            <th>Muscle Group</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {workoutRows.map((row) => (
            <tr key={row.exercise}>
              <td>
                <strong>{row.exercise}</strong>
                <div className="muted">{row.notes}</div>
              </td>
              <td>{row.sets}</td>
              <td>{row.reps}</td>
              <td>{row.rest}</td>
              <td>{row.muscle}</td>
              <td>
                <span className="badge blue">{row.type}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function CalendarPanel() {
  return (
    <article className="panel panel-pad">
      <div className="page-head" style={{ marginBottom: 16 }}>
        <div>
          <h2>Calendar</h2>
          <p className="muted">May 19 - May 25, 2026</p>
        </div>
        <button className="btn">
          <Plus size={18} />
          Add Event
        </button>
      </div>
      <div className="calendar-grid">
        <div className="calendar-cell muted">Time</div>
        {calendarDays.map((day) => (
          <div className="calendar-cell" key={day.day}>
            <strong>{day.day}</strong>
            <div style={{ marginTop: 12 }}>
              {day.events.map((event) => (
                <div className={`event ${event.type}`} key={`${day.day}-${event.title}`}>
                  <strong>{event.time}</strong>
                  <div>{event.title}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function AthleteDetail() {
  const athlete = athletes[0];
  return (
    <article className="panel panel-pad">
      <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 20 }}>
        <div className="avatar" style={{ width: 78, height: 78 }}>SO</div>
        <div>
          <h2>{athlete.name}</h2>
          <p className="muted">#7 · {athlete.position}</p>
          <span className="badge green">{athlete.status}</span>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <SmallStat label="Training" value={athlete.trainingTime} />
        <SmallStat label="Workload" value={`${athlete.workload} AU`} />
        <SmallStat label="Compliance" value={`${athlete.compliance}%`} />
        <SmallStat label="Streak" value={`${athlete.streak} days`} />
      </div>
      <div className="chart-line" style={{ marginTop: 18 }}>
        <svg viewBox="0 0 420 170" role="img" aria-label="Compliance trend">
          <polyline points="12,130 85,78 160,68 240,74 330,52 408,36" fill="none" stroke="#39c95f" strokeWidth="4" />
          <line x1="0" y1="122" x2="420" y2="122" stroke="#2d8cff" strokeDasharray="4 5" opacity=".7" />
        </svg>
      </div>
    </article>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
      <strong>{value}</strong>
    </div>
  );
}

function AthleteTable() {
  return (
    <article className="panel panel-pad">
      <h2>Athletes</h2>
      <p className="muted" style={{ marginBottom: 12 }}>Roster compliance and load snapshot.</p>
      <table className="table">
        <tbody>
          {athletes.map((athlete) => (
            <tr key={athlete.name}>
              <td>
                <strong>{athlete.name}</strong>
                <div className="muted">{athlete.position}</div>
              </td>
              <td>{athlete.compliance}%</td>
              <td>{athlete.workload} AU</td>
              <td>
                <span className={athlete.status === "Active" ? "badge green" : "badge orange"}>{athlete.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

