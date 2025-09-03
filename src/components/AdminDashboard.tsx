import React, { useState, useRef, useEffect, useContext } from 'react';
import StudentList from './StudentList';
import ProfessionalList from './ProfessionalList';
import AgendaView from './AgendaView';
import ClassGroupView from './ClassGroupView';
import SettingsView from './SettingsView';
import FinancialView from './FinancialView';
import { Collaborator, Student, Professional } from '../types'; 
import { db, auth } from '../firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { ToastContext } from '../App';
import { 
    LogoPlaceholder, UserIcon, ChevronDownIcon, BirthdayIcon, BookOpenIcon, UsersIcon, 
    CurrencyDollarIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon, UserPlusIcon, 
    DocumentTextIcon, IdentificationIcon, LockClosedIcon, BanknotesIcon, XMarkIcon, CalendarDaysIcon
} from './Icons';
import { sanitizeFirestore } from '../utils/sanitizeFirestore';

// --- Funções Auxiliares ---
const calculateAge = (birthDateString?: string): number | null => {
    if (!birthDateString) return null;
    try {
        const birthDate = new Date(birthDateString);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    } catch (e) { return null; }
};

const phoneMask = (v: string): string => {
  if (!v) return "";
  v = v.replace(/\D/g, ''); v = v.substring(0, 11);
  if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  else if (v.length > 6) v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
  else v = v.replace(/^(\d*)/, '($1');
  return v;
};

// --- Modais de Perfil ---
const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";

const UserProfileModal: React.FC<{ isOpen: boolean; onClose: () => void; user: Collaborator }> = ({ isOpen, onClose, user }) => {
    const { showToast } = useContext(ToastContext) as { showToast: (message: string, type?: 'success' | 'error' | 'info') => void; };
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email || '');
    const [phone, setPhone] = useState(phoneMask(user.phone || ''));
    const [address, setAddress] = useState(user.address || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const userRef = db.collection("collaborators").doc(user.id);
            const dataToUpdate = { name, email, phone: phone.replace(/\D/g, ''), address };
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
                    <div><label htmlFor="admin-phone" className={labelStyle}>Telefone</label><input id="admin-phone" type="tel" className={inputStyle} value={phone} onChange={e => setPhone(phoneMask(e.target.value))} /></div>
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
type View = 'dashboard' | 'students' | 'professionals' | 'classes' | 'calendar' | 'financial' | 'settings';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, currentUser }) => {
    const [view, setView] = useState<View>('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [birthdays, setBirthdays] = useState<any[]>([]);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    
    const { showToast } = useContext(ToastContext) as { showToast: (message: string, type?: 'success' | 'error' | 'info') => void; };
    const menuRef = useRef<HTMLDivElement>(null);

    const canAccessSettings = currentUser?.adminPermissions?.canAccessSettings ?? false;
    const canAccessFinancial = currentUser?.adminPermissions?.canAccessFinancial ?? false;

    useEffect(() => {
        if (!currentUser || !currentUser.id) return;

        // FIX: Removed server-side orderBy to prevent index error. Sorting is now done client-side.
        const q = db.collection("notifications")
                    .where("recipientUid", "==", currentUser.id);

        const unsubNotifications = q.onSnapshot((snapshot) => {
            const notificationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
            
            // Sort by createdAt descending
            notificationsData.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
                return dateB - dateA;
            });

            setNotifications(notificationsData.slice(0, 10)); // Limit to 10 most recent
        }, (error) => {
            console.error("Firestore (Notifications) Error:", error);
            if (error.code === 'permission-denied') {
                showToast("Você não tem permissão para ver notificações.", "error");
            } else if (error.code === 'failed-precondition') {
                showToast("Erro de configuração do banco de dados (índice de notificações ausente).", "error");
            } else if (error.code === 'unavailable') {
                showToast("Erro de conexão ao buscar notificações.", "error");
            }
        });
        
        const fetchBirthdays = async () => {
            try {
                const studentsSnap = await db.collection("students").get();
                const professionalsSnap = await db.collection("professionals").get();
                
                const today = new Date();
                const todayMonthDay = `${String(today.getMonth() + 1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
                
                const allPeople = [
                    ...studentsSnap.docs.map(d => ({...(d.data() as Student), type: 'student'})),
                    ...professionalsSnap.docs.map(d => ({...(d.data() as Professional), type: 'professional'}))
                ];
                
                const todayBirthdays = allPeople.filter(p => p.birthDate && p.birthDate.substring(5) === todayMonthDay);
                setBirthdays(todayBirthdays);
            } catch (error: any) {
                 if (error.code === 'permission-denied') {
                    console.warn("Permissão negada para buscar aniversariantes.");
                } else {
                    console.error("Erro ao buscar aniversariantes:", error);
                }
            }
        };
        fetchBirthdays();

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        
        return () => {
            unsubNotifications();
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [currentUser, showToast]);

    const unreadNotificationsCount = notifications.filter(n => !n.read).length;

    const renderContent = () => {
        switch (view) {
            case 'students': return <StudentList onBack={() => setView('dashboard')} currentUser={currentUser} />;
            case 'professionals': return <ProfessionalList onBack={() => setView('dashboard')} />;
            case 'calendar': return <AgendaView onBack={() => setView('dashboard')} />;
            case 'classes': return <ClassGroupView onBack={() => setView('dashboard')} />;
            case 'settings': return <SettingsView onBack={() => setView('dashboard')} />;
            case 'financial': return <FinancialView onBack={() => setView('dashboard')} />;
            default: return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-view">
                    <div className="md:col-span-2"><h2 className="text-3xl font-bold text-zinc-800">Painel Administrativo</h2></div>
                    <DashboardCard title="Alunos" value="Gerenciar matrículas" icon={BookOpenIcon} color="secondary" onClick={() => setView('students')} />
                    <DashboardCard title="Profissionais" value="Gerenciar equipe" icon={UserIcon} color="secondary" onClick={() => setView('professionals')} />
                    <DashboardCard title="Turmas" value="Visualizar e montar" icon={UsersIcon} color="secondary" onClick={() => setView('classes')} />
                    <DashboardCard title="Agenda" value="Visualizar aulas" icon={CalendarDaysIcon} color="secondary" onClick={() => setView('calendar')} />
                    <DashboardCard title="Financeiro" value="Contas e recebimentos" icon={CurrencyDollarIcon} color="secondary" onClick={canAccessFinancial ? () => setView('financial') : undefined} disabled={!canAccessFinancial}/>
                    <DashboardCard title="Configurações" value="Ajustes do sistema" icon={Cog6ToothIcon} color="secondary" onClick={canAccessSettings ? () => setView('settings') : undefined} disabled={!canAccessSettings}/>
                </div>
            );
        }
    };

    return (
        <div className="min-h-screen bg-neutral">
            <header className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <LogoPlaceholder />
                    <h1 className="text-xl font-semibold text-zinc-700">Portal Oficina do Aluno</h1>
                </div>
                <div className="flex items-center gap-4">
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
                </div>
            </header>
            
            <main className="p-6">{renderContent()}</main>

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