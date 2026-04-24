import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, getApiUrl, setAuthToken, queryClient } from "@/lib/query-client";
import { fetch } from "expo/fetch";

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: "customer" | "vendor" | "admin";
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: string;
  shopName?: string;
  productType?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "auth_token";
const USER_KEY = "cached_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, cachedUserStr] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);

        if (storedToken) {
          setAuthToken(storedToken);

          // Immediately restore from cache so UI never flashes to login
          if (cachedUserStr) {
            try {
              const cachedUser: User = JSON.parse(cachedUserStr);
              setUser(cachedUser);
              setToken(storedToken);
            } catch {}
          }

          // Refresh user data from server in background, but NEVER log user out
          // Token will be validated passively on each API call
          try {
            const baseUrl = getApiUrl();
            const url = new URL("/api/auth/me", baseUrl);
            const res = await fetch(url.toString(), {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            if (res.ok) {
              const userData: User = await res.json();
              setUser(userData);
              setToken(storedToken);
              // Update cache with latest server data
              await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
            }
            // If server rejects token, keep user logged in from cache
            // They will only be logged out by their own explicit logout action
          } catch {
            // Network error: keep the cached user logged in
          }
        }
      } catch {
        // Ignore unexpected errors
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await res.json();
    setUser(data.user);
    setToken(data.token);
    setAuthToken(data.token);
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, data.token),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user)),
    ]);
    queryClient.clear();
  };

  const register = async (registerData: RegisterData) => {
    const res = await apiRequest("POST", "/api/auth/register", registerData);
    const data = await res.json();
    setUser(data.user);
    setToken(data.token);
    setAuthToken(data.token);
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, data.token),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user)),
    ]);
    queryClient.clear();
  };

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch {}
    setUser(null);
    setToken(null);
    setAuthToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    queryClient.clear();
  };

  const value = useMemo(
    () => ({ user, token, isLoading, login, register, logout }),
    [user, token, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
