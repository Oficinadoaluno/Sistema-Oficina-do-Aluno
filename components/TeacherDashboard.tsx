import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Professional, ScheduledClass, Student, WeeklyAvailability, DayOfWeek, ClassGroup, GroupClassReport, ContinuityItem, ClassReport, ContinuityStatus, DiagnosticReport } from '../types';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, where, doc, updateDoc, addDoc, getDocs } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import WeeklyAvailabilityComponent from './WeeklyAvailability';
import ProfessionalFinancialModal from './ProfessionalFinancialModal';
import { InfoItem } from './InfoItem';
import DiagnosticReportModal from './DiagnosticReportModal';
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
            alert('Dados atualizados com sucesso!');
            onClose();
        } catch (error) {
            console.error("Error updating user profile:", error);
            alert("Ocorreu um erro ao salvar os dados.");
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
                alert('Senha alterada com sucesso!');
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
                        <p className="text-zinc-600 font-semibold">{student?.name || 'N/A'}</p>
                    </div>
                     <button onClick={onClose} className="p-2 -mt-2 -mr-2 rounded-full text-zinc-400 hover:bg-zinc-100"><XMarkIcon /></button>
                </header>
                <main className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                    
                    <fieldset>
                        <legend className="text-lg font-semibold text-zinc-700 mb-2">Informações do Aluno</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-zinc-50 rounded-lg">
                            <InfoItem label="Colégio" value={student?.school} />
                            <InfoItem label="Material Didático" value={student?.didacticMaterial} />
                            <div className="md:col-span-2">
                                <InfoItem label="Principal Objetivo" value={student?.objective} />
                            </div>
                        </div>
                    </fieldset>
                    
                     <fieldset>
                        <legend className="text-lg font-semibold text-zinc-700 mb-2">Detalhes da Próxima Aula</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-zinc-50 rounded-lg">
                            <InfoItem label="Disciplina" value={classData.discipline} />
                            <div className="md:col-span-2">
                                <InfoItem label="Conteúdo a ser Abordado" value={classData.content} />
                            </div>
                        </div>
                    </fieldset>
                    
                     <fieldset>
                        <legend className="text-lg font-semibold text-zinc-700 mb-2">Resumo do Aluno (IA)</legend>
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                            <SparklesIcon className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
                            <p className="text-sm text-blue-800">
                                Resumo gerado por IA sobre o progresso e dificuldades do aluno estará disponível aqui em breve. 
                                Esta funcionalidade analisará todos os relatórios preenchidos para fornecer insights valiosos.
                            </p>
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend className="text-lg font-semibold text-zinc-700 mb-2">Plano de Continuidade Ativo</legend>
                        <div className="space-y-2">
                            {studentContinuityItems.length > 0 ? studentContinuityItems.map(item => (
                                <div key={item.id} className="p-3 bg-zinc-50 rounded-lg flex justify-between items-center">
                                    <p className="text-zinc-800">{item.description}</p>
                                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStatusStyles(item.status)}`}>
                                        {item.status.replace('_', ' ')}
                                    </span>
                                </div>
                            )) : <p className="text-zinc-500 text-sm p-4 text-center bg-zinc-50 rounded-lg">Nenhum item de continuidade ativo para este aluno.</p>}
                        </div>
                    </fieldset>
                </main>
                <footer className="mt-6 flex justify-end border-t pt-4">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Fechar</button>
                </footer>
            </div>
        </div>
    );
};

const StudentQuickViewModal: React.FC<{ student: Student | null; onClose: () => void; continuityItems: ContinuityItem[] }> = ({ student, onClose, continuityItems }) => {
    if (!student) return null;

    const studentContinuityItems = continuityItems.filter(i => i.studentId === student.id && i.status !== 'concluido');
     const getStatusStyles = (status: ContinuityItem['status']) => {
        switch (status) {
            case 'em_andamento': return 'bg-blue-100 text-blue-800';
            case 'nao_iniciado': return 'bg-amber-100 text-amber-800';
            case 'concluido': return 'bg-green-100 text-green-800';
        }
    };
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-xl m-4" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-start mb-4 border-b pb-4">
                    <div>
                        <h3 className="text-xl font-bold text-zinc-800">Visão Rápida do Aluno</h3>
                        <p className="text-zinc-600 font-semibold">{student.name}</p>
                    </div>
                     <button onClick={onClose} className="p-2 -mt-2 -mr-2 rounded-full text-zinc-400 hover:bg-zinc-100"><XMarkIcon /></button>
                </header>
                <main className="space-y-4 max-h-80 overflow-y-auto pr-2">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-zinc-50 rounded-lg">
                        <InfoItem label="Colégio" value={student.school} />
                        <InfoItem label="Material Didático" value={student.didacticMaterial} />
                        <div className="sm:col-span-2">
                           <InfoItem label="Principal Objetivo" value={student.objective} />
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-zinc-700 mb-2">Plano de Continuidade Ativo</h4>
                         <div className="space-y-2">
                            {studentContinuityItems.length > 0 ? studentContinuityItems.map(item => (
                                <div key={item.id} className="p-3 bg-zinc-50 rounded-lg flex justify-between items-center">
                                    <p className="text-zinc-800 text-sm">{item.description}</p>
                                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStatusStyles(item.status)}`}>
                                        {item.status.replace('_', ' ')}
                                    </span>
                                </div>
                            )) : <p className="text-zinc-500 text-sm p-4 text-center bg-zinc-50 rounded-lg">Nenhum item de continuidade ativo.</p>}
                        </div>
                    </div>
                </main>
                <footer className="mt-6 flex justify-end border-t pt-4">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Fechar</button>
                </footer>
            </div>
        </div>
    )
};

