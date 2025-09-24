

import React, { useState, useRef, useEffect, useMemo, useContext, useCallback } from 'react';
import { Professional, ScheduledClass, Student, WeeklyAvailability, DayOfWeek, ClassGroup, ClassReport, GroupAttendance, GroupStudentDailyReport } from '../types';
import { db, auth } from '../firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import WeeklyAvailabilityComponent from './WeeklyAvailability';
import ClassReportFormModal from './ClassReportFormModal';
import { ToastContext } from '../App';
import { 
    LogoPlaceholder, ChevronDownIcon, CalendarDaysIcon, ArrowRightOnRectangleIcon, IdentificationIcon, 
    LockClosedIcon, ClockIcon, DocumentTextIcon, UsersIcon, CurrencyDollarIcon, ChartPieIcon,
    ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, UserIcon as UserIconSolid, PlusIcon, XMarkIcon, TrashIcon, CheckCircleIcon
} from './Icons';
import { sanitizeFirestore } from '../utils/sanitizeFirestore';

// --- Modais ---
const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";

// --- Group Student Report Modal ---
const activityOptions = ['Trabalho', 'Tarefas', 'Estudo', 'Outro'];

interface GroupStudentReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (reportData: Omit<GroupStudentDailyReport, 'id' | 'groupId' | 'studentId' | 'date'>) => void;
    student: Student;
    date: string;
    existingReport: GroupStudentDailyReport | null;
}

