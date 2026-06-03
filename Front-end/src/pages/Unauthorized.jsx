import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Unauthorized = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleBack = () => {
    if (user?.role === 'admin') navigate('/admin');
    else navigate('/dashboard');
  };

  return (
    <div style={styles.page}>
      <div style={styles.box}>
        <div style={styles.icon}>🔒</div>
        <h2 style={styles.title}>Không có quyền truy cập</h2>
        <p style={styles.desc}>
          Bạn không có quyền vào trang này.
          {user && <><br />Tài khoản của bạn là: <strong>{user.role}</strong></>}
        </p>
        <button onClick={handleBack} style={styles.btn}>
          Về trang của tôi
        </button>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: '#f0f2f5',
  },
  box: {
    background: '#fff', borderRadius: 12, padding: '48px 40px',
    textAlign: 'center', maxWidth: 380, width: '100%',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 },
  desc: { color: '#666', fontSize: 14, lineHeight: 1.6, marginBottom: 24 },
  btn: {
    padding: '10px 24px', background: '#1677ff', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer',
  },
};

export default Unauthorized;
