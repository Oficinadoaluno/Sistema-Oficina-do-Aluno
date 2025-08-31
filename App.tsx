
import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { UserRole, Collaborator, Professional } from './types';
import LoginForm from './components/LoginForm';
import AdminDashboard from './components/AdminDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon, InformationCircleIcon } from './components/Icons';

// --- Toast Notification System ---
type ToastType = 'success' | 'error' | 'info';
interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}
interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

const Toast: React.FC<ToastMessage & { onClose: () => void }> = ({ message, type, onClose }) => {
    const theme = {
        success: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', icon: <CheckCircleIcon className="h-6 w-6 text-green-500" /> },
        error: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', icon: <ExclamationTriangleIcon className="h-6 w-6 text-red-500" /> },
        info: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', icon: <InformationCircleIcon className="h-6 w-6 text-blue-500" /> }
    };
    const currentTheme = theme[type];

    return (
        <div className={`flex items-start w-full gap-3 p-4 rounded-lg shadow-lg border ${currentTheme.bg} ${currentTheme.border} animate-toast-in`}>
            <div className="flex-shrink-0">{currentTheme.icon}</div>
            <div className={`flex-grow text-sm font-semibold ${currentTheme.text}`}>{message}</div>
            <button onClick={onClose} className="p-1 -mt-1 -mr-1 rounded-full hover:bg-black/10"><XMarkIcon className="h-5 w-5" /></button>
        </div>
    );
};


// --- App Structure ---
const buttonThemeConfig = {
  [UserRole.Admin]: {
    bgColor: 'bg-secondary',
    hoverBgColor: 'hover:bg-secondary-dark',
    shadowColor: 'hover:shadow-secondary/30',
  },
  [UserRole.Teacher]: {
    bgColor: 'bg-secondary',
    hoverBgColor: 'hover:bg-secondary-dark',
    shadowColor: 'hover:shadow-secondary/30',
  },
};

interface RoleButtonProps {
  role: UserRole;
  onClick: (role: UserRole) => void;
}

const RoleButton: React.FC<RoleButtonProps> = ({ role, onClick }) => {
  const theme = buttonThemeConfig[role];
  return (
    <button
      onClick={() => onClick(role)}
      className={`w-full flex items-center justify-center py-4 px-4 text-white font-semibold text-lg rounded-xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg ${theme.bgColor} ${theme.hoverBgColor} ${theme.shadowColor}`}
    >
      {role}
    </button>
  );
};

const AppContent: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<Collaborator | Professional | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoadingAuth(true);
      setAuthUser(user);
      if (user) {
        let userDocRef = doc(db, "collaborators", user.uid);
        let userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            setUserData({ id: userDoc.id, ...userDoc.data() } as Collaborator);
            setSelectedRole(UserRole.Admin);
        } else {
            userDocRef = doc(db, "professionals", user.uid);
            userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                setUserData({ id: userDoc.id, ...userDoc.data() } as Professional);
                setSelectedRole(UserRole.Teacher);
            } else {
                console.error("User document not found in 'collaborators' or 'professionals' collections.");
                await signOut(auth);
                setUserData(null);
                setSelectedRole(null);
            }
        }
      } else {
        setUserData(null);
        setSelectedRole(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);
  
  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
  };

  const handleBack = () => {
    setSelectedRole(null);
  };

  const handleLoginSuccess = () => {
    // This is now handled by onAuthStateChanged
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loadingAuth) {
    return (
      <main className="min-h-screen bg-neutral flex items-center justify-center">
        <div className="text-2xl font-semibold text-zinc-500">Carregando...</div>
      </main>
    );
  }

  if (authUser && userData) {
    if (selectedRole === UserRole.Admin) {
      return (
        <main className="min-h-screen bg-neutral font-sans">
           <AdminDashboard onLogout={handleLogout} currentUser={userData as Collaborator} />
        </main>
      );
    }
    if (selectedRole === UserRole.Teacher) {
      return (
         <main className="min-h-screen bg-neutral font-sans">
           <TeacherDashboard onLogout={handleLogout} currentUser={userData as Professional} />
        </main>
      )
    }
  }

  const renderLoginContent = () => {
    if (selectedRole) {
      return <LoginForm role={selectedRole} onBack={handleBack} onLoginSuccess={handleLoginSuccess} />;
    }

    return (
       <div className="text-center animate-fade-in">
        <h1 className="text-2xl font-light text-zinc-600">
          Portal
          <span className="block text-4xl font-bold text-primary">Oficina do Aluno</span>
        </h1>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <RoleButton 
            role={UserRole.Admin}
            onClick={handleRoleSelect}
          />
          <RoleButton 
            role={UserRole.Teacher}
            onClick={handleRoleSelect}
          />
        </div>
      </div>
    );
  };
  
  return (
    <main className="min-h-screen bg-neutral flex flex-col items-center justify-center p-4 font-sans">
      <div className={`w-full ${selectedRole ? 'max-w-lg' : 'max-w-xl'} bg-white rounded-2xl shadow-xl p-8 sm:p-12 transition-all duration-500 relative`}>
        {renderLoginContent()}
      </div>

      <footer className="absolute bottom-4 text-zinc-500 text-sm">
        © {new Date().getFullYear()} Oficina do Aluno. Todos os direitos reservados.
      </footer>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </main>
  );
};

const App: React.FC = () => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = (message: string, type: ToastType = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev.slice(-4), { id, message, type }]); // Keep max 5 toasts
        setTimeout(() => removeToast(id), 5000);
    };

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            <AppContent />
            <div className="fixed top-6 right-6 z-[100] w-full max-w-sm space-y-3">
                {toasts.map(toast => (
                    <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
                ))}
            </div>
            <style>{`
                @keyframes toast-in { 
                    from { opacity: 0; transform: translateX(100%); } 
                    to { opacity: 1; transform: translateX(0); } 
                }
                .animate-toast-in { animation: toast-in 0.3s ease-out forwards; }
            `}</style>
        </ToastContext.Provider>
    );
};


export default App;
