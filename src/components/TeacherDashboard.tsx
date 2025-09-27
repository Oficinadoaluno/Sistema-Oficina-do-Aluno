import React, { useState, useRef, useEffect, useMemo, useContext, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
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
    ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, UserIcon as UserIconSolid, PlusIcon, XMarkIcon, TrashIcon, CheckCircleIcon,
    SparklesIcon, BookOpenIcon
} from './Icons';
import { sanitizeFirestore } from '../utils/sanitizeFirestore';

// --- AI Summary Generation ---
const generateAndSaveStudentSummary = async (studentId: string, allGroups: ClassGroup[]) => {
    try {
        console.log(`[AI] Starting summary generation for student ${studentId}`);

        // 1. Fetch all reports for the student
        const individualReportsSnap = await db.collection('scheduledClasses')
            .where('studentId', '==', studentId)
            .where('reportRegistered', '==', true)
            .orderBy('date', 'desc')
            .get();
        const individualReports = individualReportsSnap.docs.map(doc => doc.data() as ScheduledClass);

        const groupReportsSnap = await db.collection('groupStudentDailyReports')
            .where('studentId', '==', studentId)
            .orderBy('date', 'desc')
            .get();
        const groupReports = groupReportsSnap.docs.map(doc => doc.data() as GroupStudentDailyReport);

        if (individualReports.length === 0 && groupReports.length === 0) {
            console.log('[AI] No reports found. Skipping summary generation.');
            return;
        }

        // 2. Format reports into a string
        const groupMap = new Map(allGroups.map(g => [g.id, g.name]));
        const reportsHistory = [
            ...individualReports.map(r => {
                const report = r.report;
                if (!report) return null;
                return `
---
Tipo: Aula Individual
Data: ${r.date}
Disciplina: ${r.discipline}
Humor do Aluno: ${report.mood}
Conteúdo: ${report.contents.map(c => c.content).join(', ')}
Observações: ${report.description}
Próximos Passos: ${report.nextSteps?.join(', ') || 'N/A'}
---
                `;
            }),
            ...groupReports.map(r => `
---
Tipo: Aula em Turma (${groupMap.get(r.groupId) || 'Turma desconhecida'})
Data: ${r.date}
Atividades: ${r.subjects.map(s => `${s.discipline} (${s.activity})`).join(', ')}
Observações: ${r.observations}
---
            `)
        ].filter(Boolean).join('\n');

        // 3. Call Gemini API
        const ai = new GoogleGenAI({ apiKey: "AIzaSyBNzB_cIhU1Rei95u4RnOENxexOSj_nS4E" });

        const prompt = `Você é um psicopedagogo analisando o histórico de um aluno. Com base nos relatórios de aula a seguir, gere um resumo direto e objetivo em um único parágrafo curto (máximo de 5 frases). O resumo deve destacar o progresso geral do aluno, seus pontos fortes notáveis e quaisquer desafios ou dificuldades recorrentes. Evite listar datas ou nomes de professores. Foque na trajetória de aprendizado.

Histórico de Relatórios:
${reportsHistory}

Resumo Analítico:`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const summaryText = response.text;
        
        if (!summaryText) {
            console.log('[AI] Received empty summary from API.');
            return;
        }

        // 4. Update student document
        const studentRef = db.collection('students').doc(studentId);
        await studentRef.update({
            aiSummary: {
                summary: summaryText.trim(),
                lastUpdated: new Date().toISOString().split('T')[0]
            }
        });
        
        console.log(`[AI] Successfully generated and saved summary for student ${studentId}`);

    } catch (error) {
        console.error('[AI] Error generating student summary:', error);
        // We don't show a toast here to not bother the user. The primary action (saving report) was successful.
    }
};


// --- Modais ---
const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";

