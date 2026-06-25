import { createContext, useContext, useEffect, useState } from 'react';
import { saveToken, getToken, clearToken } from './storage';
import { setAuthToken, apiLogin, apiSignup, apiMe } from './api/chat';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState([]);

  // On launch: restore a saved token and load the profile.
  useEffect(() => {
    (async () => {
      const t = await getToken();
      if (t) {
        setAuthToken(t);
        try {
          const me = await apiMe();
          setUser(me.user);
          setProgress(me.progress || []);
        } catch {
          await clearToken();
          setAuthToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const refresh = async () => {
    try {
      const me = await apiMe();
      setUser(me.user);
      setProgress(me.progress || []);
      return me;
    } catch {
      return null;
    }
  };

  const afterAuth = async (r) => {
    setAuthToken(r.token);
    await saveToken(r.token);
    setUser(r.user);
    await refresh();
  };

  const login = async (email, password) => afterAuth(await apiLogin(email, password));
  const signup = async (email, password, name) => afterAuth(await apiSignup(email, password, name));
  const logout = async () => {
    await clearToken();
    setAuthToken(null);
    setUser(null);
    setProgress([]);
  };

  return (
    <Ctx.Provider value={{ loading, user, progress, login, signup, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
