

import React, { useState, useRef, useEffect, useMemo, useContext } from 'react';
import { Professional, ScheduledClass, Student, WeeklyAvailability, DayOfWeek, ClassGroup, GroupClassReport, ContinuityItem, ClassReport, ContinuityStatus, DiagnosticReport } from '../types';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, where, doc, updateDoc, addDoc, getDocs } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import WeeklyAvailabilityComponent from './WeeklyAvailability';
import ProfessionalFinancialModal from './ProfessionalFinancialModal';
import { InfoItem } from './InfoItem';
import DiagnosticReportModal from './DiagnosticReportModal';
import { ToastContext } from '../App';
import { 
    LogoPlaceholder, ChevronDownIcon, BirthdayIcon, AlertIcon, CalendarDaysIcon, 
    ArrowRightOnRectangleIcon, IdentificationIcon, LockClosedIcon, BanknotesIcon, XMarkIcon, 
    ClockIcon, DocumentTextIcon, UserPlusIcon, EyeIcon, EyeSlashIcon, UsersIcon, SparklesIcon,
    TrashIcon, PlusIcon
} from './Icons';


// --- Types for Display ---
type DisplayClass = { classType: 'individual'; data: ScheduledClass } | { classType: 'group'; data: ClassGroup; instanceDate: string; time: string };

// --- Modals for Teacher ---
const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";


const UserProfileModal: React.FC<{ isOpen: boolean; onClose: () => void; user: Professional }> = ({ isOpen, onClose, user }) => {
    const { showToast } = useContext(ToastContext);
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email || '');
    const [phone, setPhone] = useState(user.phone || '');
    const [address, setAddress] = useState(user.address || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const userRef = doc(db, "professionals", user.id);
            await updateDoc(userRef, { name, email, phone, address });
            showToast('Dados atualizados com sucesso!', 'success');
            onClose();
        } catch (error: any) {
            console.error("Error updating user profile:", error);
            if (error.code === 'permission-denied') {
                showToast("Você não tem permissão para atualizar seus dados.", "error");
            } else {
                showToast("Ocorreu um erro ao salvar os dados.", 'error');
            }
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
                    <div><label htmlFor="prof-name" className={labelStyle}>Nome</label><input id="prof-name" type="text" className={inputStyle} value={name} onChange={e => setName(e.target.value)} /></div>
                    <div><label htmlFor="prof-email" className={labelStyle}>Email</label><input id="prof-email" type="email" className={inputStyle} value={email} onChange={e => setEmail(e.target.value)} /></div>
                    <div><label htmlFor="prof-phone" className={labelStyle}>Telefone</label><input id="prof-phone" type="tel" className={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} /></div>
                    <div><label htmlFor="prof-address" className={labelStyle}>Endereço</label><input id="prof-address" type="text" className={inputStyle} value={address} onChange={e => setAddress(e.target.value)} /></div>
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
    const { showToast } = useContext(ToastContext);
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
                const credential = EmailAuthProvider.credential(user.email, currentPassword);
                await reauthenticateWithCredential(user, credential);
                await updatePassword(user, newPassword);
                showToast('Senha alterada com sucesso!', 'success');
                onClose();
            } catch (error: any) {
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


const GroupClassDetailModal: React.FC<{ group: ClassGroup | null; onClose: () => void; students: Student[] }> = ({ group, onClose, students }) => {
    if (!group) return null;
    const groupStudents = students.filter(s => group.studentIds.includes(s.id));
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-xl m-4" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-start mb-4 border-b pb-4">
                    <div>
                        <h3 className="text-xl font-bold text-zinc-800">{group.name}</h3>
                        <p className="text-zinc-600">{group.description}</p>
                    </div>
                     <button onClick={onClose} className="p-2 -mt-2 -mr-2 rounded-full text-zinc-400 hover:bg-zinc-100"><XMarkIcon /></button>
                </header>
                <main>
                    <h4 className="font-semibold text-zinc-700 mb-2">Alunos ({groupStudents.length})</h4>
                    <ul className="space-y-2 max-h-64 overflow-y-auto">
                        {groupStudents.map(s => <li key={s.id} className="p-2 bg-zinc-50 rounded-md">{s.name}</li>)}
                    </ul>
                </main>
                <footer className="mt-6 flex justify-end border-t pt-4">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Fechar</button>
                </footer>
            </div>
        </div>
    )
};

