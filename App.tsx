
import React, { useState, useEffect } from 'react';
import { UserRole, Collaborator, Professional } from './types';
import LoginForm from './components/LoginForm';
import AdminDashboard from './components/AdminDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

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

const App: React.FC = () => {
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
           {/* FIX: Pass currentUser prop to TeacherDashboard */}
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

export default App;
