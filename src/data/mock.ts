export type Athlete = {
  name: string;
  position: string;
  team: string;
  group: string;
  status: "Active" | "Paused" | "Injured";
  compliance: number;
  workload: number;
  streak: number;
  trainingTime: string;
};

export type Exercise = {
  name: string;
  description: string;
  sets: string;
  reps: string;
  rest: string;
  type: string;
};

export const metrics = [
  { label: "Team Compliance", value: "92%", trend: "+5% vs last week", tone: "green" },
  { label: "Training Time", value: "4,340 min", trend: "+12% this week", tone: "blue" },
  { label: "Avg Load", value: "730 AU", trend: "Optimal range", tone: "purple" },
  { label: "At Risk", value: "3", trend: "Needs review", tone: "orange" }
];

export const athletes: Athlete[] = [
  { name: "Stine Bredal Oftedal", position: "Playmaker", team: "Norway Women", group: "Start Team", status: "Active", compliance: 100, workload: 730, streak: 15, trainingTime: "3h 20m" },
  { name: "Nora Mork", position: "Right Back", team: "Norway Women", group: "Start Team", status: "Active", compliance: 94, workload: 690, streak: 12, trainingTime: "3h 05m" },
  { name: "Henny Reistad", position: "Left Back", team: "Norway Women", group: "Start Team", status: "Active", compliance: 89, workload: 760, streak: 9, trainingTime: "3h 42m" },
  { name: "Kari Brattset Dale", position: "Line Player", team: "Norway Women", group: "Rehab", status: "Paused", compliance: 78, workload: 420, streak: 4, trainingTime: "1h 55m" }
];

export const exercises: Exercise[] = [
  { name: "Agility Ladder - Quick Feet", description: "Move through the ladder as fast as possible with quick feet.", sets: "3", reps: "30 sec", rest: "45 sec", type: "Speed" },
  { name: "Jump Shot Practice", description: "Practice jump shots from different positions with balance and accuracy.", sets: "4", reps: "10 reps", rest: "60 sec", type: "Power" },
  { name: "Explosive Push Ups", description: "Explode up with power and control the movement down.", sets: "4", reps: "8-12 reps", rest: "75 sec", type: "Strength" },
  { name: "Battle Ropes", description: "Swing the ropes with intensity and maintain a strong stance.", sets: "3", reps: "40 sec", rest: "60 sec", type: "Conditioning" }
];

export const calendarDays = [
  { day: "Mon 19", events: [{ title: "Team Meeting", time: "09:00 - 10:00", type: "meeting" }, { title: "Strength Training", time: "11:00 - 12:30", type: "training" }] },
  { day: "Tue 20", events: [{ title: "Travel to Trondheim", time: "07:30 - 09:00", type: "travel" }, { title: "Tactical Training", time: "10:30 - 12:00", type: "training" }] },
  { day: "Wed 21", events: [{ title: "Match vs Byasen", time: "10:00 - 12:00", type: "match" }, { title: "Recovery", time: "16:00 - 17:00", type: "travel" }] },
  { day: "Thu 22", events: [{ title: "Recovery Session", time: "09:30 - 11:00", type: "training" }, { title: "Skills Training", time: "13:00 - 14:30", type: "training" }] },
  { day: "Fri 23", events: [{ title: "Tactical Training", time: "11:00 - 12:30", type: "training" }, { title: "Coaches Meeting", time: "18:30 - 19:30", type: "meeting" }] },
  { day: "Sat 24", events: [{ title: "Match vs Larvik", time: "09:00 - 11:00", type: "match" }, { title: "Travel to Oslo", time: "15:00 - 16:30", type: "travel" }] },
  { day: "Sun 25", events: [{ title: "Active Recovery", time: "10:00 - 12:00", type: "training" }] }
];

export const workoutRows = [
  { exercise: "Warm up", sets: "-", reps: "10 min", rest: "-", muscle: "Full Body", type: "Warm Up", notes: "Rask oppvarming" },
  { exercise: "Squat", sets: "4", reps: "8", rest: "90 sec", muscle: "Quadriceps, Glutes", type: "Strength", notes: "Tung belastning" },
  { exercise: "Romanian Deadlift", sets: "4", reps: "8", rest: "90 sec", muscle: "Hamstrings, Glutes", type: "Strength", notes: "Hold noytral rygg" },
  { exercise: "Walking Lunge", sets: "3", reps: "12", rest: "60 sec", muscle: "Quadriceps, Glutes", type: "Strength", notes: "Hvert ben" },
  { exercise: "Plank", sets: "3", reps: "45 sec", rest: "45 sec", muscle: "Core", type: "Core", notes: "Hold kroppen strak" }
];

