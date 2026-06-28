import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('TOKEN');
    const savedUser  = localStorage.getItem('LOGIN_USER');
    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
      } catch {
        localStorage.removeItem('TOKEN');
        localStorage.removeItem('LOGIN_USER');
      }
    }
    setLoading(false);
  }, []);

  // ── logout: xóa storage + reset state ────────────────────────────────────
  // Navigate về "/" phải làm ở component gọi logout (Sidebar, Home...)
  // vì AuthContext không nên dùng useNavigate trực tiếp
  const logout = useCallback(() => {
    localStorage.removeItem('TOKEN');
    localStorage.removeItem('token');
    localStorage.removeItem('LOGIN_USER');
    setUser(null);
    setToken(null);
  }, []);

  const isAdmin = () => user?.roleId === 1;
  const isStaff = () => user?.roleId === 2;
  const isUser  = () => user?.roleId === 3;
  const hasRole = (roleId) => user?.roleId === roleId;

  return (
    <AuthContext.Provider value={{
      user, setUser,
      token, setToken,
      loading,
      logout,
      isAdmin, isStaff, isUser, hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
