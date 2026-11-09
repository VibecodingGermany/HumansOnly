"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { config } from "@/lib/config";
import { createDemoSnapshot, SPACE_ID } from "@/lib/seed";
import { createRepository } from "@/lib/repositories";
import type { ClubhouseRepository } from "@/lib/repositories/contract";
import { DEFAULT_NOTIFICATIONS } from "@/lib/model";
import type { Profile, Snapshot } from "@/lib/model";
const empty: Snapshot = {
  profiles: [],
  spaces: [],
  memberships: [],
  posts: [],
  tickets: [],
  votes: [],
  likes: [],
  currentUserId: null,
  email: null,
  settings: { ...DEFAULT_NOTIFICATIONS },
  waitlist: [],
  isAdmin: false,
};
type ClubContext = {
  activeSpaceId: string | null;
  setActiveSpaceId: (id: string | null) => void;
  state: Snapshot;
  me: Profile | undefined;
  ready: boolean;
  loading: boolean;
  error: string;
  notice: string;
  refresh: () => Promise<void>;
  repository: () => ClubhouseRepository;
  report: (error: unknown) => void;
  notify: (message: string) => void;
  dismiss: () => void;
};
const Context = createContext<ClubContext | null>(null);
export function ClubProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Snapshot>(() =>
    config.mode === "demo" ? createDemoSnapshot() : empty,
  );
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(SPACE_ID);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(config.mode === "supabase");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const repo = useRef<ClubhouseRepository | null>(null);
  const revision = useRef(0);
  const report = useCallback(
    (err: unknown) =>
      setError(
        err instanceof Error
          ? err.message
          : "Das hat gerade nicht geklappt. Bitte versuche es noch einmal.",
      ),
    [],
  );
  const refresh = useCallback(async () => {
    if (!repo.current) return;
    const current = ++revision.current;
    try {
      const data = await repo.current.load();
      if (current === revision.current) {
        setState(data);
        setError("");
      }
    } catch (err) {
      report(err);
    } finally {
      if (current === revision.current) setLoading(false);
    }
  }, [report]);
  useEffect(() => {
    let stopped = false;
    let unsubscribe: (() => void) | undefined;
    void createRepository()
      .then(async (instance) => {
        if (stopped) return;
        repo.current = instance;
        unsubscribe = instance.subscribe(() => void refresh());
        await refresh();
        if (!stopped) setReady(true);
      })
      .catch((err) => {
        report(err);
        setLoading(false);
      });
    return () => {
      stopped = true;
      unsubscribe?.();
      repo.current = null;
    };
  }, [refresh, report]);
  const repository = useCallback(() => {
    if (!repo.current) throw new Error("Das Clubhaus lädt noch einen Moment.");
    return repo.current;
  }, []);
  return (
    <Context.Provider
      value={{
        activeSpaceId,
        setActiveSpaceId,
        state,
        me: state.profiles.find((p) => p.id === state.currentUserId),
        ready,
        loading,
        error,
        notice,
        refresh,
        repository,
        report,
        notify: setNotice,
        dismiss: () => {
          setError("");
          setNotice("");
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useClub() {
  const context = useContext(Context);
  if (!context) throw new Error("ClubProvider fehlt.");
  return context;
}
