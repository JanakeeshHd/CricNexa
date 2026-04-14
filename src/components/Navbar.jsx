import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, ShieldAlert } from 'lucide-react';

export const Navbar = () => {
  const { currentUser, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <nav className="glass sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-2xl font-bold">
          <img src="/logo.png" alt="Logo" className="h-10 w-10 rounded-full object-cover border-2 border-neon-blue" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-neon-blue to-neon-pink">
            CricNexa
          </span>
        </Link>
        <div className="flex gap-4">
          {isAdmin ? (
            <>
              <Link to="/admin" className="px-4 py-2 rounded-lg bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/30 transition-colors flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                Admin Panel
              </Link>
              <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-dark-border transition-colors text-red-400">
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <Link to="/admin/login" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center">
              Admin Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};