const IndividualClassDetailModal: React.FC<{ classData: ScheduledClass | null; onClose: () => void; continuityItems: ContinuityItem[]; students: Student[] }> = ({ classData, onClose, continuityItems, students }) => {
    if (!classData) return null;

    const student = students.find(s => s.id === classData.studentId);
    const studentContinuityItems = continuityItems.filter(i => i.studentId === classData.studentId && i.status !== 'concluido');

    const getStatusStyles = (status: ContinuityItem['status']) => {
        switch (status) {
            case 'em_andamento': return 'bg-blue-100 text-blue-800';
            case 'nao_iniciado': return 'bg-amber-100 text-amber-800';
            case 'concluido': return 'bg-green-100 text-green-800';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl m-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-start mb-4 border-b pb-4">
                    <div>
                        <h3 className="text-xl font-bold text-zinc-800">Detalhes do Aluno e Aula</h3>
                    </div>
                </header>
            </div>
        </div>
    );
};
// --- MAIN COMPONENT ---
interface TeacherDashboardProps {
  onLogout: () => void;
  currentUser: Professional;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onLogout, currentUser }) => {
    const { showToast } = useContext(ToastContext);
    const [view, setView] = useState<'dashboard' | 'availability'>('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isBirthdaysOpen, setIsBirthdaysOpen] = useState(false);

    const [notifications, setNotifications] = useState<any[]>([]);
    const [birthdays, setBirthdays] = useState<any[]>([]);

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
    
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportContext, setReportContext] = useState<any>(null);

    const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);
    
    const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [continuityItems, setContinuityItems] = useState<ContinuityItem[]>([]);
    const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
    const [groupReports, setGroupReports] = useState<GroupClassReport[]>([]);

    const [selectedIndividualClass, setSelectedIndividualClass] = useState<ScheduledClass | null>(null);
    const [selectedGroupClass, setSelectedGroupClass] = useState<ClassGroup | null>(null);

    const menuRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const birthdaysRef = useRef<HTMLDivElement>(null);

    const createErrorHandler = (context: string) => (error: any) => {
        console.error(`Firestore (${context}) Error:`, error);
        if (error.code === 'permission-denied') {
            showToast(`Você não tem permissão para ver ${context.toLowerCase()}.`, "error");
        } else if (error.code === 'failed-precondition') {
            showToast(`Erro de configuração: índice ausente para ${context.toLowerCase()}.`, "error");
        } else if (error.code === 'unavailable') {
            showToast("Erro de conexão. Verifique sua internet.", "error");
        }
    };
    
    useEffect(() => {
        const qClasses = query(collection(db, "scheduledClasses"), where("professionalId", "==", currentUser.id));
        const qGroups = query(collection(db, "classGroups"), where("professionalId", "==", currentUser.id));

        const unsubClasses = onSnapshot(qClasses, snap => setScheduledClasses(snap.docs.map(d=>({id: d.id, ...d.data()})) as ScheduledClass[]), createErrorHandler("aulas agendadas"));
        const unsubGroups = onSnapshot(qGroups, snap => setClassGroups(snap.docs.map(d=>({id: d.id, ...d.data()})) as ClassGroup[]), createErrorHandler("turmas"));
        
        const allStudentIds = [...scheduledClasses.map(c => c.studentId), ...classGroups.flatMap(g => g.studentIds)];
        if (allStudentIds.length > 0) {
            const qStudents = query(collection(db, "students"), where("__name__", "in", [...new Set(allStudentIds)]));
            const unsubStudents = onSnapshot(qStudents, snap => setStudents(snap.docs.map(d => ({id: d.id, ...d.data()})) as Student[]), createErrorHandler("alunos"));
            const qContinuity = query(collection(db, "continuityItems"), where("studentId", "in", [...new Set(allStudentIds)]));
            const unsubContinuity = onSnapshot(qContinuity, snap => setContinuityItems(snap.docs.map(d => ({id: d.id, ...d.data()})) as ContinuityItem[]), createErrorHandler("plano de continuidade"));
            return () => { unsubStudents(); unsubContinuity(); };
        }
        
        return () => { unsubClasses(); unsubGroups(); };
    }, [currentUser.id, showToast]);

    
    const handleSaveAvailability = async (newAvailability: WeeklyAvailability) => {
        try {
            const profRef = doc(db, "professionals", currentUser.id);
            await updateDoc(profRef, { availability: newAvailability });
            showToast('Disponibilidade salva com sucesso!', 'success');
        } catch (error: any) {
            console.error("Error saving availability:", error);
            showToast("Ocorreu um erro ao salvar a disponibilidade.", "error");
        }
    };

    const handleOpenReportModal = (context: any) => {
        setReportContext(context);
        setIsReportModalOpen(true);
    };

    const handleOpenDiagnosticModal = (context: any) => {
        setReportContext(context);
        setIsDiagnosticModalOpen(true);
    };

    const handleSaveReport = async (context: any, reportData: ClassReport) => {
        try {
            if (context.classType === 'individual') {
                const classRef = doc(db, 'scheduledClasses', context.id);
                await updateDoc(classRef, { report: reportData, reportRegistered: true, status: 'completed' });
            } else { // group class
                const reportWithIds: Omit<GroupClassReport, 'id'> = {
                    groupId: context.groupId,
                    studentId: context.studentId,
                    date: context.instanceDate,
                    report: reportData,
                };
                await addDoc(collection(db, 'groupClassReports'), reportWithIds);
            }

            // Update/Create Continuity Items
            if (reportData.continuityCreated) {
                for (const item of reportData.continuityCreated) {
                    await addDoc(collection(db, 'continuityItems'), {
                        ...item,
                        studentId: context.studentId,
                        createdBy: currentUser.id,
                        createdAt: new Date().toISOString().split('T')[0]
                    });
                }
            }
            if (reportData.continuityUpdates) {
                for (const item of reportData.continuityUpdates) {
                    const itemRef = doc(db, 'continuityItems', item.id);
                    await updateDoc(itemRef, { status: item.newStatus });
                }
            }

            showToast('Relatório salvo com sucesso!', 'success');
            setIsReportModalOpen(false);
            setReportContext(null);
        } catch (error) {
            console.error("Error saving report:", error);
            showToast('Ocorreu um erro ao salvar o relatório.', 'error');
        }
    };
    
    const handleSaveDiagnosticReport = async (context: any, reportData: DiagnosticReport) => {
        try {
            const classRef = doc(db, 'scheduledClasses', context.id);
            await updateDoc(classRef, { diagnosticReport: reportData, reportRegistered: true, status: 'completed' });
            
            if(reportData.actionPlan.initialContinuityPlan) {
                for (const item of reportData.actionPlan.initialContinuityPlan) {
                    if (item.description.trim()) {
                        await addDoc(collection(db, 'continuityItems'), {
                            description: item.description,
                            status: 'nao_iniciado',
                            studentId: context.studentId,
                            createdBy: currentUser.id,
                            createdAt: new Date().toISOString().split('T')[0]
                        });
                    }
                }
            }
            
            showToast('Relatório diagnóstico salvo com sucesso!', 'success');
            setIsDiagnosticModalOpen(false);
            setReportContext(null);
        } catch (error) {
             console.error("Error saving diagnostic report:", error);
            showToast('Ocorreu um erro ao salvar o relatório.', 'error');
        }
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const { upcomingClasses, pastClasses } = useMemo(() => {
        const individual = scheduledClasses.map(c => ({ classType: 'individual' as const, data: c }));
        
        const groupInstances: { classType: 'group'; data: ClassGroup; instanceDate: string; time: string }[] = [];
        classGroups.forEach(group => {
            if (group.status !== 'active') return;
            // Generate instances for a reasonable range, e.g., this week and next week for upcoming, last month for past
            const checkStartDate = new Date(); checkStartDate.setDate(checkStartDate.getDate() - 30);
            const checkEndDate = new Date(); checkEndDate.setDate(checkEndDate.getDate() + 14);

            if (group.schedule.type === 'single' && group.schedule.date && group.schedule.time) {
                groupInstances.push({ classType: 'group', data: group, instanceDate: group.schedule.date, time: group.schedule.time });
            } else if (group.schedule.type === 'recurring' && group.schedule.days) {
                for (let d = new Date(checkStartDate); d <= checkEndDate; d.setDate(d.getDate() + 1)) {
                    const dayName = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'][d.getDay()] as DayOfWeek;
                    const time = group.schedule.days[dayName];
                    if (time) {
                         groupInstances.push({ classType: 'group', data: group, instanceDate: d.toISOString().split('T')[0], time: time });
                    }
                }
            }
        });

        const all = [...individual, ...groupInstances].sort((a, b) => {
            const dateA = new Date(`${a.classType === 'individual' ? a.data.date : a.instanceDate}T${a.classType === 'individual' ? a.data.time : a.time}`);
            const dateB = new Date(`${b.classType === 'individual' ? b.data.date : b.instanceDate}T${b.classType === 'individual' ? b.data.time : b.time}`);
            return dateA.getTime() - dateB.getTime();
        });
        
        return {
            upcomingClasses: all.filter(c => (c.classType === 'individual' ? c.data.date : c.instanceDate) >= todayStr),
            pastClasses: all.filter(c => (c.classType === 'individual' ? c.data.date : c.instanceDate) < todayStr).reverse(),
        };

    }, [scheduledClasses, classGroups, todayStr]);

    const renderDashboard = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-view">
            <section className="lg:col-span-2 space-y-6">
                <div>
                    <h3 className="text-xl font-semibold text-zinc-700 mb-2 flex items-center gap-2"><CalendarDaysIcon/> Próximas Aulas</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {upcomingClasses.length > 0 ? upcomingClasses.map((item, idx) => {
                            if (item.classType === 'individual') {
                                const student = students.find(s => s.id === item.data.studentId);
                                return (
                                    <div key={`up-ind-${item.data.id}`} className="bg-zinc-50 p-3 rounded-lg flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-zinc-800">{student?.name || 'Aluno não encontrado'}</p>
                                            <p className="text-sm text-zinc-600">{item.data.discipline} - {item.data.type}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-zinc-700">{new Date(item.data.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                                            <p className="text-sm text-zinc-500 flex items-center justify-end gap-1"><ClockIcon/> {item.data.time}</p>
                                        </div>
                                        <button onClick={() => setSelectedIndividualClass(item.data)} className="ml-4 text-secondary hover:underline font-semibold text-sm">Ver Detalhes</button>
                                    </div>
                                );
                            } else { // group
                                return (
                                     <div key={`up-grp-${item.data.id}-${item.instanceDate}`} className="bg-primary/5 p-3 rounded-lg flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-primary-dark">{item.data.name}</p>
                                            <p className="text-sm text-zinc-600 flex items-center gap-1"><UsersIcon className="h-4 w-4"/> {item.data.studentIds.length} alunos</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-zinc-700">{new Date(item.instanceDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                                            <p className="text-sm text-zinc-500 flex items-center justify-end gap-1"><ClockIcon/> {item.time}</p>
                                        </div>
                                         <button onClick={() => setSelectedGroupClass(item.data)} className="ml-4 text-primary hover:underline font-semibold text-sm">Ver Turma</button>
                                    </div>
                                )
                            }
                        }) : <p className="text-zinc-500 p-4 text-center">Nenhuma aula futura agendada.</p>}
                    </div>
                </div>
                 <div>
                    <h3 className="text-xl font-semibold text-zinc-700 mb-2 flex items-center gap-2"><DocumentTextIcon/> Aulas Anteriores (Pendentes de Relatório)</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                         {pastClasses.filter(c => c.classType === 'individual' && !c.data.reportRegistered).map(item => {
                             const cls = (item as { classType: 'individual', data: ScheduledClass }).data;
                             const student = students.find(s => s.id === cls.studentId);
                             const context = {
                                 id: cls.id,
                                 classType: 'individual',
                                 studentId: cls.studentId,
                                 studentName: student?.name,
                                 discipline: cls.discipline,
                                 date: cls.date,
                                 isDiagnostic: cls.type === 'Avaliação Diagnóstica',
                                 diagnosticReport: cls.diagnosticReport,
                                 report: cls.report,
                             };
                             return (
                                 <div key={`past-${cls.id}`} className="bg-amber-50 p-3 rounded-lg flex items-center justify-between">
                                     <div>
                                        <p className="font-bold text-amber-800">{student?.name}</p>
                                        <p className="text-sm text-amber-700">{cls.discipline} - {new Date(cls.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                                    </div>
                                     <button onClick={() => cls.type === 'Avaliação Diagnóstica' ? handleOpenDiagnosticModal(context) : handleOpenReportModal(context)} className="bg-secondary text-white font-semibold py-1 px-3 rounded-md text-sm hover:bg-secondary-dark">Lançar Relatório</button>
                                 </div>
                             );
                         })}
                         {pastClasses.filter(c => c.classType === 'individual' && !c.data.reportRegistered).length === 0 && (
                            <p className="text-zinc-500 p-4 text-center">Nenhum relatório pendente.</p>
                         )}
                    </div>
                </div>
            </section>
            <aside className="space-y-6">
                <div className="bg-zinc-50 border p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-zinc-700 mb-2">Minhas Turmas</h3>
                     <ul className="space-y-2">
                        {classGroups.map(g => {
                            const studentNames = g.studentIds.map(id => students.find(s => s.id === id)?.name || '').join(', ');
                            return (
                                <li key={g.id} className="text-sm">
                                    <p className="font-bold text-zinc-800">{g.name}</p>
                                    <p className="text-zinc-500 truncate" title={studentNames}>{studentNames}</p>
                                </li>
                            );
                        })}
                     </ul>
                </div>
                <div className="bg-zinc-50 border p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-zinc-700 mb-2">Plano de Continuidade (Ativos)</h3>
                     <ul className="space-y-2">
                        {continuityItems.filter(i => i.status !== 'concluido').map(item => {
                            const student = students.find(s => s.id === item.studentId);
                            return (
                                <li key={item.id} className="p-2 bg-white rounded-md">
                                    <p className="font-semibold text-zinc-800">{student?.name}</p>
                                    <p className="text-sm text-zinc-600">{item.description}</p>
                                </li>
                            );
                        })}
                     </ul>
                </div>
            </aside>
        </div>
    );

    return (
        <div className="min-h-screen bg-neutral font-sans">
            <header className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <LogoPlaceholder />
                    <h1 className="text-xl font-semibold text-zinc-700">Portal do Professor</h1>
                </div>
                <div className="flex items-center gap-2">
                    {/* Placeholder for Notifications/Birthdays */}
                     <div className="relative" ref={menuRef}>
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 text-zinc-600 hover:text-zinc-800 p-2 rounded-lg hover:bg-zinc-100">
                            <span className="font-semibold">{currentUser.name}</span>
                            <ChevronDownIcon className="h-4 w-4" open={isMenuOpen} />
                        </button>
                        {isMenuOpen && (
                             <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 animate-fade-in-fast border">
                                <button onClick={() => {setIsProfileModalOpen(true); setIsMenuOpen(false);}} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"><IdentificationIcon /><span>Alterar Dados</span></button>
                                <button onClick={() => {setIsPasswordModalOpen(true); setIsMenuOpen(false);}} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"><LockClosedIcon /><span>Alterar Senha</span></button>
                                <button onClick={() => {setIsFinancialModalOpen(true); setIsMenuOpen(false);}} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"><BanknotesIcon /><span>Financeiro</span></button>
                                <div className="border-t my-1"></div>
                                <button onClick={onLogout} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"><ArrowRightOnRectangleIcon /><span>Sair</span></button>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            
            <main className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-zinc-800">Meu Painel</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setView('dashboard')} className={`py-2 px-4 rounded-lg font-semibold ${view === 'dashboard' ? 'bg-secondary text-white' : 'bg-white hover:bg-zinc-100'}`}>Painel Principal</button>
                        <button onClick={() => setView('availability')} className={`py-2 px-4 rounded-lg font-semibold ${view === 'availability' ? 'bg-secondary text-white' : 'bg-white hover:bg-zinc-100'}`}>Minha Disponibilidade</button>
                    </div>
                </div>
                
                {view === 'dashboard' ? renderDashboard() : (
                    <div className="animate-fade-in-view">
                        <WeeklyAvailabilityComponent initialAvailability={currentUser.availability || {}} onSave={handleSaveAvailability} />
                    </div>
                )}
                
            </main>

            <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} user={currentUser} />
            <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
            <ProfessionalFinancialModal isOpen={isFinancialModalOpen} onClose={() => setIsFinancialModalOpen(false)} professional={currentUser} />
            <IndividualClassDetailModal classData={selectedIndividualClass} onClose={() => setSelectedIndividualClass(null)} continuityItems={continuityItems} students={students} />
            <GroupClassDetailModal group={selectedGroupClass} onClose={() => setSelectedGroupClass(null)} students={students} />
            <DiagnosticReportModal
                isOpen={isDiagnosticModalOpen}
                onClose={() => setIsDiagnosticModalOpen(false)}
                onSave={handleSaveDiagnosticReport}
                context={reportContext}
            />

             <style>{`
                @keyframes fade-in-view { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-view { animation: fade-in-view 0.4s ease-out forwards; }
                @keyframes fade-in-fast { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in-fast { animation: fade-in-fast 0.1s ease-out forwards; }
            `}</style>
        </div>
    );
};
// FIX: Add default export for TeacherDashboard component.
export default TeacherDashboard;
