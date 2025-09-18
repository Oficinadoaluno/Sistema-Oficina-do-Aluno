import React, { useState, useRef, useEffect, useContext } from 'react';
import StudentList from './StudentList';
import ProfessionalList from './ProfessionalList';
import AgendaView from './AgendaView';
import ClassGroupView from './ClassGroupView';
import SettingsView from './SettingsView';
import { Collaborator } from '../types'; 
import { db, auth } from '../firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { ToastContext } from '../App';
import { 
    LogoPlaceholder, UserIcon, ChevronDownIcon, BookOpenIcon, UsersIcon, 
    Cog6ToothIcon, ArrowRightOnRectangleIcon,
    IdentificationIcon, LockClosedIcon, CalendarDaysIcon, ChartPieIcon
} from './Icons';
import { sanitizeFirestore } from '../utils/sanitizeFirestore';

// --- Modais de Perfil ---
const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";

const UserProfileModal: React.FC<{ isOpen: boolean; onClose: () => void; user: Collaborator }> = ({ isOpen, onClose, user }) => {
    const { showToast } = useContext(ToastContext) as { showToast: (message: string, type?: 'success' | 'error' | 'info') => void; };
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email || '');
    const [phone, setPhone] = useState(user.phone || '');
    const [address, setAddress] = useState(user.address || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const userRef = db.collection("collaborators").doc(user.id);
            const dataToUpdate = { name, email, phone, address };
            await userRef.update(sanitizeFirestore(dataToUpdate));
            showToast('Dados atualizados com sucesso!', 'success');
            onClose();
        } catch (error: any) {
            console.error("Error updating user profile:", error);
            showToast("Ocorreu um erro ao salvar os dados.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <form className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg m-4" onClick={e => e.stopPropagation()} onSubmit={handleSave}>
                <h3 className="text-xl font-bold text-zinc-800 mb-4">Alterar Dados</h3>
                <div className="space-y-4">
                    <div><label htmlFor="admin-name" className={labelStyle}>Nome</label><input id="admin-name" type="text" className={inputStyle} value={name} onChange={e => setName(e.target.value)} /></div>
                    <div><label htmlFor="admin-email" className={labelStyle}>Email</label><input id="admin-email" type="email" className={inputStyle} value={email} onChange={e => setEmail(e.target.value)} /></div>
                    <div><label htmlFor="admin-phone" className={labelStyle}>Telefone</label><input id="admin-phone" type="tel" className={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} /></div>
                    <div><label htmlFor="admin-address" className={labelStyle}>Endereço</label><input id="admin-address" type="text" className={inputStyle} value={address} onChange={e => setAddress(e.target.value)} /></div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Cancelar</button>
                    <button type="submit" className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
                </div>
            </form>
        </div>
    );
};

const ChangePasswordModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { showToast } = useContext(ToastContext) as { showToast: (message: string, type?: 'success' | 'error' | 'info') => void; };
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) { setError('A nova senha e a confirmação não correspondem.'); return; }
        if (newPassword.length < 6) { setError('A nova senha deve ter pelo menos 6 caracteres.'); return; }

        setIsLoading(true);
        const user = auth.currentUser;
        if (user && user.email) {
            try {
                const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
                await user.reauthenticateWithCredential(credential);
                await user.updatePassword(newPassword);
                showToast('Senha alterada com sucesso!', 'success');
                onClose();
            } catch (error: any) {
                console.error("Password change error:", error);
                if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') { setError('A senha atual está incorreta.'); } 
                else { setError('Ocorreu um erro ao alterar a senha. Tente novamente.'); }
            }
        } else { setError('Usuário não encontrado. Por favor, faça login novamente.'); }
        setIsLoading(false);
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <form className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()} onSubmit={handleChangePassword}>
                <h3 className="text-xl font-bold text-zinc-800 mb-4">Alterar Senha</h3>
                <div className="space-y-4">
                    <div><label htmlFor="current-password" className={labelStyle}>Senha Atual</label><input id="current-password" type="password" className={inputStyle} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required /></div>
                    <div><label htmlFor="new-password" className={labelStyle}>Nova Senha</label><input id="new-password" type="password" className={inputStyle} value={newPassword} onChange={e => setNewPassword(e.target.value)} required /></div>
                    <div><label htmlFor="confirm-password" className={labelStyle}>Confirmar Nova Senha</label><input id="confirm-password" type="password" className={inputStyle} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></div>
                </div>
                {error && <p className="text-sm text-red-600 text-center mt-4">{error}</p>}
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Cancelar</button>
                    <button type="submit" className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark" disabled={isLoading}>{isLoading ? 'Salvando...' : 'Salvar'}</button>
                </div>
            </form>
        </div>
    );
};

// --- Componentes do Painel ---
interface DashboardCardProps { title: string; value: string; icon: React.ElementType; onClick?: () => void; color: 'secondary'; disabled?: boolean; }

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon: Icon, onClick, color, disabled = false }) => (
    <button onClick={onClick} className={`bg-gradient-to-br from-secondary/80 to-secondary text-white p-6 rounded-xl shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-secondary/30 text-left w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg`} disabled={!onClick || disabled}>
        <div className="flex justify-between items-start">
            <div className="space-y-1"><h3 className="text-xl font-bold">{title}</h3><p className="text-sm opacity-90">{value}</p></div>
            <div className="bg-white/20 p-3 rounded-full"><Icon className="h-6 w-6 text-white" /></div>
        </div>
    </button>
);

