import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  apiFetch,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
} from "@/lib/api";

export type UserRole = "citizen" | "collector" | "admin";

export interface User {
  id?: string | number;
  email: string;
  display_name?: string;
  full_name?: string;
  phone_number?: string;
  municipality?: string;
  zone?: string;
  role: UserRole;
}

export interface SignupPayload {
  email: string;
  password: string;
  display_name: string;
  phone_number?: string;
  municipality?: string;
  zone?: string;
  role: UserRole;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  signup: (payload: SignupPayload) => Promise<User | null>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTokenState(getToken());
    setUser(getStoredUser<User>());
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ access_token: string; user: User; role?: UserRole }>(
        "/auth/login",
        { method: "POST", body: { email, password }, auth: false }
      );
      const u: User = res.user ?? ({ email, role: res.role ?? "citizen" } as User);
      setToken(res.access_token);
      setStoredUser(u);
      setTokenState(res.access_token);
      setUser(u);
      return u;
    } catch (e: any) {
      setError(e?.message || "Login failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (payload: SignupPayload) => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<any>("/auth/signup", {
        method: "POST",
        body: payload,
        auth: false,
      });
      if (res?.access_token && res?.user) {
        setToken(res.access_token);
        setStoredUser(res.user);
        setTokenState(res.access_token);
        setUser(res.user);
        return res.user as User;
      }
      return (res?.user as User) ?? null;
    } catch (e: any) {
      setError(e?.message || "Signup failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setStoredUser(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!getToken()) return;
    try {
      const me = await apiFetch<User>("/users/me");
      setStoredUser(me);
      setUser(me);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, error, login, signup, logout, refreshMe }),
    [user, token, loading, error, login, signup, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