const GroupStudentReportModal: React.FC<GroupStudentReportModalProps> = ({ isOpen, onClose, onSave, student, date, existingReport }) => {
    const [subjects, setSubjects] = useState<{ discipline: string; activity: string }[]>([{ discipline: '', activity: 'Estudo' }]);
    const [observations, setObservations] = useState('');

    useEffect(() => {
        if (existingReport) {
            setSubjects(existingReport.subjects.length > 0 ? existingReport.subjects : [{ discipline: '', activity: 'Estudo' }]);
            setObservations(existingReport.observations || '');
        } else {
            setSubjects([{ discipline: '', activity: 'Estudo' }]);
            setObservations('');
        }
    }, [existingReport, isOpen]);

    if (!isOpen) return null;

    const handleSubjectChange = (index: number, field: 'discipline' | 'activity', value: string) => {
        const newSubjects = [...subjects];
        newSubjects[index][field] = value;
        setSubjects(newSubjects);
    };

    const addSubject = () => setSubjects([...subjects, { discipline: '', activity: 'Estudo' }]);
    const removeSubject = (index: number) => {
        if (subjects.length > 1) setSubjects(subjects.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        onSave({
            subjects: subjects.filter(s => s.discipline.trim() !== ''),
            observations,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b">
                    <h3 className="font-bold text-zinc-800">Relatório de {student.name}</h3>
                    <p className="text-sm text-zinc-500">Data: {new Date(date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                </header>
                <main className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    <div>
                        <label className={labelStyle}>Matérias e Atividades</label>
                        <div className="space-y-2">
                            {subjects.map((s, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <input type="text" placeholder="Disciplina" value={s.discipline} onChange={e => handleSubjectChange(i, 'discipline', e.target.value)} className={inputStyle} />
                                    <select value={s.activity} onChange={e => handleSubjectChange(i, 'activity', e.target.value)} className={`${inputStyle} w-40`}>
                                        {activityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    <button type="button" onClick={() => removeSubject(i)} className="text-red-500 hover:text-red-700 p-2 disabled:opacity-50" disabled={subjects.length <= 1}><TrashIcon/></button>
                                </div>
                            ))}
                        </div>
                         <button type="button" onClick={addSubject} className="text-sm font-semibold text-secondary hover:underline mt-2 flex items-center gap-1"><PlusIcon className="h-4 w-4"/> Adicionar Matéria</button>
                    </div>
                     <div>
                        <label className={labelStyle}>Observações e Ocorrências</label>
                        <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={4} className={inputStyle}></textarea>
                    </div>
                </main>
                <footer className="p-4 border-t flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 rounded-lg">Cancelar</button>
                    <button type="button" onClick={handleSave} className="py-2 px-6 bg-secondary text-white rounded-lg">Salvar</button>
                </footer>
            </div>
        </div>
    );
};


// --- Group Session Manager ---
interface GroupSessionManagerProps {
    group: ClassGroup;
    students: Student[];
    onBack: () => void;
}

const GroupSessionManager: React.FC<GroupSessionManagerProps> = ({ group, students: allStudents, onBack }) => {
    const { showToast } = useContext(ToastContext);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [attendance, setAttendance] = useState<Map<string, GroupAttendance>>(new Map());
    const [reports, setReports] = useState<Map<string, GroupStudentDailyReport>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [studentForReport, setStudentForReport] = useState<Student | null>(null);

    const groupStudents = useMemo(() => allStudents.filter(s => group.studentIds.includes(s.id)), [allStudents, group.studentIds]);

    useEffect(() => {
        const dateStr = currentDate.toISOString().split('T')[0];
        setIsLoading(true);
        
        const fetchSessionData = async () => {
            try {
                const attendanceQuery = db.collection('groupAttendance').where('groupId', '==', group.id).where('date', '==', dateStr);
                const reportsQuery = db.collection('groupStudentDailyReports').where('groupId', '==', group.id).where('date', '==', dateStr);

                const [attendanceSnap, reportsSnap] = await Promise.all([attendanceQuery.get(), reportsQuery.get()]);

                const newAttendance = new Map<string, GroupAttendance>();
                attendanceSnap.forEach(doc => newAttendance.set(doc.data().studentId, {id: doc.id, ...doc.data()} as GroupAttendance));
                setAttendance(newAttendance);

                const newReports = new Map<string, GroupStudentDailyReport>();
                reportsSnap.forEach(doc => newReports.set(doc.data().studentId, {id: doc.id, ...doc.data()} as GroupStudentDailyReport));
                setReports(newReports);

            } catch (error) {
                showToast("Erro ao carregar dados da turma.", "error");
            } finally {
                setIsLoading(false);
            }
        };
        fetchSessionData();
    }, [group.id, currentDate, showToast]);

    const handleAttendanceChange = async (studentId: string, status: GroupAttendance['status']) => {
        const dateStr = currentDate.toISOString().split('T')[0];
        const existingRecord = attendance.get(studentId);

        const newAttendance = new Map(attendance);
        
        try {
            if (existingRecord) {
                await db.collection('groupAttendance').doc(existingRecord.id).update({ status });
                newAttendance.set(studentId, { ...existingRecord, status });
            } else {
                const newRecordRef = await db.collection('groupAttendance').add({ groupId: group.id, studentId, date: dateStr, status });
                newAttendance.set(studentId, { id: newRecordRef.id, groupId: group.id, studentId, date: dateStr, status });
            }
            setAttendance(newAttendance);
        } catch (error) {
            showToast("Erro ao salvar presença.", "error");
        }
    };
    
    const handleSaveReport = async (reportData: Omit<GroupStudentDailyReport, 'id' | 'groupId' | 'studentId' | 'date'>) => {
        if (!studentForReport) return;
        
        const dateStr = currentDate.toISOString().split('T')[0];
        const existingReport = reports.get(studentForReport.id);
        const reportToSave = { ...reportData, groupId: group.id, studentId: studentForReport.id, date: dateStr };

        try {
            let savedReportId = existingReport?.id;
            if (existingReport) {
                await db.collection('groupStudentDailyReports').doc(existingReport.id).update(sanitizeFirestore(reportToSave));
            } else {
                const docRef = await db.collection('groupStudentDailyReports').add(sanitizeFirestore(reportToSave));
                savedReportId = docRef.id;
            }

            const newReports = new Map(reports);
            newReports.set(studentForReport.id, { id: savedReportId!, ...reportToSave });
            setReports(newReports);
            
            showToast("Relatório salvo!", "success");
        } catch (error) {
             showToast("Erro ao salvar relatório.", "error");
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
             {studentForReport && <GroupStudentReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} onSave={handleSaveReport} student={studentForReport} date={currentDate.toISOString().split('T')[0]} existingReport={reports.get(studentForReport.id) || null} />}
            <header className="flex items-center gap-4 mb-4">
                <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 p-2 rounded-full hover:bg-zinc-100"><ArrowLeftIcon/></button>
                <div>
                    <h2 className="text-2xl font-bold text-zinc-800">{group.name}</h2>
                    <p className="text-sm text-zinc-500">Gerenciamento de Turma</p>
                </div>
            </header>
            <div className="flex items-center justify-center gap-4 mb-4">
                <button onClick={() => setCurrentDate(d => new Date(d.setDate(d.getDate() - 1)))} className="p-2 rounded-full hover:bg-zinc-100"><ChevronLeftIcon /></button>
                <span className="font-semibold text-lg">{currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
                <button onClick={() => setCurrentDate(d => new Date(d.setDate(d.getDate() + 1)))} className="p-2 rounded-full hover:bg-zinc-100"><ChevronRightIcon /></button>
            </div>
            <div className="flex-grow overflow-y-auto border rounded-lg">
                <table className="min-w-full divide-y">
                    <thead className="bg-zinc-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Aluno</th><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Presença</th><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Relatório</th></tr></thead>
                    <tbody className="divide-y">{groupStudents.map(student => {
                        const studentAttendance = attendance.get(student.id)?.status;
                        const hasReport = reports.has(student.id);
                        return (
                            <tr key={student.id} className="hover:bg-zinc-50">
                                <td className="px-4 py-2 font-medium">{student.name}</td>
                                <td className="px-4 py-2"><div className="flex items-center gap-2 text-sm">{['present', 'absent', 'justified'].map(s => <button key={s} onClick={() => handleAttendanceChange(student.id, s as any)} className={`px-2 py-0.5 rounded-full font-semibold ${studentAttendance === s ? 'bg-secondary text-white' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'}`}>{s === 'present' ? 'P' : s === 'absent' ? 'F' : 'J'}</button>)}</div></td>
                                <td className="px-4 py-2">
                                    {studentAttendance === 'present' && <button onClick={() => { setStudentForReport(student); setIsReportModalOpen(true); }} className={`text-sm font-semibold py-1 px-2 rounded-md ${hasReport ? 'bg-secondary/10 text-secondary-dark' : 'bg-zinc-100 text-zinc-600'}`}>{hasReport ? 'Ver/Editar Relatório' : 'Registrar Relatório'}</button>}
                                </td>
                            </tr>
                        );
                    })}</tbody>
                </table>
            </div>
        </div>
    );
};


const UserProfileModal: React.FC<{ isOpen: boolean; onClose: () => void; user: Professional }> = ({ isOpen, onClose, user }) => {
    const { showToast } = useContext(ToastContext) as { showToast: (message: string, type?: 'success' | 'error' | 'info') => void; };
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email || '');
    const [phone, setPhone] = useState(user.phone || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const userRef = db.collection("professionals").doc(user.id);
            const dataToUpdate = { name, email, phone };
            await userRef.update(sanitizeFirestore(dataToUpdate));
            showToast('Dados atualizados com sucesso!', 'success');
            onClose();
        } catch (error) {
            console.error("Error updating user profile:", error);
            showToast("Ocorreu um erro ao salvar os dados.", 'error');
        } finally {
            setIsSaving(false);
        }
    };
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
            <form className="bg-white rounded-lg p-6 w-full max-w-lg m-4" onClick={e => e.stopPropagation()} onSubmit={handleSave}>
                <h3 className="text-xl font-bold text-zinc-800 mb-4">Alterar Dados</h3>
                <div className="space-y-4">
                    <div><label className={labelStyle}>Nome</label><input type="text" className={inputStyle} value={name} onChange={e => setName(e.target.value)} /></div>
                    <div><label className={labelStyle}>Email</label><input type="email" className={inputStyle} value={email} onChange={e => setEmail(e.target.value)} /></div>
                    <div><label className={labelStyle}>Telefone</label><input type="tel" className={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} /></div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 rounded-lg">Cancelar</button>
                    <button type="submit" className="py-2 px-6 bg-secondary text-white rounded-lg" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
                </div>
            </form>
        </div>
    );
};

const ChangePasswordModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { showToast } = useContext(ToastContext) as { showToast: (message: string, type?: 'success' | 'error' | 'info') => void; };
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
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
            } catch (err: any) {
                if (err.code === 'auth/wrong-password') setError('Senha atual incorreta.');
                else setError('Ocorreu um erro ao alterar a senha.');
            }
        }
        setIsLoading(false);
    };
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
            <form className="bg-white rounded-lg p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()} onSubmit={handleChangePassword}>
                <h3 className="text-xl font-bold text-zinc-800 mb-4">Alterar Senha</h3>
                <div className="space-y-4">
                    <div><label className={labelStyle}>Senha Atual</label><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputStyle} required /></div>
                    <div><label className={labelStyle}>Nova Senha</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputStyle} required /></div>
                </div>
                {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 rounded-lg">Cancelar</button>
                    <button type="submit" className="py-2 px-6 bg-secondary text-white rounded-lg" disabled={isLoading}>{isLoading ? 'Salvando...' : 'Salvar'}</button>
                </div>
            </form>
        </div>
    );
};