// --- Componente Principal ---
interface AdminDashboardProps { onLogout: () => void; currentUser: Collaborator; }
type View = 'dashboard' | 'students' | 'professionals' | 'classes' | 'calendar' | 'settings';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, currentUser }) => {
    const [view, setView] = useState<View>('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const canAccessSettings = currentUser?.adminPermissions?.canAccessSettings ?? false;
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const navItems = [
        { id: 'dashboard', label: 'Painel', icon: ChartPieIcon, canAccess: true },
        { id: 'students', label: 'Alunos', icon: BookOpenIcon, canAccess: true },
        { id: 'professionals', label: 'Profissionais', icon: UserIcon, canAccess: true },
        { id: 'classes', label: 'Turmas', icon: UsersIcon, canAccess: true },
        { id: 'calendar', label: 'Agenda', icon: CalendarDaysIcon, canAccess: true },
        { id: 'settings', label: 'Configurações', icon: Cog6ToothIcon, canAccess: canAccessSettings },
    ];

    const pageTitles: Record<View, string> = {
        dashboard: 'Painel de Controle',
        students: 'Gestão de Alunos',
        professionals: 'Gestão de Profissionais',
        classes: 'Gestão de Turmas',
        calendar: 'Agenda',
        settings: 'Configurações'
    };

    const renderContent = () => {
        switch (view) {
            case 'students': return <StudentList onBack={() => setView('dashboard')} currentUser={currentUser} />;
            case 'professionals': return <ProfessionalList onBack={() => setView('dashboard')} />;
            case 'calendar': return <AgendaView onBack={() => setView('dashboard')} />;
            case 'classes': return <ClassGroupView onBack={() => setView('dashboard')} />;
            case 'settings': return <SettingsView onBack={() => setView('dashboard')} />;
            case 'dashboard':
            default: return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-view">
                    <DashboardCard title="Alunos" value="Gerenciar matrículas" icon={BookOpenIcon} color="secondary" onClick={() => setView('students')} />
                    <DashboardCard title="Profissionais" value="Gerenciar equipe" icon={UserIcon} color="secondary" onClick={() => setView('professionals')} />
                    <DashboardCard title="Turmas" value="Visualizar e montar" icon={UsersIcon} color="secondary" onClick={() => setView('classes')} />
                    <DashboardCard title="Agenda" value="Visualizar aulas" icon={CalendarDaysIcon} color="secondary" onClick={() => setView('calendar')} />
                    <DashboardCard title="Configurações" value="Ajustes do sistema" icon={Cog6ToothIcon} color="secondary" onClick={canAccessSettings ? () => setView('settings') : undefined} disabled={!canAccessSettings}/>
                </div>
            );
        }
    };

    return (
        <div className="flex h-screen bg-neutral font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-white p-4 shadow-lg flex-shrink-0 flex flex-col">
                <div className="flex items-center gap-3 mb-8 px-2">
                    <LogoPlaceholder />
                    <h1 className="text-xl font-semibold text-zinc-700">Oficina do Aluno</h1>
                </div>
                <nav className="flex-grow">
                    <ul className="space-y-2">
                        {navItems.map(item => item.canAccess && (
                            <li key={item.id}>
                                <button onClick={() => setView(item.id as View)} className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors ${view === item.id ? 'bg-secondary/10 text-secondary' : 'text-zinc-600 hover:bg-zinc-100'}`}>
                                    <item.icon className="h-5 w-5" />
                                    <span>{item.label}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>
            
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white shadow-sm p-4 flex justify-between items-center flex-shrink-0 z-10">
                    <h2 className="text-2xl font-bold text-zinc-800">{pageTitles[view]}</h2>
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 text-zinc-600 hover:text-zinc-800 p-2 rounded-lg hover:bg-zinc-100">
                            <span className="font-semibold">{currentUser.name}</span>
                            <ChevronDownIcon className="h-4 w-4" open={isMenuOpen} />
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 animate-fade-in-fast border">
                                <button onClick={() => {setIsProfileModalOpen(true); setIsMenuOpen(false);}} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"><IdentificationIcon /><span>Alterar Dados</span></button>
                                <button onClick={() => {setIsPasswordModalOpen(true); setIsMenuOpen(false);}} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"><LockClosedIcon /><span>Alterar Senha</span></button>
                                <div className="border-t my-1"></div>
                                <button onClick={onLogout} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"><ArrowRightOnRectangleIcon /><span>Sair</span></button>
                            </div>
                        )}
                    </div>
                </header>
                
                {/* Scrollable Content Area */}
                <main className="flex-1 overflow-y-auto p-6">
                    {renderContent()}
                </main>
            </div>

            <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} user={currentUser} />
            <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />

            <style>{`
                @keyframes fade-in-view { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-view { animation: fade-in-view 0.4s ease-out forwards; }
                @keyframes fade-in-fast { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in-fast { animation: fade-in-fast 0.1s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default AdminDashboard;