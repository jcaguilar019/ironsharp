import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authClient } from "./auth-client";

export type SessionUser = { id: string; email: string; name?: string } | null;

type SessionContextType = {
  user: SessionUser;
  isPending: boolean;
  /** Re-read the session from Neon Auth (call after sign in/up/out). */
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionContextType>({
  user: null,
  isPending: true,
  refresh: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser>(null);
  const [isPending, setIsPending] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await authClient.getSession();
      const u = res?.data?.user;
      setUser(u ? { id: u.id, email: u.email, name: u.name ?? undefined } : null);
    } catch {
      setUser(null);
    } finally {
      setIsPending(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <SessionContext.Provider value={{ user, isPending, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
