import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import type { OAuthUser } from "@/types";
import {
  startLogin,
  doLogout,
  getUserFromStoredToken,
} from "@/services/cognito";

interface AuthContextType {
  user: OAuthUser | null;
  setUser: (user: OAuthUser | null) => void;
  authenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<OAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = getUserFromStoredToken();
    if (storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const handleLogin = async () => {
    await startLogin();
  };

  const handleLogout = async () => {
    setUser(null);
    await doLogout();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        authenticated: !!user,
        login: handleLogin,
        logout: handleLogout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