const DashboardCard: React.FC<{ title: string; value: string | number; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border flex items-start gap-4">
        <div className="bg-secondary/10 p-3 rounded-full">
            <Icon className="h-6 w-6 text-secondary" />
        </div>
        <div>
            <h4 className="text-sm font-medium text-zinc-500">{title}</h4>
            <p className="text-2xl font-bold text-zinc-800">{value}</p>
        </div>
    </div>
);

// --- Componente Principal ---
interface TeacherDashboardProps { onLogout: () => void; currentUser: Professional; }
type View = 'dashboard' | 'availability' | 'groupSession';

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onLogout, currentUser }) => {
    const { showToast } = useContext(ToastContext) as { showToast: (message: string, type?: 'success' | 'error' | 'info') => void; };
    const [view, setView] = useState<View>('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportContext, setReportContext] = useState<any>(null);
    const [selectedGroup, setSelectedGroup] = useState<ClassGroup | null>(null);

    const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
    const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    
    const menuRef = useRef<HTMLDivElement>(null);

    const createSpecificErrorHandler = useCallback((context: string) => (error: any) => {
        console.error(`Firestore (${context}) Error:`, error);
        if (error.code === 'permission-denied') {
            showToast(`Você não tem permissão para ver ${context.toLowerCase()}.`, "error");
        } else if (error.code === 'failed-precondition') {
            showToast(`Erro de configuração: índice ausente para ${context.toLowerCase()}.`, "error");
        } else if (error.code === 'unavailable') {
            showToast("Erro de conexão. Verifique sua internet.", "error");
        } else {
            showToast(`Ocorreu um erro ao buscar dados de ${context.toLowerCase()}.`, "error");
        }
    }, [showToast]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const qClasses = db.collection("scheduledClasses").where("professionalId", "==", currentUser.id).orderBy("date", "asc");
                const classesSnap = await qClasses.get();
                const classesData = classesSnap.docs.map(d => ({id: d.id, ...d.data()})) as ScheduledClass[];
                setScheduledClasses(classesData);

                const qGroups = db.collection("classGroups").where("professionalId", "==", currentUser.id);
                const groupsSnap = await qGroups.get();
                const groupsData = groupsSnap.docs.map(d => ({id: d.id, ...d.data()})) as ClassGroup[];
                setClassGroups(groupsData);
                
                const studentIds = new Set([
                    ...classesData.map(c => c.studentId),
                    ...groupsData.flatMap(g => g.studentIds)
                ]);

                if (studentIds.size > 0) {
                    const studentIdArray = Array.from(studentIds);
                    const studentPromises = [];
                    // Firestore 'in' queries support up to 10 elements per query in older versions.
                    // Chunking the array ensures the query will not fail with a large number of students.
                    for (let i = 0; i < studentIdArray.length; i += 10) {
                        const chunk = studentIdArray.slice(i, i + 10);
                        studentPromises.push(
                            db.collection("students").where(firebase.firestore.FieldPath.documentId(), "in", chunk).get()
                        );
                    }
                    const studentSnapshots = await Promise.all(studentPromises);
                    const studentsData = studentSnapshots.flatMap(snap => 
                        snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student))
                    );
                    setStudents(studentsData);
                } else {
                    setStudents([]);
                }
            } catch (error) {
                createSpecificErrorHandler('dados do painel')(error);
            }
        };
        fetchData();
    }, [currentUser.id, createSpecificErrorHandler]);


    const handleSaveAvailability = async (newAvailability: WeeklyAvailability) => {
        try {
            const profRef = db.collection("professionals").doc(currentUser.id);
            await profRef.update(sanitizeFirestore({ availability: newAvailability }));
            showToast('Disponibilidade salva com sucesso!', 'success');
        } catch (error) {
            showToast("Ocorreu um erro ao salvar.", "error");
        }
    };
    
    const handleSaveClassReport = async (classContext: ScheduledClass, reportData: ClassReport) => {
        try {
            const classRef = db.collection('scheduledClasses').doc(classContext.id);
            const dataToUpdate = {
                report: reportData,
                reportRegistered: true,
                status: 'completed' as const
            };
            await classRef.update(sanitizeFirestore(dataToUpdate));
            
            showToast('Relatório salvo com sucesso!', 'success');
            setIsReportModalOpen(false);
        } catch (error) {
            showToast('Erro ao salvar o relatório.', 'error');
            console.error("Error saving report:", error);
        }
    };

    const { upcomingClasses, pastClasses } = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const all = scheduledClasses
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return {
            upcomingClasses: all.filter(c => c.date >= todayStr),
            pastClasses: all.filter(c => c.date < todayStr),
        };
    }, [scheduledClasses]);

    const { pendingReportsCount } = useMemo(() => {
        const pending = pastClasses.filter(c => !c.reportRegistered).length;
        return { pendingReportsCount: pending };
    }, [pastClasses]);
    
    const handleOpenReportModal = (classToReport: ScheduledClass) => {
        const student = students.find(s => s.id === classToReport.studentId);
        const studentPastClasses = scheduledClasses.filter(c => c.studentId === classToReport.studentId && c.status === 'completed');
        const isFirstReport = studentPastClasses.length === 0 || (studentPastClasses.length === 1 && studentPastClasses[0].id === classToReport.id);
        
        setReportContext({
            class: classToReport,
            student,
            isFirstReport,
        });
        setIsReportModalOpen(true);
    };
    
    const handleViewGroup = (group: ClassGroup) => {
        setSelectedGroup(group);
        setView('groupSession');
    };

    const navItems = [
        { id: 'dashboard', label: 'Painel', icon: ChartPieIcon },
        { id: 'availability', label: 'Disponibilidade', icon: CalendarDaysIcon },
    ];

    const pageTitles: Record<View, string> = {
        dashboard: 'Meu Painel',
        availability: 'Disponibilidade Semanal',
        groupSession: 'Gerenciar Turma',
    };

    const renderContent = () => {
        switch (view) {
            case 'availability':
                return <WeeklyAvailabilityComponent initialAvailability={currentUser.availability || {}} onSave={handleSaveAvailability} />;
            case 'groupSession':
                return selectedGroup && <GroupSessionManager group={selectedGroup} students={students} onBack={() => setView('dashboard')} />;
            case 'dashboard':
            default:
                return (
                    <div className="space-y-6 animate-fade-in-view">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DashboardCard title="Aulas Futuras" value={upcomingClasses.length} icon={CalendarDaysIcon} />
                            <DashboardCard title="Relatórios Pendentes" value={pendingReportsCount} icon={DocumentTextIcon} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <section className="lg:col-span-2 space-y-6">
                                <div>
                                    <h3 className="text-xl font-semibold text-zinc-700 mb-2 flex items-center gap-2">Próximas Aulas</h3>
                                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2 bg-white p-2 border rounded-lg">
                                        {upcomingClasses.length > 0 ? upcomingClasses.map(c => {
                                            const student = students.find(s => s.id === c.studentId);
                                            return (
                                                <div key={c.id} className="bg-zinc-50 p-3 rounded-lg flex justify-between items-center">
                                                    <div>
                                                        <p className="font-bold text-zinc-800">{student?.name || 'Carregando...'}</p>
                                                        <p className="text-sm text-zinc-600 flex items-center">{c.discipline} {c.location === 'online' && <span className="ml-2 text-xs font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">Online</span>} {c.location === 'presencial' && <span className="ml-2 text-xs font-semibold bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">Presencial</span>}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-semibold">{new Date(c.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                                                        <p className="text-sm text-zinc-500 flex items-center gap-1 justify-end"><ClockIcon/> {c.time}</p>
                                                    </div>
                                                </div>
                                            );
                                        }) : <p className="text-center text-zinc-500 p-4">Nenhuma aula futura agendada.</p>}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-zinc-700 mb-2 flex items-center gap-2">Relatórios Pendentes</h3>
                                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2 bg-white p-2 border rounded-lg">
                                        {pastClasses.filter(c => !c.reportRegistered).length > 0 ? pastClasses.filter(c => !c.reportRegistered).map(c => {
                                            const student = students.find(s => s.id === c.studentId);
                                            return (
                                                <div key={c.id} className="bg-amber-50 p-3 rounded-lg flex justify-between items-center">
                                                    <div>
                                                        <p className="font-bold text-amber-800">{student?.name || 'Carregando...'}</p>
                                                        <p className="text-sm text-amber-700 flex items-center">{c.discipline} - {new Date(c.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} {c.location === 'online' && <span className="ml-2 text-xs font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">Online</span>} {c.location === 'presencial' && <span className="ml-2 text-xs font-semibold bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">Presencial</span>}</p>
                                                    </div>
                                                    <button onClick={() => handleOpenReportModal(c)} className="bg-secondary text-white font-semibold py-1 px-3 rounded-md text-sm hover:bg-secondary-dark">Lançar Relatório</button>
                                                </div>
                                            );
                                        }) : <p className="text-center text-zinc-500 p-4">Nenhum relatório pendente.</p>}
                                    </div>
                                </div>
                            </section>
                            <aside className="space-y-6">
                                <div className="bg-white border p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-zinc-700 mb-2">Minhas Turmas</h3>
                                    <ul className="space-y-2">{classGroups.length > 0 ? classGroups.map(g => (
                                        <li key={g.id}>
                                            <button onClick={() => handleViewGroup(g)} className="font-semibold text-left w-full hover:bg-zinc-100 p-2 rounded-md transition-colors">{g.name}</button>
                                        </li>
                                    )) : <p className="text-sm text-zinc-500">Nenhuma turma atribuída.</p>}</ul>
                                </div>
                            </aside>
                        </div>
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
                    <h1 className="text-xl font-semibold text-zinc-700">Portal Professor</h1>
                </div>
                <nav className="flex-grow">
                    <ul className="space-y-2">
                        {navItems.map(item => (
                            <li key={item.id}>
                                <button
                                    onClick={() => setView(item.id as View)}
                                    className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors ${
                                        view === item.id ? 'bg-secondary/10 text-secondary' : 'text-zinc-600 hover:bg-zinc-100'
                                    }`}
                                >
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
                <header className="bg-white shadow-sm p-4 flex justify-between items-center flex-shrink-0 z-10">
                    <h2 className="text-2xl font-bold text-zinc-800">{pageTitles[view]}</h2>
                    <div ref={menuRef} className="relative">
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-100">
                            <span className="font-semibold">{currentUser.name}</span>
                            <ChevronDownIcon open={isMenuOpen} />
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border">
                                <button onClick={() => { setIsProfileModalOpen(true); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm hover:bg-zinc-100"><IdentificationIcon />Alterar Dados</button>
                                <button onClick={() => { setIsPasswordModalOpen(true); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm hover:bg-zinc-100"><LockClosedIcon />Alterar Senha</button>
                                <div className="border-t my-1"></div>
                                <button onClick={onLogout} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"><ArrowRightOnRectangleIcon />Sair</button>
                            </div>
                        )}
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6">
                    {renderContent()}
                </main>
            </div>

            <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} user={currentUser} />
            <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
            <ClassReportFormModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} onSave={handleSaveClassReport} context={reportContext} />

            <style>{`
                @keyframes fade-in-view { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-view { animation: fade-in-view 0.4s ease-out forwards; }
            `}</style>
        </div>
    );
};
export default TeacherDashboard;