const SelectStudentForReportModal: React.FC<{
    groupClassInstance: Extract<DisplayClass, { classType: 'group' }> | null;
    onClose: () => void;
    onSelectStudent: (student: Student, report?: GroupClassReport) => void;
    groupReports: GroupClassReport[];
    onShowStudentDetails: (student: Student) => void;
    students: Student[];
}> = ({ groupClassInstance, onClose, onSelectStudent, groupReports, onShowStudentDetails, students }) => {
    if (!groupClassInstance) return null;
    
    const group = groupClassInstance.data;
    const classDate = groupClassInstance.instanceDate;
    const groupStudents = students.filter(s => group.studentIds.includes(s.id));

    return (
         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
                 <header className="flex justify-between items-start mb-4 border-b pb-4">
                     <div>
                        <h3 className="text-xl font-bold text-zinc-800">Relatórios da Turma</h3>
                        <p className="text-zinc-600 font-semibold">{group.name}</p>
                        <p className="text-sm text-zinc-500">Selecione um aluno para preencher o relatório da aula do dia {new Date(classDate).toLocaleDateString('pt-BR', {timeZone:'UTC'})}.</p>
                    </div>
                    <button onClick={onClose} className="p-2 -mt-2 -mr-2 rounded-full text-zinc-400 hover:bg-zinc-100"><XMarkIcon /></button>
                </header>
                <main className="max-h-80 overflow-y-auto pr-2">
                    <ul className="space-y-2">
                        {groupStudents.map(student => {
                            const existingReport = groupReports.find(r => r.groupId === group.id && r.studentId === student.id && r.date === classDate);
                            const hasReport = !!existingReport;
                            return (
                                <li key={student.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-md">
                                    <div>
                                        <p className="font-semibold text-zinc-800">{student.name}</p>
                                        <div className="flex items-center gap-4">
                                            <span className={`text-xs font-bold ${hasReport ? 'text-green-600' : 'text-amber-600'}`}>
                                                {hasReport ? 'Registrado' : 'Pendente'}
                                            </span>
                                            <button type="button" onClick={() => onShowStudentDetails(student)} className="text-xs font-normal text-zinc-500 hover:underline">Ver detalhes</button>
                                        </div>
                                    </div>
                                    <button onClick={() => onSelectStudent(student, existingReport)} className="text-sm font-semibold text-secondary hover:underline">
                                        {hasReport ? 'Ver / Editar' : 'Preencher'}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </main>
                 <footer className="mt-6 flex justify-end border-t pt-4">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Fechar</button>
                </footer>
            </div>
        </div>
    );
};

const WriteReportModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (context: any, reportData: ClassReport) => void;
    context: any;
    studentContinuityItems: ContinuityItem[];
}> = ({ isOpen, onClose, onSave, context, studentContinuityItems }) => {
    
    const MOOD_OPTIONS = ['😄', '😊', '🤔', '😕', '😥', '🤯', '😴'];
    
    // Form state
    const [subjects, setSubjects] = useState<{ discipline: string; content: string; }[]>([]);
    const [description, setDescription] = useState('');
    const [skills, setSkills] = useState('');
    const [difficulties, setDifficulties] = useState('');
    const [selectedMood, setSelectedMood] = useState('😊');
    const [customMood, setCustomMood] = useState('');
    const [newContinuityItems, setNewContinuityItems] = useState<{ description: string; status: ContinuityStatus }[]>([]);
    // FIX: Change continuityUpdates key to string to match ContinuityItem ID type
    const [continuityUpdates, setContinuityUpdates] = useState<Record<string, ContinuityStatus>>({});
    const [exercisesDismissed, setExercisesDismissed] = useState(false);
    const [dismissalReason, setDismissalReason] = useState('');
    const [exerciseInstructions, setExerciseInstructions] = useState('');
    
    useEffect(() => {
        if (!context) return;

        if (context.report) { // Editing existing report
            const report = context.report as ClassReport;
            setSubjects(report.contents && report.contents.length > 0 ? report.contents : [{ discipline: context.discipline || '', content: context.content || '' }]);
            
            const moodValue = report.mood || '😊';
            if (MOOD_OPTIONS.includes(moodValue)) {
                setSelectedMood(moodValue);
                setCustomMood('');
            } else {
                setSelectedMood('outro');
                setCustomMood(moodValue);
            }
            
            setDescription(report.description || '');
            setSkills(report.skills || '');
            setDifficulties(report.difficulties || '');
            setExercisesDismissed(report.exercisesDismissed || false);
            setDismissalReason(report.dismissalReason || '');
            setExerciseInstructions(report.exerciseInstructions || '');
            setNewContinuityItems(report.continuityCreated || []);
            setContinuityUpdates({});

        } else { // New report
            setSubjects([{ discipline: context.discipline || '', content: context.content || '' }]);
            setDescription(''); setSkills(''); setDifficulties('');
            setSelectedMood('😊'); setCustomMood('');
            setNewContinuityItems([]); setContinuityUpdates({});
            setExercisesDismissed(false); setDismissalReason(''); setExerciseInstructions('');
        }
    }, [context]);

    if (!isOpen || !context) return null;

    const activeContinuityItems = studentContinuityItems.filter(item => item.status !== 'concluido');

    // FIX: Handle string ID for continuity item
    const handleContinuityChange = (id: string, newStatus: ContinuityStatus) => {
        setContinuityUpdates(prev => ({...prev, [id]: newStatus}));
    };
    
    const handleSubjectChange = (index: number, field: 'discipline' | 'content', value: string) => {
        const newSubjects = [...subjects];
        newSubjects[index][field] = value;
        setSubjects(newSubjects);
    };

    const handleAddSubject = () => {
        setSubjects([...subjects, { discipline: '', content: '' }]);
    };

    const handleRemoveSubject = (index: number) => {
        setSubjects(subjects.filter((_, i) => i !== index));
    };

    const handleAddNewContinuityItem = () => {
        setNewContinuityItems(prev => [...prev, { description: '', status: 'nao_iniciado' }]);
    };
    
    const handleUpdateNewContinuityItem = (index: number, field: 'description' | 'status', value: string) => {
        setNewContinuityItems(prev => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], [field]: value };
            return newItems;
        });
    };

    const handleRemoveNewContinuityItem = (index: number) => {
        setNewContinuityItems(prev => prev.filter((_, i) => i !== index));
    };


    const handleSave = () => {
        const finalMood = selectedMood === 'outro' ? customMood.trim() : selectedMood;
        const reportData: ClassReport = {
            contents: subjects.filter(s => s.discipline.trim() && s.content.trim()),
            description: description,
            skills: skills,
            difficulties: difficulties,
            mood: finalMood || undefined,
            continuityCreated: newContinuityItems.filter(item => item.description.trim()),
            // FIX: Map continuityUpdates correctly with string IDs
            continuityUpdates: Object.entries(continuityUpdates).map(([id, newStatus]) => ({ id, newStatus })),
            exercisesDismissed: exercisesDismissed,
            dismissalReason: exercisesDismissed ? dismissalReason : undefined,
            exerciseInstructions: !exercisesDismissed ? exerciseInstructions : undefined,
        };
        onSave(context, reportData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl m-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-start p-4 border-b">
                    <div>
                        <h3 className="text-xl font-bold text-zinc-800">Registrar Relatório da Aula</h3>
                        <p className="text-zinc-600 font-semibold">{context.studentName}</p>
                        <p className="text-sm text-zinc-500">{new Date(context.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} às {context.time}</p>
                    </div>
                     <button type="button" onClick={onClose} className="p-2 -mt-1 -mr-1 rounded-full text-zinc-400 hover:bg-zinc-100"><XMarkIcon /></button>
                </header>
                <main className="flex-grow overflow-y-auto p-6 space-y-6">
                    <fieldset>
                        <legend className="text-lg font-semibold text-zinc-700 mb-2 border-b pb-1">Informações da Aula</legend>
                         <div className="space-y-3">
                            {subjects.map((subject, index) => (
                                <div key={index} className="p-3 bg-zinc-50 rounded-lg space-y-2 relative border border-zinc-200">
                                    {subjects.length > 1 && (
                                        <button type="button" onClick={() => handleRemoveSubject(index)} className="absolute top-2 right-2 p-1 text-zinc-400 hover:text-red-600 hover:bg-red-100 rounded-full">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor={`report-discipline-${index}`} className={labelStyle}>Disciplina</label>
                                            <input id={`report-discipline-${index}`} type="text" value={subject.discipline} onChange={e => handleSubjectChange(index, 'discipline', e.target.value)} className={inputStyle} />
                                        </div>
                                        <div>
                                            <label htmlFor={`report-content-${index}`} className={labelStyle}>Conteúdo</label>
                                            <input id={`report-content-${index}`} type="text" value={subject.content} onChange={e => handleSubjectChange(index, 'content', e.target.value)} className={inputStyle} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={handleAddSubject} className="flex items-center gap-2 text-sm text-secondary font-semibold hover:underline mt-2">
                                <PlusIcon className="h-4 w-4" />
                                Adicionar outra disciplina
                            </button>
                        </div>
                        <div className="mt-4">
                            <label htmlFor="report-description" className={labelStyle}>Descrição Geral da Aula</label>
                            <textarea id="report-description" rows={3} value={description} onChange={e=>setDescription(e.target.value)} className={inputStyle} placeholder="Descreva o que foi feito, o desempenho do aluno, etc."/>
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend className="text-lg font-semibold text-zinc-700 mb-2 border-b pb-1">Análise do Aluno</legend>
                        <div>
                             <label className={labelStyle}>Humor do Aluno</label>
                             <div className="flex items-center flex-wrap gap-2 p-2 bg-zinc-50 rounded-lg">
                                 {MOOD_OPTIONS.map(emoji => (
                                    <button key={emoji} type="button" onClick={() => setSelectedMood(emoji)} className={`text-2xl p-1 rounded-full transition-transform hover:scale-125 ${selectedMood === emoji ? 'bg-secondary/20' : ''}`}>{emoji}</button>
                                 ))}
                                 <button type="button" onClick={() => setSelectedMood('outro')} className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${selectedMood === 'outro' ? 'bg-secondary/20 text-secondary-dark' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'}`}>Outro</button>
                             </div>
                              {selectedMood === 'outro' && (
                                <div className="mt-2 animate-fade-in-fast">
                                    <label htmlFor="custom-mood" className={labelStyle}>Descreva:</label>
                                    <input id="custom-mood" type="text" value={customMood} onChange={e => setCustomMood(e.target.value)} className={inputStyle} />
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label htmlFor="report-skills" className={labelStyle}>Habilidades</label>
                                <textarea id="report-skills" rows={3} value={skills} onChange={e=>setSkills(e.target.value)} className={inputStyle} placeholder="Ex: Boa participação, raciocínio rápido, fez boas perguntas..."/>
                            </div>
                             <div>
                                <label htmlFor="report-difficulties" className={labelStyle}>Dificuldades</label>
                                <textarea id="report-difficulties" rows={3} value={difficulties} onChange={e=>setDifficulties(e.target.value)} className={inputStyle} placeholder="Ex: Demonstrou cansaço, dificuldade em manter o foco, insegurança com o conteúdo..."/>
                            </div>
                        </div>
                    </fieldset>

                     <fieldset>
                        <legend className="text-lg font-semibold text-zinc-700 mb-2 border-b pb-1">Plano de Continuidade</legend>
                         {activeContinuityItems.length > 0 && (
                            <div className="space-y-2 mb-4">
                                <label className={labelStyle}>Atualizar itens existentes:</label>
                                {activeContinuityItems.map(item => (
                                     <div key={item.id} className="p-2 bg-zinc-50 rounded-lg flex items-center justify-between gap-4">
                                        <p className="text-sm text-zinc-800 flex-grow">{item.description}</p>
                                        <div className="flex items-center gap-2 text-xs font-semibold flex-shrink-0">
                                             <span className={`px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-600`}>Atual: {item.status.replace('_', ' ')}</span>
                                            <button type="button" onClick={() => handleContinuityChange(item.id, 'em_andamento')} className={`px-2 py-0.5 rounded-full transition-colors ${continuityUpdates[item.id] === 'em_andamento' ? 'bg-blue-500 text-white ring-2 ring-blue-300' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}>Em Andamento</button>
                                            <button type="button" onClick={() => handleContinuityChange(item.id, 'concluido')} className={`px-2 py-0.5 rounded-full transition-colors ${continuityUpdates[item.id] === 'concluido' ? 'bg-green-500 text-white ring-2 ring-green-300' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}>Concluído</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                         )}
                         <div>
                            <label className={labelStyle}>Adicionar novos itens:</label>
                            <div className="space-y-2">
                                {newContinuityItems.map((item, index) => (
                                    <div key={index} className="flex items-center gap-2 p-2 bg-zinc-50 border rounded-lg">
                                        <input 
                                            type="text" 
                                            value={item.description} 
                                            onChange={e => handleUpdateNewContinuityItem(index, 'description', e.target.value)}
                                            className={inputStyle + " flex-grow"}
                                            placeholder="Descrição do novo item..."
                                        />
                                        <select 
                                            value={item.status}
                                            onChange={e => handleUpdateNewContinuityItem(index, 'status', e.target.value)}
                                            className={inputStyle + " w-48"}
                                        >
                                            <option value="nao_iniciado">Não Iniciado</option>
                                            <option value="em_andamento">Em Andamento</option>
                                            <option value="concluido">Concluído</option>
                                        </select>
                                        <button type="button" onClick={() => handleRemoveNewContinuityItem(index)} className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-100 rounded-full">
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={handleAddNewContinuityItem} className="flex items-center gap-2 text-sm text-secondary font-semibold hover:underline mt-2">
                                    <PlusIcon className="h-4 w-4" />
                                    Adicionar novo item
                                </button>
                            </div>
                        </div>
                    </fieldset>
                    
                    <fieldset>
                        <legend className="text-lg font-semibold text-zinc-700 mb-2 border-b pb-1">Exercícios de Casa</legend>
                        <div className="flex items-center justify-between p-2 bg-zinc-50 rounded-lg">
                            <label htmlFor="dismiss-exercises" className="font-semibold text-zinc-700 cursor-pointer">Dispensar exercícios</label>
                            <input id="dismiss-exercises" type="checkbox" checked={exercisesDismissed} onChange={e => setExercisesDismissed(e.target.checked)} className="h-5 w-5 rounded text-secondary focus:ring-secondary"/>
                        </div>
                         {exercisesDismissed ? (
                            <div className="mt-2 animate-fade-in-fast">
                                <label htmlFor="dismissal-reason" className={labelStyle}>Motivo da dispensa:</label>
                                <input id="dismissal-reason" type="text" value={dismissalReason} onChange={e=>setDismissalReason(e.target.value)} className={inputStyle} />
                            </div>
                         ) : (
                            <div className="mt-2 animate-fade-in-fast">
                                <label htmlFor="exercise-instructions" className={labelStyle}>Instruções:</label>
                                <textarea id="exercise-instructions" rows={3} value={exerciseInstructions} onChange={e=>setExerciseInstructions(e.target.value)} className={inputStyle} placeholder="Ex: Fazer os exercícios da página 50, do 1 ao 10."/>
                            </div>
                         )}
                    </fieldset>
                </main>
                <footer className="flex justify-end items-center gap-4 p-4 border-t">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Cancelar</button>
                    <button type="button" onClick={handleSave} className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark">Salvar Relatório</button>
                </footer>
            </div>
        </div>
    );
};

// --- TeacherDashboard Component ---
interface TeacherDashboardProps {
  onLogout: () => void;
  currentUser: Professional;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onLogout, currentUser }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [scheduledClassesData, setScheduledClassesData] = useState<ScheduledClass[]>([]);
    const [groupReports, setGroupReports] = useState<GroupClassReport[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [continuityItems, setContinuityItems] = useState<ContinuityItem[]>([]);
    const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
    const [birthdays, setBirthdays] = useState<any[]>([]);
    
    // Menu and Modal States
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isBirthdaysOpen, setIsBirthdaysOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isPaymentsModalOpen, setIsPaymentsModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isDiagnosticReportModalOpen, setIsDiagnosticReportModalOpen] = useState(false);
    const [reportModalContext, setReportModalContext] = useState<any>(null);
    const [showEarnings, setShowEarnings] = useState(false);
    const [selectedIndividualClass, setSelectedIndividualClass] = useState<ScheduledClass | null>(null);
    const [selectedGroupClass, setSelectedGroupClass] = useState<ClassGroup | null>(null);
    const [groupReportSelector, setGroupReportSelector] = useState<Extract<DisplayClass, {classType: 'group'}> | null>(null);
    const [studentForQuickView, setStudentForQuickView] = useState<Student | null>(null);


    // Refs
    const menuRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const birthdaysRef = useRef<HTMLDivElement>(null);

    // FIX: Fetch all data from Firestore
    useEffect(() => {
        const unsubStudents = onSnapshot(query(collection(db, "students")), snap => setStudents(snap.docs.map(d => ({id: d.id, ...d.data()})) as Student[]));
        const unsubClasses = onSnapshot(query(collection(db, "scheduledClasses")), snap => setScheduledClassesData(snap.docs.map(d => ({id: d.id, ...d.data()})) as ScheduledClass[]));
        const unsubGroups = onSnapshot(query(collection(db, "classGroups")), snap => setClassGroups(snap.docs.map(d => ({id: d.id, ...d.data()})) as ClassGroup[]));
        const unsubGroupReports = onSnapshot(query(collection(db, "groupClassReports")), snap => setGroupReports(snap.docs.map(d => ({id: d.id, ...d.data()})) as GroupClassReport[]));
        const unsubContinuity = onSnapshot(query(collection(db, "continuityItems")), snap => setContinuityItems(snap.docs.map(d => ({id: d.id, ...d.data()})) as ContinuityItem[]));
        // Placeholder for notifications and birthdays
        const unsubNotifications = onSnapshot(query(collection(db, "notifications")), snap => setNotifications(snap.docs.map(d => ({id: d.id, ...d.data()}))));

        return () => { unsubStudents(); unsubClasses(); unsubGroups(); unsubGroupReports(); unsubContinuity(); unsubNotifications(); };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) setIsNotificationsOpen(false);
            if (birthdaysRef.current && !birthdaysRef.current.contains(event.target as Node)) setIsBirthdaysOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSaveAvailability = async (newAvailability: WeeklyAvailability) => {
        const profRef = doc(db, "professionals", currentUser.id);
        await updateDoc(profRef, { availability: newAvailability });
        alert('Disponibilidade salva com sucesso!');
    };
    
    const handleSaveStandardReport = async (context: any, reportData: ClassReport) => {
        // Update Continuity Items
        if (reportData.continuityCreated) {
            for (const newItemData of reportData.continuityCreated) {
                 const newItem = {
                    studentId: context.studentId,
                    description: newItemData.description,
                    status: newItemData.status,
                    createdBy: currentUser.id,
                    createdAt: new Date().toISOString().split('T')[0],
                };
                await addDoc(collection(db, 'continuityItems'), newItem);
            }
        }
        if (reportData.continuityUpdates) {
            for (const update of reportData.continuityUpdates) {
                const itemRef = doc(db, 'continuityItems', update.id);
                await updateDoc(itemRef, { status: update.newStatus });
            }
        }

        // Update Class/Group Report
        if (context.type === 'individual') {
             const classRef = doc(db, 'scheduledClasses', context.classId);
             await updateDoc(classRef, { report: reportData, reportRegistered: true });
        } else if (context.type === 'group') {
            if (context.reportId) {
                const reportRef = doc(db, 'groupClassReports', context.reportId);
                await updateDoc(reportRef, { report: reportData });
            } else {
                const newReport = {
                    groupId: context.groupId,
                    studentId: context.studentId,
                    date: context.date,
                    report: reportData
                };
                await addDoc(collection(db, 'groupClassReports'), newReport);
            }
        }
        alert('Relatório salvo com sucesso!');
    };

    const handleSaveDiagnosticReport = async (context: any, reportData: DiagnosticReport) => {
        const classRef = doc(db, 'scheduledClasses', context.classId);
        await updateDoc(classRef, { diagnosticReport: reportData, reportRegistered: true });

        if (reportData.actionPlan.initialContinuityPlan) {
            for (const item of reportData.actionPlan.initialContinuityPlan) {
                if (item.description.trim()) {
                    const newItem = {
                        studentId: context.studentId,
                        description: item.description,
                        status: 'nao_iniciado' as ContinuityStatus,
                        createdBy: currentUser.id,
                        createdAt: new Date().toISOString().split('T')[0],
                    };
                    await addDoc(collection(db, 'continuityItems'), newItem);
                }
            }
        }
        alert('Relatório de Diagnóstico salvo com sucesso!');
    };
    
    const { upcomingClasses, pastClasses, myBirthdays, earnings } = useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);

        const allDisplayClasses: DisplayClass[] = [];

        // Add individual classes
        scheduledClassesData
            .filter(c => c.professionalId === currentUser.id)
            .forEach(c => allDisplayClasses.push({ classType: 'individual', data: c }));

        // Add instances of group classes
        classGroups.filter(g => g.professionalId === currentUser.id && g.status === 'active').forEach(group => {
            if (group.schedule.type === 'recurring' && group.schedule.days) {
                let tempDate = new Date(oneMonthAgo);
                let endDate = new Date();
                endDate.setMonth(now.getMonth() + 2); // Look 2 months ahead
                
                while(tempDate <= endDate) {
                    const dayOfWeekStr = tempDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as DayOfWeek;
                    const time = group.schedule.days[dayOfWeekStr];
                    if (time) {
                        const instanceDate = tempDate.toISOString().split('T')[0];
                        allDisplayClasses.push({ classType: 'group', data: group, instanceDate, time });
                    }
                    tempDate.setDate(tempDate.getDate() + 1);
                }
            } else if (group.schedule.type === 'single' && group.schedule.date && group.schedule.time) {
                 allDisplayClasses.push({ classType: 'group', data: group, instanceDate: group.schedule.date, time: group.schedule.time });
            }
        });
        
        const upcoming = allDisplayClasses
            .filter(c => (c.classType === 'individual' ? c.data.date : c.instanceDate) >= todayStr)
            .sort((a,b) => {
                const dateA = new Date(a.classType === 'individual' ? a.data.date : a.instanceDate);
                const dateB = new Date(b.classType === 'individual' ? b.data.date : b.instanceDate);
                return dateA.getTime() - dateB.getTime();
            });

        const past = allDisplayClasses
            .filter(c => (c.classType === 'individual' ? c.data.date : c.instanceDate) < todayStr)
            .sort((a,b) => {
                const dateA = new Date(a.classType === 'individual' ? a.data.date : a.instanceDate);
                const dateB = new Date(b.classType === 'individual' ? b.data.date : b.instanceDate);
                return dateB.getTime() - dateA.getTime();
            });
        
        const myStudentIds = new Set([...scheduledClassesData.filter(c => c.professionalId === currentUser.id).map(c => c.studentId), ...classGroups.filter(g => g.professionalId === currentUser.id).flatMap(g => g.studentIds)]);
        const myBirthdays = birthdays.filter(b => b.type === 'student' && myStudentIds.has(b.id));

        const getDayOfWeekCount = (year: number, month: number, dayOfWeek: number): number => { let count = 0; const date = new Date(year, month, 1); while (date.getMonth() === month) { if (date.getDay() === dayOfWeek) count++; date.setDate(date.getDate() + 1); } return count; };
        const dayNameToIndex: Record<DayOfWeek, number> = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
        const currentMonth = now.getMonth(); const currentYear = now.getFullYear();
        const individualHours = scheduledClassesData.filter(c => { const d = new Date(c.date); return c.professionalId === currentUser.id && d.getMonth() === currentMonth && d.getFullYear() === currentYear; }).reduce((total, c) => total + (c.duration / 60), 0);
        const groupHours = classGroups.filter(g=>g.professionalId === currentUser.id).reduce((total, g) => { let groupTotalHours = 0; const durationPerClassInHours = g.creditsToDeduct; if (g.schedule.type === 'recurring' && g.schedule.days) { for (const day of Object.keys(g.schedule.days)) { const dayIndex = dayNameToIndex[day as DayOfWeek]; if (dayIndex !== undefined) groupTotalHours += getDayOfWeekCount(currentYear, currentMonth, dayIndex) * durationPerClassInHours; } } return total + groupTotalHours; }, 0);
        const estimatedEarnings = (individualHours * (currentUser.hourlyRateIndividual || 0)) + (groupHours * (currentUser.hourlyRateGroup || 0));

        return { upcomingClasses: upcoming, pastClasses: past, myBirthdays, earnings: { total: estimatedEarnings, individualHours, groupHours, totalHours: individualHours + groupHours } };
    }, [currentUser, scheduledClassesData, groupReports, continuityItems, students, classGroups, birthdays]);

    const notificationIcons: {[key: string]: React.ReactNode} = { new_student: <UserPlusIcon className="h-6 w-6 text-blue-500" />, payment_due: <BanknotesIcon className="h-6 w-6 text-green-500" />, class_report: <DocumentTextIcon className="h-6 w-6 text-amber-500" /> };
    const unreadNotificationsCount = notifications.filter(n => !n.read).length;

    const handleReportButtonClick = (item: DisplayClass) => {
        const isIndividual = item.classType === 'individual';
        if (isIndividual) {
            const classData = item.data;
            const student = students.find(s => s.id === classData.studentId);
            const context = {
                type: 'individual',
                classId: classData.id,
                studentId: student?.id,
                studentName: student?.name,
                date: classData.date,
                time: classData.time,
                discipline: classData.discipline,
                content: classData.content,
                report: classData.report,
                diagnosticReport: classData.diagnosticReport
            };

            if (classData.type === 'Avaliação Diagnóstica') {
                setReportModalContext(context);
                setIsDiagnosticReportModalOpen(true);
            } else {
                setReportModalContext(context);
                setIsReportModalOpen(true);
            }
        } else { // Group class
            setGroupReportSelector(item);
        }
    };

    return (
        <div className="min-h-screen bg-neutral">
            <header className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-40">
                <div className="flex items-center gap-4"><LogoPlaceholder /><h1 className="text-xl font-semibold text-zinc-700">Portal do Professor</h1></div>
                <div className="flex items-center gap-2">
                    <div className="relative" ref={notificationsRef}><button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="relative text-zinc-500 hover:text-secondary p-2 rounded-full hover:bg-zinc-100 transition-colors"><AlertIcon className="h-6 w-6" />{unreadNotificationsCount > 0 && <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold ring-2 ring-white">{unreadNotificationsCount}</span>}</button>{isNotificationsOpen && (<div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border z-50 animate-fade-in-fast"><div className="p-3 border-b"><h4 className="font-semibold text-zinc-700">Notificações</h4></div><div className="max-h-80 overflow-y-auto">{notifications.map(n => (<div key={n.id} className={`flex items-start gap-3 p-3 border-b hover:bg-zinc-50 ${!n.read ? 'bg-secondary/5' : ''}`}><div className="flex-shrink-0 bg-zinc-100 p-2 rounded-full">{notificationIcons[n.type]}</div><div><p className="text-sm text-zinc-700">{n.message}</p><p className="text-xs text-zinc-500 mt-0.5">{n.timestamp}</p></div></div>))}</div></div>)}</div>
                    <div className="relative" ref={birthdaysRef}><button onClick={() => setIsBirthdaysOpen(!isBirthdaysOpen)} className="relative text-zinc-500 hover:text-secondary p-2 rounded-full hover:bg-zinc-100 transition-colors"><BirthdayIcon className="h-6 w-6" />{myBirthdays.some(b => b.date === 'Hoje') && <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span></span>}</button>{isBirthdaysOpen && (<div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg border z-50 animate-fade-in-fast"><div className="p-3 border-b"><h4 className="font-semibold text-zinc-700">Aniversários de Alunos</h4></div><div className="max-h-80 overflow-y-auto">{myBirthdays.map(b => (<div key={b.id} className="flex items-center gap-3 p-3 border-b"><p className="font-semibold text-zinc-800">{b.name}</p><p className="text-sm text-zinc-500 ml-auto">{b.date}</p></div>))}</div></div>)}</div>
                    <div className="relative" ref={menuRef}><button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 text-zinc-600 hover:text-zinc-800 p-2 rounded-lg hover:bg-zinc-100"><span className="font-semibold">{currentUser.name}</span><ChevronDownIcon className={`h-4 w-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} /></button>{isMenuOpen && (<div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 animate-fade-in-fast border"><button onClick={() => {setIsProfileModalOpen(true); setIsMenuOpen(false);}} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"><IdentificationIcon /><span>Alterar Dados</span></button><button onClick={() => {setIsPasswordModalOpen(true); setIsMenuOpen(false);}} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"><LockClosedIcon /><span>Alterar Senha</span></button><button onClick={() => {setIsPaymentsModalOpen(true); setIsMenuOpen(false);}} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"><BanknotesIcon /><span>Recebimentos</span></button><div className="border-t my-1"></div><button onClick={onLogout} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"><ArrowRightOnRectangleIcon /><span>Sair</span></button></div>)}</div>
                </div>
            </header>
            
            <main className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-view">
                <div className="lg:col-span-1 space-y-6">
                    <section className="bg-white p-6 rounded-xl shadow-sm"><div className="flex items-start justify-between"><div className="flex items-center gap-4"><div className="bg-primary/10 p-3 rounded-full"><BanknotesIcon className="h-8 w-8 text-primary" /></div><div><h3 className="text-sm font-medium text-zinc-500 uppercase">Ganhos Previstos ({new Date().toLocaleString('pt-BR', { month: 'long' })})</h3><p className="text-4xl font-bold text-primary">{showEarnings ? `R$ ${earnings.total.toFixed(2).replace('.',',')}` : 'R$ ••••,••'}</p></div></div><button onClick={() => setShowEarnings(!showEarnings)} className="p-2 text-zinc-400 hover:text-zinc-600" title={showEarnings ? 'Ocultar valor' : 'Mostrar valor'}>{showEarnings ? <EyeSlashIcon className="h-6 w-6" /> : <EyeIcon className="h-6 w-6" />}</button></div><div className="mt-4 flex items-center justify-around gap-2 pt-4 border-t"><div className="text-center"><h3 className="text-xs font-medium text-zinc-500 uppercase">Individual</h3><p className="text-xl font-bold text-zinc-700">{earnings.individualHours.toFixed(1)}h</p></div><div className="text-center"><h3 className="text-xs font-medium text-zinc-500 uppercase">Turma</h3><p className="text-xl font-bold text-zinc-700">{earnings.groupHours.toFixed(1)}h</p></div><div className="text-center"><h3 className="text-xs font-medium text-zinc-500 uppercase">Total</h3><p className="text-xl font-bold text-zinc-700">{earnings.totalHours.toFixed(1)}h</p></div></div></section>
                    <section className="bg-white p-6 rounded-xl shadow-sm"><div className="flex items-center gap-3 mb-4"><CalendarDaysIcon className="h-6 w-6 text-secondary" /><h3 className="text-xl font-semibold text-zinc-700">Disponibilidade</h3></div><WeeklyAvailabilityComponent initialAvailability={currentUser.availability || {}} onSave={handleSaveAvailability} /></section>
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-white p-6 rounded-xl shadow-sm"><div className="flex items-center gap-3 mb-4"><CalendarDaysIcon className="h-6 w-6 text-secondary" /><h3 className="text-xl font-semibold text-zinc-700">Próximas Aulas</h3></div>
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                             {upcomingClasses.length > 0 ? upcomingClasses.map((item) => {
                                const todayStr = new Date().toISOString().split('T')[0];
                                const isIndividual = item.classType === 'individual';
                                const classData = isIndividual ? item.data : null;
                                const date = isIndividual ? classData!.date : item.instanceDate;
                                const isToday = date === todayStr;
                                const dateLabel = isToday ? 'Hoje' : new Date(`${date}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' }).split('-')[0].replace(/^\w/, (c) => c.toUpperCase());
                                const student = isIndividual ? students.find(s => s.id === classData!.studentId) : null;
                                
                                return (
                                    <div key={`${item.classType}-${isIndividual ? classData!.id : item.data.id}-${date}`} className={`bg-zinc-50 p-3 rounded-lg flex items-center justify-between ${isToday ? 'border-l-4 border-primary' : ''}`}>
                                        <div>
                                            <div className="flex items-center gap-2"><p className="font-bold text-zinc-800">{isIndividual ? student?.name : item.data.name}</p>{!isIndividual && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-100 text-sky-800">Turma</span>}</div>
                                            <p className="text-sm text-zinc-500">{isIndividual ? classData!.discipline : item.data.discipline}</p>
                                            <div className="flex items-center gap-4 mt-1">
                                                <button onClick={() => isIndividual ? setSelectedIndividualClass(classData!) : setSelectedGroupClass(item.data)} className="text-xs font-semibold text-secondary hover:underline">Ver detalhes</button>
                                                <button onClick={() => handleReportButtonClick(item)} className="text-xs font-semibold text-primary hover:underline">Preencher Relatório</button>
                                            </div>
                                        </div>
                                        <div className="text-right text-sm text-zinc-600"><p className="font-semibold">{dateLabel}, {new Date(date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p><p className="flex items-center justify-end gap-1"><ClockIcon/> {isIndividual ? classData!.time : item.time}</p></div>
                                    </div>
                                );
                            }) : <p className="text-zinc-500 text-sm">Nenhuma aula agendada.</p>}
                        </div>
                    </section>
                     <section className="bg-white p-6 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3 mb-4"><CalendarDaysIcon className="h-6 w-6 text-zinc-500" /><h3 className="text-xl font-semibold text-zinc-700">Histórico de Aulas (Mês)</h3></div>
                        <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto"><table className="min-w-full divide-y divide-zinc-200"><thead className="bg-zinc-50 sticky top-0"><tr><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Data</th><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Aluno/Turma</th><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Relatório</th><th className="relative px-4 py-2"></th></tr></thead><tbody className="bg-white divide-y divide-zinc-200">{pastClasses.map((item) => {
                             const isIndividual = item.classType === 'individual';
                             const classData = isIndividual ? item.data : null;
                             const date = isIndividual ? classData!.date : item.instanceDate;
                             const student = isIndividual ? students.find(s => s.id === classData!.studentId) : null;
                             const reportRegistered = isIndividual ? classData!.reportRegistered : groupReports.some(r => r.groupId === item.data.id && r.date === item.instanceDate);
                             
                             return (<tr key={`${item.classType}-${isIndividual ? classData!.id : item.data.id}-${date}`}><td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-600">{new Date(date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td><td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-zinc-800 flex items-center gap-2">{isIndividual ? student?.name : item.data.name} {!isIndividual && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-100 text-sky-800">Turma</span>}</td><td className="px-4 py-3 whitespace-nowrap text-sm"><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${reportRegistered ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{reportRegistered ? 'Registrado' : 'Pendente'}</span></td><td className="px-4 py-3 whitespace-nowrap text-right text-sm"><button onClick={() => handleReportButtonClick(item)} className="text-secondary hover:text-secondary-dark font-semibold">Ver / Editar Relatório</button></td></tr>);})}</tbody></table></div>
                    </section>
                </div>
            </main>
            {/* Modals */}
             <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} user={currentUser} />
            <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
            <ProfessionalFinancialModal isOpen={isPaymentsModalOpen} onClose={() => setIsPaymentsModalOpen(false)} professional={currentUser} />
            <IndividualClassDetailModal classData={selectedIndividualClass} onClose={() => setSelectedIndividualClass(null)} continuityItems={continuityItems} students={students} />
            <GroupClassDetailModal group={selectedGroupClass} onClose={() => setSelectedGroupClass(null)} students={students} />
             <StudentQuickViewModal 
                student={studentForQuickView} 
                onClose={() => setStudentForQuickView(null)}
                continuityItems={continuityItems}
            />
            <SelectStudentForReportModal 
                groupClassInstance={groupReportSelector}
                onClose={() => setGroupReportSelector(null)}
                groupReports={groupReports}
                onShowStudentDetails={setStudentForQuickView}
                students={students}
                onSelectStudent={(student, report) => {
                    const groupClass = groupReportSelector!.data;
                    const reportData = report ? report.report : undefined;
                    const context = {
                        type: 'group',
                        groupId: groupClass.id,
                        studentId: student.id,
                        reportId: report?.id,
                        studentName: student.name,
                        date: groupReportSelector!.instanceDate,
                        time: groupReportSelector!.time,
                        discipline: groupClass.discipline,
                        content: groupClass.description,
                        report: reportData
                    };
                    setReportModalContext(context);
                    setIsReportModalOpen(true);
                    setGroupReportSelector(null);
                }}
            />
             <WriteReportModal 
                isOpen={isReportModalOpen} 
                onClose={() => setIsReportModalOpen(false)} 
                onSave={handleSaveStandardReport} 
                context={reportModalContext}
                studentContinuityItems={continuityItems.filter(i => i.studentId === reportModalContext?.studentId)}
            />
             <DiagnosticReportModal
                isOpen={isDiagnosticReportModalOpen}
                onClose={() => setIsDiagnosticReportModalOpen(false)}
                onSave={handleSaveDiagnosticReport}
                context={reportModalContext}
            />
            <style>{`@keyframes fade-in-view { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in-view { animation: fade-in-view 0.4s ease-out forwards; } @keyframes fade-in-fast { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } } .animate-fade-in-fast { animation: fade-in-fast 0.1s ease-out forwards; }`}</style>
        </div>
    );
};

export default TeacherDashboard;
