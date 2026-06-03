import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
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

  const logout = () => {
    localStorage.removeItem('TOKEN');
    localStorage.removeItem('LOGIN_USER');
    setUser(null);
    setToken(null);
  };

  // ✅ Sửa đúng roleId theo auth.js: 1=admin, 2=staff, 3=user
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
      isAdmin, isStaff, isUser, hasRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
