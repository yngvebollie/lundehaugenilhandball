import {useCallback, useEffect, useRef, useState} from "react";
import {db, demo} from "@/lib/beta";
import type {LiveMatch} from "@/lib/live-match";

type MatchRow = {id: string; revision: number; write_id: string; document: LiveMatch};
const columns = "id,revision,write_id,document";

function readLocal(key: string): MatchRow[] {
  const rows: MatchRow[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const item = localStorage.key(index);
    if (!item?.startsWith(key + ":")) continue;
    const value = localStorage.getItem(item);
    if (value) rows.push(JSON.parse(value));
  }
  return rows.sort((a, b) => a.revision - b.revision);
}

function mergeRows(rows: MatchRow[], drafts: MatchRow[]) {
  const matches = new Map(rows.map(row => [row.id, row]));
  for (const draft of drafts) {
    if ((matches.get(draft.id)?.revision ?? 0) <= draft.revision) matches.set(draft.id, draft);
  }
  return [...matches.values()].sort((a, b) => b.document.date.localeCompare(a.document.date));
}

async function readMatches(team: string, id?:string) {
  if(id){
    const {data}=await db!.from("beta_live_match_logs").select(columns).eq("team",team).eq("id",id).maybeSingle().throwOnError();
    return data?[data as MatchRow]:[];
  }
  const matches: MatchRow[] = [];
  for (let offset = 0; ; offset += 100) {
    const {data} = await db!.from("beta_live_match_logs").select(columns).eq("team", team)
      .order("created_at", {ascending: false}).order("id").range(offset, offset + 99).throwOnError();
    matches.push(...data as MatchRow[]);
    if (data.length < 100) return matches;
  }
}

async function upload(team: string, row: MatchRow) {
  const {id, ...fields} = row;
  const result = row.revision === 1
    ? await db!.from("beta_live_match_logs").insert({...row, team}).select("write_id").single()
    : await db!.from("beta_live_match_logs").update(fields).eq("team", team).eq("id", id)
      .eq("revision", row.revision - 1).select("write_id").maybeSingle();
  if (result.data?.write_id === row.write_id) return;
  if (result.error && result.error.code !== "23505") throw result.error;

  const remote = await db!.from("beta_live_match_logs").select("write_id").eq("id", id)
    .eq("team", team).maybeSingle().throwOnError();
  if (remote.data?.write_id !== row.write_id) {
    throw new Error("Kampen har en annen versjon på serveren. Dine endringer ligger fortsatt på denne enheten.");
  }
}

export function useLiveMatchStorage(team: string, user: string, id?:string) {
  const key = "live-matches:" + team + ":" + user;
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [pending, setPending] = useState(false);
  const latest = useRef<MatchRow[]>([]);
  const flushing = useRef(false);

  const flush = useCallback(async () => {
    if (demo || flushing.current) return;
    flushing.current = true;
    setSyncing(true);
    setSaveError("");
    try {
      const sendPending = async () => {
        const blocked = new Set<string>();
        while (true) {
          const row = readLocal(key).find(row => !blocked.has(row.id));
          if (!row) break;
          try {
            await upload(team, row);
            localStorage.removeItem(key + ":" + row.write_id);
          } catch (error) {
            blocked.add(row.id);
            setSaveError(error instanceof Error ? error.message : "Kunne ikke synkronisere. Endringene er lagret på denne enheten.");
          }
        }
        setPending(readLocal(key).length > 0);
      };
      if (navigator.locks) await navigator.locks.request(key, sendPending);
      else await sendPending();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Kunne ikke synkronisere. Endringene er lagret på denne enheten.");
    } finally {
      flushing.current = false;
      setSyncing(false);
    }
  }, [key, team]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const local = readLocal(key).filter(row=>!id||row.id===id);
      latest.current = mergeRows(latest.current, local);
      setRows(latest.current);
      setPending(!demo && local.length > 0);
      const remote = demo ? [] : await readMatches(team,id);
      latest.current = mergeRows(mergeRows(remote, latest.current), readLocal(key).filter(row=>!id||row.id===id));
      setRows(latest.current);
    } catch {
      setLoadError("Kunne ikke hente kampene fra serveren.");
    } finally {
      setLoading(false);
    }
    void flush();
  }, [flush, id, key, team]);

  useEffect(() => {
    void load();
    const online = () => void flush();
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [flush, load]);

  function save(id: string, update: (previous?: LiveMatch) => LiveMatch) {
    const previous = latest.current.find(row => row.id === id);
    const row = {id, revision: (previous?.revision ?? 0) + 1, write_id: crypto.randomUUID(), document: update(previous?.document)};
    const next = mergeRows(latest.current, [row]);
    try {
      localStorage.setItem(key + ":" + (demo ? row.id : row.write_id), JSON.stringify(row));
    } catch {
      setSaveError("Kunne ikke lagre på enheten. Endringen ble ikke registrert.");
      return false;
    }
    latest.current = next;
    setRows(next);
    if (demo) setSaveError("");
    else {
      setPending(true);
      void flush();
    }
    return true;
  }

  return {rows, loading, loadError, saveError, syncing, pending, save, reload: load, retry: flush};
}