// --- Upcoming Class Detail Modal ---
interface UpcomingClassDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    classData: ScheduledClass;
    student: Student;
}
const UpcomingClassDetailModal: React.FC<UpcomingClassDetailModalProps> = ({ isOpen, onClose, classData, student }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-start p-4 border-b">
                    <div>
                        <h3 className="text-xl font-bold text-zinc-800">{classData.discipline}</h3>
                        <p className="text-sm text-zinc-500">
                            {new Date(classData.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} às {classData.time}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 -mt-1 -mr-1 rounded-full text-zinc-400 hover:bg-zinc-100"><XMarkIcon /></button>
                </header>
                <main className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    <section>
                        <h4 className="font-semibold text-zinc-700 mb-2">Aluno</h4>
                        <div className="bg-zinc-50 p-3 rounded-md grid grid-cols-2 gap-2 text-sm">
                            <div><p className="text-xs text-zinc-500">Nome</p><p className="font-medium text-zinc-800">{student.name}</p></div>
                            <div><p className="text-xs text-zinc-500">Colégio</p><p className="font-medium text-zinc-800">{student.school || 'N/A'}</p></div>
                            <div><p className="text-xs text-zinc-500">Série</p><p className="font-medium text-zinc-800">{student.grade || 'N/A'}</p></div>
                        </div>
                    </section>
                    <section>
                        <h4 className="font-semibold text-zinc-700 mb-2">Conteúdo da Aula</h4>
                        <div className="bg-zinc-50 p-3 rounded-md">
                            <p className="text-zinc-800 whitespace-pre-wrap">{classData.content || 'Nenhum conteúdo específico registrado.'}</p>
                        </div>
                    </section>
                    <section>
                        <h4 className="font-semibold text-zinc-700 mb-2 flex items-center gap-2"><SparklesIcon className="h-5 w-5 text-violet-500" /> Análise de Desempenho (IA)</h4>
                        <div className="bg-violet-50 p-3 rounded-md border-l-4 border-violet-400">
                            <p className="text-sm text-violet-800 whitespace-pre-wrap">
                                {student.aiSummary?.summary || 'Nenhum resumo disponível. Será gerado após o primeiro relatório.'}
                            </p>
                            {student.aiSummary && <p className="text-xs text-violet-500 mt-2">Última atualização: {new Date(student.aiSummary.lastUpdated).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>}
                        </div>
                    </section>
                </main>
                <footer className="p-4 border-t flex justify-end">
                    <button onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Fechar</button>
                </footer>
            </div>
        </div>
    );
};


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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
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

    const handleAttendanceChange = async (studentId: string, status: 'present' | 'absent') => {
        const dateStr = currentDate.toISOString().split('T')[0];
        const existingRecord = attendance.get(studentId);
        
        let updateData: any = { status };
        if (status === 'present') {
            updateData.justification = firebase.firestore.FieldValue.delete();
        }

        try {
            const newAttendance = new Map(attendance);
            if (existingRecord) {
                await db.collection('groupAttendance').doc(existingRecord.id).update(updateData);
                // FIX: The spread operator was causing a build error.
                // Replaced with manual object construction to ensure type safety.
                const updatedRecord: GroupAttendance = {
                    id: existingRecord.id,
                    groupId: existingRecord.groupId,
                    studentId: existingRecord.studentId,
                    date: existingRecord.date,
                    status: status,
                };
                if (status === 'absent' && existingRecord.justification) {
                    updatedRecord.justification = existingRecord.justification;
                }
                newAttendance.set(studentId, updatedRecord);
            } else {
                const newRecordData = { groupId: group.id, studentId, date: dateStr, status };
                const newRecordRef = await db.collection('groupAttendance').add(newRecordData);
                newAttendance.set(studentId, { id: newRecordRef.id, ...newRecordData });
            }
            setAttendance(newAttendance);
        } catch (error) {
            showToast("Erro ao salvar presença.", "error");
        }
    };
    
    const handleJustificationChange = (studentId: string, justification: string) => {
        const newAttendance = new Map(attendance);
        const record = newAttendance.get(studentId);
        if (record) {
            const updatedRecord = { ...record, justification };
            newAttendance.set(studentId, updatedRecord);
            setAttendance(newAttendance);
        }
    };

    const handleJustificationBlur = async (studentId: string) => {
        const record = attendance.get(studentId);
        if (record && record.id) {
            try {
                await db.collection('groupAttendance').doc(record.id).update({
                    justification: record.justification || ''
                });
            } catch (error) {
                showToast('Erro ao salvar justificativa.', 'error');
            }
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
                    <thead className="bg-zinc-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Aluno</th><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Presença</th><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Relatório/Justificativa</th></tr></thead>
                    <tbody className="divide-y">{groupStudents.map(student => {
                        const studentAttendance = attendance.get(student.id);
                        const hasReport = reports.has(student.id);
                        return (
                            <tr key={student.id} className="hover:bg-zinc-50">
                                <td className="px-4 py-2 font-medium">{student.name}</td>
                                <td className="px-4 py-2"><div className="flex items-center gap-2 text-sm">{['present', 'absent'].map(s => <button key={s} onClick={() => handleAttendanceChange(student.id, s as any)} className={`px-2 py-0.5 rounded-full font-semibold ${studentAttendance?.status === s ? 'bg-secondary text-white' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'}`}>{s === 'present' ? 'P' : 'F'}</button>)}</div></td>
                                <td className="px-4 py-2 w-1/2">
                                    {studentAttendance?.status === 'present' && <button onClick={() => { setStudentForReport(student); setIsReportModalOpen(true); }} className={`text-sm font-semibold py-1 px-2 rounded-md ${hasReport ? 'bg-secondary/10 text-secondary-dark' : 'bg-zinc-100 text-zinc-600'}`}>{hasReport ? 'Ver/Editar Relatório' : 'Registrar Relatório'}</button>}
                                    {studentAttendance?.status === 'absent' && (
                                        <input
                                            type="text"
                                            placeholder="Justificativa (opcional)"
                                            className={`${inputStyle} text-sm`}
                                            value={studentAttendance.justification || ''}
                                            onChange={(e) => handleJustificationChange(student.id, e.target.value)}
                                            onBlur={() => handleJustificationBlur(student.id)}
                                        />
                                    )}
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
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

// --- New "My Classes" View ---
const MyClassesView: React.FC<{
    scheduledClasses: ScheduledClass[];
    students: Map<string, Student>;
    handleOpenReportModal: (cls: ScheduledClass) => void;
}> = ({ scheduledClasses, students, handleOpenReportModal }) => {
    const [monthOffset, setMonthOffset] = useState(0);

    const { monthName, classesInMonth } = useMemo(() => {
        const targetDate = new Date();
        targetDate.setDate(1);
        targetDate.setUTCHours(0, 0, 0, 0);
        targetDate.setMonth(targetDate.getMonth() + monthOffset);

        const monthName = targetDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        
        const classes = scheduledClasses
            .filter(c => {
                const classDate = new Date(c.date);
                return classDate.getUTCMonth() === targetDate.getUTCMonth() && classDate.getUTCFullYear() === targetDate.getUTCFullYear();
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { monthName, classesInMonth: classes };
    }, [monthOffset, scheduledClasses]);

    return (
        <div className="animate-fade-in-view space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-zinc-700">Histórico de Aulas</h3>
                <div className="flex items-center gap-2">
                    <button onClick={() => setMonthOffset(monthOffset - 1)} className="p-2 rounded-full hover:bg-zinc-100"><ChevronLeftIcon /></button>
                    <span className="font-semibold text-lg text-zinc-800 capitalize w-36 text-center">{monthName}</span>
                    <button onClick={() => setMonthOffset(monthOffset + 1)} disabled={monthOffset >= 0} className="p-2 rounded-full hover:bg-zinc-100 disabled:opacity-50"><ChevronRightIcon /></button>
                </div>
            </div>
            <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-zinc-200">
                    <thead className="bg-zinc-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Data</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Aluno</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Disciplina</th>
                            <th className="relative px-4 py-2"><span className="sr-only">Ações</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-zinc-200">
                        {classesInMonth.map(cls => (
                            <tr key={cls.id}>
                                <td className="px-4 py-3 text-sm text-zinc-600">{new Date(cls.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                                <td className="px-4 py-3 text-sm font-medium text-zinc-800">{students.get(cls.studentId)?.name || 'Aluno não encontrado'}</td>
                                <td className="px-4 py-3 text-sm text-zinc-600">{cls.discipline}</td>
                                <td className="px-4 py-3 text-right text-sm">
                                    <button onClick={() => handleOpenReportModal(cls)} className="text-secondary hover:text-secondary-dark font-semibold">
                                        {cls.reportRegistered ? 'Ver/Editar Relatório' : 'Lançar Relatório'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {classesInMonth.length === 0 && <p className="p-4 text-center text-zinc-500">Nenhuma aula encontrada neste mês.</p>}
            </div>
        </div>
    );
};

// --- New "Creativity Panel" View ---
interface SavedIdea {
    id: string;
    professionalId: string;
    studentId: string;
    studentName: string;
    discipline: string;
    topic: string;
    generatedIdeaText: string;
    createdAt: firebase.firestore.Timestamp;
}

const CreativityPanelView: React.FC<{ students: Student[], currentUser: Professional }> = ({ students, currentUser }) => {
    const { showToast } = useContext(ToastContext);
    const [studentId, setStudentId] = useState('');
    const [discipline, setDiscipline] = useState('');
    const [topic, setTopic] = useState('');
    const [initialIdea, setInitialIdea] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState('');

    const [savedIdeas, setSavedIdeas] = useState<SavedIdea[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingSaved, setIsLoadingSaved] = useState(true);

    const activeStudents = useMemo(() => students.filter(s => s.status === 'matricula'), [students]);

    useEffect(() => {
        setIsLoadingSaved(true);
        const unsubscribe = db.collection('savedCreativeIdeas')
            .where('professionalId', '==', currentUser.id)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                const ideas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedIdea));
                setSavedIdeas(ideas);
                setIsLoadingSaved(false);
            }, error => {
                console.error("Error fetching saved ideas:", error);
                showToast("Erro ao carregar ideias salvas.", "error");
                setIsLoadingSaved(false);
            });

        return () => unsubscribe();
    }, [currentUser.id, showToast]);


    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentId || !discipline || !topic) {
            showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
            return;
        }

        setIsLoading(true);
        setResult('');

        try {
            const student = students.find(s => s.id === studentId);
            if (!student) throw new Error("Student not found");

            const prompt = `Você é um assistente pedagógico criativo para aulas particulares.
Sua tarefa é criar um plano de aula curto, direto e eficaz.

**Restrições Importantes:**
- A aula é particular e curta (aprox. 1 hora). As sugestões devem ser práticas.
- **NÃO USE O NOME DO ALUNO.** Refira-se a ele(a) de forma genérica ("o aluno", "a aluna").
- Formate a resposta de forma clara, usando títulos em negrito (ex: **Abordagem 1:**) e listas com asteriscos (*). Use quebras de linha para separar os parágrafos. Não use markdown complexo (como '#').

**Informações do Aluno:**
- Ano/Série: ${student.grade || 'Não informado'}
- Objetivo Principal: ${student.objective || 'Não informado'}
- Neurodivergência/Dificuldades: ${student.neurodiversity || "Nenhuma informada"}
- Resumo de Desempenho (gerado por IA): ${student.aiSummary?.summary || "Nenhum disponível"}

**Detalhes da Aula:**
- Disciplina: ${discipline}
- Tópico: ${topic}
- Ideia Inicial do Professor: ${initialIdea || "Nenhuma fornecida. Crie do zero."}

**Sua Tarefa:**
Com base em TODAS as informações acima, sugira 2 ou 3 abordagens de ensino distintas e criativas. Se o professor deu uma ideia inicial, use-a como ponto de partida. Para cada abordagem, inclua:
1.  **Conceito:** Uma breve descrição da metodologia.
2.  **Atividade Prática:** Uma atividade concreta e rápida.
3.  **Ponto de Conexão:** Como a abordagem ajuda o aluno com base em seu perfil.`;
            
            const ai = new GoogleGenAI({ apiKey: "AIzaSyBNzB_cIhU1Rei95u4RnOENxexOSj_nS4E" });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            setResult(response.text);

        } catch (error) {
            console.error("Gemini API error:", error);
            showToast('Ocorreu um erro ao gerar as ideias. Tente novamente.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveIdea = async () => {
        if (!result || !studentId) return;
        setIsSaving(true);
        try {
            const student = students.find(s => s.id === studentId);
            const ideaData = {
                professionalId: currentUser.id,
                studentId,
                studentName: student?.name || 'Aluno desconhecido',
                discipline,
                topic,
                generatedIdeaText: result,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            };
            await db.collection('savedCreativeIdeas').add(ideaData);
            showToast("Ideia salva com sucesso!", "success");
        } catch (error) {
            console.error("Error saving idea:", error);
            showToast("Erro ao salvar a ideia.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteIdea = async (ideaId: string) => {
        if (!window.confirm("Tem certeza que deseja excluir esta ideia?")) return;
        try {
            await db.collection('savedCreativeIdeas').doc(ideaId).delete();
            showToast("Ideia excluída.", "info");
        } catch (error) {
            console.error("Error deleting idea:", error);
            showToast("Erro ao excluir a ideia.", "error");
        }
    };

    return (
        <div className="animate-fade-in-view space-y-6">
            <div className="text-center">
                <SparklesIcon className="h-10 w-10 text-primary mx-auto"/>
                <h3 className="text-xl font-semibold text-zinc-700 mt-2">Painel de Criatividade</h3>
                <p className="text-zinc-500 max-w-2xl mx-auto">Receba sugestões de atividades e abordagens de ensino personalizadas para seus alunos.</p>
            </div>
            <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end p-4 border rounded-lg bg-zinc-50">
                <div>
                    <label htmlFor="student" className={labelStyle}>Aluno <span className="text-red-500">*</span></label>
                    <select id="student" value={studentId} onChange={e => setStudentId(e.target.value)} className={inputStyle} required>
                        <option value="" disabled>Selecione um aluno...</option>
                        {activeStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="discipline" className={labelStyle}>Disciplina <span className="text-red-500">*</span></label>
                    <input id="discipline" type="text" value={discipline} onChange={e => setDiscipline(e.target.value)} className={inputStyle} required placeholder="Ex: História"/>
                </div>
                <div>
                    <label htmlFor="topic" className={labelStyle}>Tópico <span className="text-red-500">*</span></label>
                    <input id="topic" type="text" value={topic} onChange={e => setTopic(e.target.value)} className={inputStyle} required placeholder="Ex: Revolução Francesa"/>
                </div>
                 <div>
                    <label htmlFor="initialIdea" className={labelStyle}>Sua ideia ou objetivo (opcional)</label>
                    <input id="initialIdea" type="text" value={initialIdea} onChange={e => setInitialIdea(e.target.value)} className={inputStyle} placeholder="Ex: Focar em exercícios práticos"/>
                </div>
                <div className="md:col-span-2">
                     <button type="submit" disabled={isLoading} className="w-full py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark disabled:bg-zinc-400 flex items-center justify-center gap-2">
                        <SparklesIcon className="h-5 w-5"/>
                        {isLoading ? 'Gerando Ideias...' : 'Gerar Ideias'}
                    </button>
                </div>
            </form>
            <div className="bg-white border rounded-lg p-6 min-h-[200px] space-y-4">
                {isLoading && <div className="text-center"><p>Gerando sugestões... ✨</p></div>}
                {!isLoading && !result && <div className="text-center text-zinc-500"><p>As sugestões da IA aparecerão aqui.</p></div>}
                {result && <div className="whitespace-pre-wrap text-zinc-800">{result}</div>}
                 {result && !isLoading && (
                    <div className="text-right border-t pt-4">
                        <button onClick={handleSaveIdea} disabled={isSaving} className="py-2 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark disabled:bg-zinc-400">
                            {isSaving ? 'Salvando...' : 'Salvar Ideia'}
                        </button>
                    </div>
                )}
            </div>

             <div className="mt-8">
                <h3 className="text-xl font-semibold text-zinc-700 mb-4">Suas Ideias Salvas</h3>
                {isLoadingSaved && <p>Carregando ideias...</p>}
                {!isLoadingSaved && savedIdeas.length === 0 && <div className="text-center py-8 bg-zinc-50 rounded-lg"><p className="text-zinc-500">Você ainda não salvou nenhuma ideia.</p></div>}
                {!isLoadingSaved && savedIdeas.length > 0 && (
                    <div className="space-y-4">
                        {savedIdeas.map(idea => (
                            <div key={idea.id} className="bg-white border rounded-lg p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-zinc-800">{idea.discipline}: {idea.topic}</p>
                                        <p className="text-sm text-zinc-500">Para: {idea.studentName}</p>
                                    </div>
                                    <button onClick={() => handleDeleteIdea(idea.id)} className="text-red-500 hover:text-red-700 p-1"><TrashIcon/></button>
                                </div>
                                <div className="whitespace-pre-wrap text-zinc-700 mt-2 border-t pt-2 text-sm">{idea.generatedIdeaText}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};


// --- Componente Principal ---
interface TeacherDashboardProps { onLogout: () => void; currentUser: Professional; }
type View = 'dashboard' | 'availability' | 'groups' | 'groupSession' | 'myClasses' | 'creativityPanel';

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onLogout, currentUser }) => {
    const { showToast } = useContext(ToastContext) as { showToast: (message: string, type?: 'success' | 'error' | 'info') => void; };
    const [view, setView] = useState<View>('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportContext, setReportContext] = useState<any>(null);
    const [selectedGroup, setSelectedGroup] = useState<ClassGroup | null>(null);
    const [classDetailModal, setClassDetailModal] = useState<{ class: ScheduledClass; student: Student } | null>(null);


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
                // FIX: The original query required a composite index. By sorting on the client,
                // we make the query more robust against missing index deployments.
                const qClasses = db.collection("scheduledClasses").where("professionalId", "==", currentUser.id);
                const classesSnap = await qClasses.get();
                const classesData = classesSnap.docs.map(d => ({id: d.id, ...d.data()})) as ScheduledClass[];
                
                // Sort by date on the client
                classesData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                
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
                    // Firestore 'in' queries support up to 30 elements per query.
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

            // Trigger AI summary generation - fire and forget
            generateAndSaveStudentSummary(classContext.studentId, classGroups);
            
        } catch (error) {
            showToast('Erro ao salvar o relatório.', 'error');
            console.error("Error saving report:", error);
        }
    };

    const { upcomingClasses, pastClasses } = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const all = scheduledClasses; // Already sorted
        return {
            upcomingClasses: all.filter(c => c.date >= todayStr),
            pastClasses: all.filter(c => c.date < todayStr),
        };
    }, [scheduledClasses]);
    
    const studentsMap = useMemo(() => new Map(students.map(s => [s.id, s])), [students]);

    const { pendingReportsCount } = useMemo(() => {
        const pending = pastClasses.filter(c => !c.reportRegistered).length;
        return { pendingReportsCount: pending };
    }, [pastClasses]);

    const completedClassesThisMonth = useMemo(() => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        return scheduledClasses.filter(c => {
            if (c.status !== 'completed') return false;
            const classDate = new Date(c.date);
            return classDate.getUTCMonth() === currentMonth && classDate.getUTCFullYear() === currentYear;
        }).length;
    }, [scheduledClasses]);
    
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
        { id: 'myClasses', label: 'Minhas Aulas', icon: DocumentTextIcon },
        { id: 'groups', label: 'Minhas Turmas', icon: UsersIcon },
        { id: 'availability', label: 'Disponibilidade', icon: CalendarDaysIcon },
        { id: 'creativityPanel', label: 'Painel Criativo', icon: SparklesIcon },
    ];

    const pageTitles: Record<View, string> = {
        dashboard: 'Meu Painel',
        availability: 'Disponibilidade Semanal',
        groups: 'Minhas Turmas',
        groupSession: 'Gerenciar Turma',
        myClasses: 'Minhas Aulas',
        creativityPanel: 'Painel de Criatividade',
    };

    const renderContent = () => {
        switch (view) {
            case 'availability':
                return <WeeklyAvailabilityComponent initialAvailability={currentUser.availability || {}} onSave={handleSaveAvailability} />;
            case 'myClasses':
                return <MyClassesView scheduledClasses={scheduledClasses} students={studentsMap} handleOpenReportModal={handleOpenReportModal} />;
            case 'creativityPanel':
                return <CreativityPanelView students={students} currentUser={currentUser} />;
            case 'groupSession':
                return selectedGroup && <GroupSessionManager group={selectedGroup} students={students} onBack={() => setView('dashboard')} />;
            case 'groups':
                return (
                    <div className="animate-fade-in-view space-y-4">
                        {classGroups.length > 0 ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {classGroups.map(g => (
                                    <div key={g.id} className="bg-white border p-4 rounded-lg shadow-sm flex flex-col">
                                        <h4 className="font-bold text-zinc-800 text-lg">{g.name}</h4>
                                        <p className="text-sm text-zinc-500 flex-grow">{g.discipline || 'Sem disciplina'}</p>
                                        <div className="flex items-center gap-2 mt-3 text-sm text-zinc-600">
                                            <UsersIcon className="h-4 w-4" />
                                            <span>{g.studentIds.length} alunos</span>
                                        </div>
                                        <button onClick={() => handleViewGroup(g)} className="mt-4 text-sm w-full font-semibold bg-zinc-100 hover:bg-zinc-200 py-2 rounded-md transition-colors">
                                            Gerenciar Turma
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-white rounded-lg border">
                                <UsersIcon className="mx-auto h-12 w-12 text-zinc-400" />
                                <h3 className="mt-2 text-lg font-medium text-zinc-900">Nenhuma turma encontrada</h3>
                                <p className="mt-1 text-sm text-zinc-500">Você não está atribuído a nenhuma turma no momento.</p>
                            </div>
                        )}
                    </div>
                );
            case 'dashboard':
            default:
                return (
                    <div className="space-y-6 animate-fade-in-view">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DashboardCard title="Aulas Dadas no Mês" value={completedClassesThisMonth} icon={CheckCircleIcon} />
                            <DashboardCard title="Relatórios Pendentes" value={pendingReportsCount} icon={DocumentTextIcon} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-xl font-semibold text-zinc-700 mb-2 flex items-center gap-2">Próximas Aulas</h3>
                                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 bg-white p-2 border rounded-lg">
                                    {upcomingClasses.length > 0 ? upcomingClasses.map(c => {
                                        const student = students.find(s => s.id === c.studentId);
                                        return (
                                            <button key={c.id} onClick={() => student && setClassDetailModal({ class: c, student })} className="w-full text-left bg-zinc-50 p-3 rounded-lg flex justify-between items-center hover:bg-zinc-100 transition-colors">
                                                <div>
                                                    <p className="font-bold text-zinc-800">{student?.name || 'Carregando...'}</p>
                                                    <p className="text-sm text-zinc-600 flex items-center">{c.discipline} {c.location === 'online' && <span className="ml-2 text-xs font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">Online</span>} {c.location === 'presencial' && <span className="ml-2 text-xs font-semibold bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">Presencial</span>}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-semibold">{new Date(c.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                                                    <p className="text-sm text-zinc-500 flex items-center gap-1 justify-end"><ClockIcon/> {c.time}</p>
                                                </div>
                                            </button>
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
            {classDetailModal && <UpcomingClassDetailModal isOpen={!!classDetailModal} onClose={() => setClassDetailModal(null)} classData={classDetailModal.class} student={classDetailModal.student} />}


            <style>{`
                @keyframes fade-in-view { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-view { animation: fade-in-view 0.4s ease-out forwards; }
                @keyframes fade-in-fast { from { opacity: 0; } to { opacity: 1; } } .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};
export default TeacherDashboard;