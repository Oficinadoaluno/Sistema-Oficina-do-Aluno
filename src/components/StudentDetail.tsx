import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Student, Collaborator, ScheduledClass, Professional, ClassPackage, ClassGroup, DayOfWeek, GroupStudentDailyReport } from '../types';
import { db } from '../firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { ToastContext } from '../App';
import {
    ArrowLeftIcon, KeyIcon, CheckBadgeIcon, CalendarDaysIcon, ClockIcon, UserMinusIcon,
    UserPlusIcon, ChevronDownIcon, PencilIcon, XMarkIcon, ClipboardDocumentIcon,
    ChevronLeftIcon, ChevronRightIcon, SparklesIcon
} from './Icons';
import InfoItem from './InfoItem';
import { sanitizeFirestore, getShortName } from '../utils/sanitizeFirestore';

// --- Funções Auxiliares ---

const formatPhoneForDisplay = (phone?: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
};

const calculateAge = (birthDateString?: string): number | null => {
    if (!birthDateString) return null;
    try {
        const birthDate = new Date(birthDateString);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    } catch (e) { return null; }
};

const formatWhatsAppLink = (phone?: string) => `https://wa.me/55${(phone || '').replace(/\D/g, '')}`;


// --- Modais e Componentes Auxiliares ---

interface ManageStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInactivate: () => void;
    student: Student;
    onEdit: () => void;
}
const ManageStudentModal: React.FC<ManageStudentModalProps> = ({ isOpen, onClose, onInactivate, student, onEdit }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-zinc-800 mb-4">Gerenciar Aluno</h3>
                <div className="mt-6 border-t pt-4 space-y-2">
                     <button onClick={onEdit} className="w-full text-left text-sm flex items-center gap-3 py-2 px-3 rounded-lg text-secondary-dark hover:bg-secondary/10 transition-colors"><PencilIcon /><span>Editar Dados Cadastrais</span></button>
                    {student.status !== 'inativo' && (<button onClick={() => { onInactivate(); onClose(); }} className="w-full text-left text-sm flex items-center gap-3 py-2 px-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"><UserMinusIcon /><span>Inativar Aluno</span></button>)}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200 transition-colors">Fechar</button>
                </div>
            </div>
        </div>
    );
};

interface ClassReportModalProps {
    aula: ScheduledClass | null;
    onClose: () => void;
    professionals: Professional[];
}
const ClassReportModal: React.FC<ClassReportModalProps> = ({ aula, onClose, professionals }) => {
    if (!aula || !aula.report) return null;

    const report = aula.report;
    const professional = professionals.find(p => p.id === aula.professionalId);

    return (
         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl m-4 animate-fade-in-down" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-zinc-800">Relatório da Aula</h3>
                        <p className="text-zinc-600 font-semibold">{aula.discipline}</p>
                        <p className="text-sm text-zinc-500" title={professional?.name || 'N/A'}>Prof. {getShortName(professional?.name) || 'N/A'} - {new Date(aula.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                    </div>
                     <button onClick={onClose} className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100 -mt-2 -mr-2"><XMarkIcon /></button>
                </div>
                <div className="mt-4 pt-4 border-t max-h-[60vh] overflow-y-auto pr-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <InfoItem label="Humor do Aluno" value={<span className="text-2xl">{report.mood}</span>} />
                        <InfoItem label="Exercício para Casa" value={report.homeworkAssigned ? 'Sim' : 'Não'} />
                    </div>
                    {report.description && (
                        <InfoItem label="Observações da Aula" value={<p className="whitespace-pre-wrap">{report.description}</p>} />
                    )}

                    {report.testRecord && (
                        <div>
                            <h4 className="text-sm font-medium text-zinc-500">Nota de Prova Registrada</h4>
                            <div className="p-3 bg-zinc-50 rounded-md mt-1 grid grid-cols-3 gap-2">
                                <InfoItem label="Tipo" value={report.testRecord.type} />
                                <InfoItem label="Nota Máxima" value={report.testRecord.maxScore.toFixed(1)} />
                                <InfoItem label="Nota Aluno" value={<span className="font-bold text-lg text-secondary">{report.testRecord.studentScore.toFixed(1)}</span>} />
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <h4 className="text-sm font-medium text-zinc-500">Conteúdo Abordado</h4>
                        <div className="p-3 bg-zinc-50 rounded-md mt-1 space-y-2">{(report.contents && report.contents.length > 0) ? report.contents.map((c, index) => (<div key={index}><p className="font-semibold text-zinc-800">{c.discipline}</p><p className="text-zinc-700 pl-2">{c.content}</p></div>)) : <p className="text-zinc-500">Nenhum conteúdo especificado.</p>}</div>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-zinc-500">Próximos Passos / Tópicos a Revisar</h4>
                        <div className="p-3 bg-zinc-50 rounded-md mt-1">
                           {report.nextSteps && report.nextSteps.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-1 text-zinc-700">
                                    {report.nextSteps.map((step, index) => <li key={index}>{step}</li>)}
                                </ul>
                           ) : <p className="text-zinc-500">Nenhum próximo passo definido.</p>}
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end"><button onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200 transition-colors">Fechar</button></div>
            </div>
        </div>
    );
};

interface GroupReportModalProps {
    report: GroupStudentDailyReport | null;
    group: ClassGroup | undefined;
    onClose: () => void;
}
const GroupReportModal: React.FC<GroupReportModalProps> = ({ report, group, onClose }) => {
    if (!report) return null;

    return (
         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg m-4 animate-fade-in-down" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-zinc-800">Relatório da Aula em Turma</h3>
                        <p className="text-zinc-600 font-semibold">{group?.name || 'Turma'}</p>
                        <p className="text-sm text-zinc-500">{new Date(report.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                    </div>
                     <button onClick={onClose} className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100 -mt-2 -mr-2"><XMarkIcon /></button>
                </div>
                <div className="mt-4 pt-4 border-t max-h-[60vh] overflow-y-auto pr-2 space-y-4">
                    <div>
                        <h4 className="text-sm font-medium text-zinc-500">Matérias e Atividades</h4>
                        <div className="p-3 bg-zinc-50 rounded-md mt-1 space-y-2">
                            {(report.subjects && report.subjects.length > 0) ? report.subjects.map((s, index) => (
                                <div key={index} className="flex justify-between">
                                    <p className="font-semibold text-zinc-800">{s.discipline}</p>
                                    <p className="text-zinc-700 font-medium bg-zinc-200 px-2 py-0.5 rounded-full text-xs">{s.activity}</p>
                                </div>
                            )) : <p className="text-zinc-500">Nenhuma matéria registrada.</p>}
                        </div>
                    </div>
                     <div>
                        <h4 className="text-sm font-medium text-zinc-500">Observações e Ocorrências</h4>
                        <div className="p-3 bg-zinc-50 rounded-md mt-1">
                            <p className="whitespace-pre-wrap text-zinc-700">{report.observations || 'Nenhuma observação.'}</p>
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200 transition-colors">Fechar</button>
                </div>
            </div>
        </div>
    );
};

const CopyableInfoItem: React.FC<{ label: string; value?: string }> = ({ label, value }) => {
    const [copied, setCopied] = useState(false);
    if (!value) return null;
    const handleCopy = () => { navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };
    return (
        <div>
            <p className="text-xs text-zinc-500 font-medium uppercase">{label}</p>
            <div className="flex items-center gap-2 group">
                <p className="text-zinc-800 flex-grow truncate" title={value}>{value}</p>
                <button onClick={handleCopy} className={`text-zinc-400 hover:text-secondary p-1 rounded-md transition-all ${copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'}`} title={copied ? "Copiado!" : "Copiar"}>
                    {copied ? (<CheckBadgeIcon className="h-5 w-5 text-cyan-500" />) : (<ClipboardDocumentIcon className="h-5 w-5" />)}
                </button>
            </div>
        </div>
    );
};

const StudentInfoDisplay: React.FC<{student: Student}> = ({ student }) => {
    const age = student.birthDate ? calculateAge(student.birthDate) : null;
    const formattedBirthDate = student.birthDate ? new Date(student.birthDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : undefined;
    
    return (
        <div className="space-y-6 animate-fade-in-fast">
             <fieldset className="border-t pt-4">
                <legend className="text-lg font-semibold text-zinc-700 -mt-8 px-2 bg-white">Dados do Aluno</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                    <InfoItem label="Nome Completo" value={student.name} />
                    <InfoItem label="Data de Nascimento" value={age !== null && formattedBirthDate ? `${formattedBirthDate} (${age} anos)` : formattedBirthDate} />
                    <InfoItem label="Colégio" value={student.school} /><InfoItem label="Unidade" value={student.schoolUnit} /><InfoItem label="Ano/Série" value={student.grade} /><InfoItem label="Principal Objetivo" value={student.objective} /><InfoItem label="Telefone" value={formatPhoneForDisplay(student.phone)} /><InfoItem label="Email" value={student.email} /><CopyableInfoItem label="Login da Escola" value={student.schoolLogin} /><CopyableInfoItem label="Senha da Escola" value={student.schoolPassword} /><InfoItem label="Material Didático" value={student.didacticMaterial} /><InfoItem label="Neurodivergência/Limitações" value={student.neurodiversity} /><InfoItem label="Medicamentos e Instruções" value={student.medications} />
                </div>
            </fieldset>
             <fieldset className="border-t pt-4">
                <legend className="text-lg font-semibold text-zinc-700 -mt-8 px-2 bg-white">Dados dos Responsáveis</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                    <InfoItem label="Mãe" value={student.motherName} /><InfoItem label="Pai" value={student.fatherName} /><InfoItem label="Responsável Financeiro" value={student.financialGuardian === 'outro' ? student.otherGuardianName : student.financialGuardian} /><InfoItem label="Endereço" value={student.guardianAddress} /><InfoItem label="Telefone" value={formatPhoneForDisplay(student.guardianPhone)} /><InfoItem label="Celular" value={student.guardianMobile ? (<a href={formatWhatsAppLink(student.guardianMobile)} target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">{formatPhoneForDisplay(student.guardianMobile)}</a>) : undefined} /><InfoItem label="Email" value={student.guardianEmail} /><InfoItem label="CPF" value={student.guardianCpf} />
                </div>
            </fieldset>
        </div>
    );
}

const AISummaryDisplay: React.FC<{ summaryData?: Student['aiSummary'] }> = ({ summaryData }) => {
    if (!summaryData?.summary) {
        return (
            <div className="bg-violet-50 border border-violet-200 p-4 rounded-lg text-center">
                <SparklesIcon className="h-8 w-8 text-violet-400 mx-auto mb-2" />
                <h4 className="font-semibold text-violet-800">Análise de Desempenho (IA)</h4>
                <p className="text-sm text-violet-600 mt-1">A análise de IA será gerada após o registro de um novo relatório de aula.</p>
            </div>
        );
    }

    const formattedDate = new Date(summaryData.lastUpdated).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

    return (
        <div className="bg-violet-50 border-l-4 border-violet-400 p-4 rounded-r-lg animate-fade-in-fast">
            <div className="flex items-start gap-3">
                <SparklesIcon className="h-6 w-6 text-violet-500 flex-shrink-0 mt-1" />
                <div>
                    <h4 className="font-bold text-violet-900 text-lg">Análise de Desempenho (IA)</h4>
                    <p className="text-violet-800 mt-2 whitespace-pre-wrap">{summaryData.summary}</p>
                    <p className="text-xs text-violet-500 mt-3">Análise gerada em {formattedDate}</p>
                </div>
            </div>
        </div>
    );
};


// --- Componente Principal ---

interface StudentDetailProps { student: Student; onBack: () => void; onEdit: () => void; currentUser: Collaborator; }

const StudentDetail: React.FC<StudentDetailProps> = ({ student, onBack, onEdit, currentUser }) => {
    const { showToast } = useContext(ToastContext) as { showToast: (message: string, type?: 'success' | 'error' | 'info') => void; };

    const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
    const [showAllInfo, setShowAllInfo] = useState(false);
    const [selectedClassReport, setSelectedClassReport] = useState<ScheduledClass | null>(null);
    const [selectedGroupReport, setSelectedGroupReport] = useState<GroupStudentDailyReport | null>(null);
    const [allScheduledClasses, setAllScheduledClasses] = useState<ScheduledClass[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [classPackages, setClassPackages] = useState<ClassPackage[]>([]);
    const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
    const [groupReports, setGroupReports] = useState<GroupStudentDailyReport[]>([]);
    const [monthOffset, setMonthOffset] = useState(0);


     useEffect(() => {
        const createErrorHandler = (context: string) => (error: any) => {
            console.error(`Firestore (${context}) Error:`, error);
            showToast(`Erro ao carregar ${context}.`, "error");
        };

        const unsubClasses = db.collection("scheduledClasses").where("studentId", "==", student.id)
            .onSnapshot(snap => {
                const classes = snap.docs.map(d => ({id: d.id, ...d.data()})) as ScheduledClass[];
                classes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setAllScheduledClasses(classes);
            }, createErrorHandler('aulas'));
        
        const unsubProfs = db.collection("professionals")
            .onSnapshot(snap => setProfessionals(snap.docs.map(d => ({id: d.id, ...d.data()})) as Professional[]), createErrorHandler('profissionais'));
        
        const unsubPackages = db.collection("classPackages").where("studentId", "==", student.id)
            .onSnapshot(snap => setClassPackages(snap.docs.map(d => ({id: d.id, ...d.data()})) as ClassPackage[]), createErrorHandler('pacotes'));

        const unsubGroups = db.collection("classGroups").where("studentIds", "array-contains", student.id)
            .onSnapshot(snap => setClassGroups(snap.docs.map(d => ({id: d.id, ...d.data()})) as ClassGroup[]), createErrorHandler('turmas'));

        const unsubGroupReports = db.collection("groupStudentDailyReports").where("studentId", "==", student.id).orderBy("date", "desc")
            .onSnapshot(snap => setGroupReports(snap.docs.map(d => ({id: d.id, ...d.data()})) as GroupStudentDailyReport[]), createErrorHandler('relatórios de turma'));

        return () => {
            unsubClasses();
            unsubProfs();
            unsubPackages();
            unsubGroups();
            unsubGroupReports();
        };
    }, [student.id, showToast]);
    
    const { upcomingClasses, pastClasses } = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const upcoming = allScheduledClasses.filter(c => c.date >= todayStr);
        const past = allScheduledClasses
            .filter(c => c.date < todayStr)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return { upcomingClasses: upcoming, pastClasses: past };
    }, [allScheduledClasses]);

    const packagesWithUsage = useMemo(() => {
        return classPackages.map(pkg => {
            const usedHours = allScheduledClasses.filter(c => c.packageId === pkg.id).reduce((sum, currentClass) => sum + (currentClass.duration / 60), 0);
            const remainingHours = pkg.totalHours - usedHours;
            return { ...pkg, usedHours, remainingHours };
        }).sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());
    }, [classPackages, allScheduledClasses]);

    const { monthName, monthlyClasses } = useMemo(() => {
        const targetDate = new Date();
        targetDate.setUTCHours(0, 0, 0, 0);
        targetDate.setDate(1);
        targetDate.setMonth(targetDate.getMonth() + monthOffset);

        const monthName = targetDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        const monthStart = targetDate;
        const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

        const individualClassesInMonth = allScheduledClasses.filter(c => {
            const classDate = new Date(c.date);
            return classDate >= monthStart && classDate <= monthEnd;
        });

        const groupClassInstancesInMonth: (ScheduledClass & {isGroup: true, groupName: string})[] = [];
        classGroups.forEach(group => {
            if (group.status !== 'active' || group.schedule.type !== 'recurring' || !group.schedule.days) return;
            for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
                const dayOfWeek = (['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as DayOfWeek[])[d.getUTCDay()];
                const timeInfo = group.schedule.days[dayOfWeek];
                if (timeInfo) {
                    groupClassInstancesInMonth.push({
                        id: `group-${group.id}-${d.toISOString().split('T')[0]}`,
                        date: d.toISOString().split('T')[0],
                        time: timeInfo.start,
                        studentId: student.id,
                        professionalId: group.professionalId,
                        discipline: group.discipline || 'Turma',
                        isGroup: true,
                        groupName: group.name,
                        // Dummy fields to satisfy type
                        type: 'Aula Regular', content: '', duration: 0, reportRegistered: false, status: 'scheduled'
                    });
                }
            }
        });
        
// FIX: Corrected typo from `groupClassInstances` to `groupClassInstancesInMonth`.
        const combined = [...individualClassesInMonth, ...groupClassInstancesInMonth]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time));

        return { monthName, monthlyClasses: combined };
    }, [monthOffset, allScheduledClasses, classGroups, student.id]);

    const updateStatus = async (newStatus: Student['status']) => {
        const studentRef = db.collection("students").doc(student.id);
        try {
            await studentRef.update(sanitizeFirestore({ status: newStatus }));
            showToast(`Status do aluno atualizado para "${newStatus}"!`, 'success');
        } catch (error: any) {
            console.error("Error updating student status: ", error);
            showToast("Falha ao atualizar status.", 'error');
        }
    };
    
    const handlePaymentStatusChange = async (classId: string, newStatus: ScheduledClass['paymentStatus']) => {
        const classToUpdate = allScheduledClasses.find(c => c.id === classId);
        if (!classToUpdate) return;
    
        const batch = db.batch();
        const classRef = db.collection('scheduledClasses').doc(classId);
        
        try {
            // --- Logic for changing TO 'paid' ---
            if (newStatus === 'paid' && classToUpdate.paymentStatus !== 'paid') {
                const professional = professionals.find(p => p.id === classToUpdate.professionalId);
                const hourlyRate = professional?.hourlyRateIndividual || 70; // Fallback rate
                const amount = (classToUpdate.duration / 60) * hourlyRate;
                
                if (amount > 0) {
                    const transactionData = {
                        type: 'credit' as const, date: classToUpdate.date, amount, studentId: student.id,
                        description: `Pagamento aula de ${classToUpdate.discipline} para ${student.name}`,
                        registeredById: currentUser.id, classId: classId
                    };
                    const newTxRef = db.collection('transactions').doc(); // Create ref with new ID
                    batch.set(newTxRef, sanitizeFirestore(transactionData as any));
                    batch.update(classRef, { paymentStatus: 'paid', packageId: firebase.firestore.FieldValue.delete(), transactionId: newTxRef.id });
                } else {
                    batch.update(classRef, { paymentStatus: 'paid', packageId: firebase.firestore.FieldValue.delete() });
                }
                showToast('Aula marcada como paga e transação registrada.', 'success');
            
            // --- Logic for changing TO 'package' ---
            } else if (newStatus === 'package') {
                const availablePackage = packagesWithUsage.find(p => p.status === 'active' && p.remainingHours > 0);
                if (!availablePackage) {
                    showToast('Aluno não possui créditos de horas disponíveis.', 'error');
                    return; // Abort
                }
                if (classToUpdate.transactionId) {
                    const txRef = db.collection('transactions').doc(classToUpdate.transactionId);
                    batch.delete(txRef);
                }
                batch.update(classRef, { paymentStatus: 'package', packageId: availablePackage.id, transactionId: firebase.firestore.FieldValue.delete() });
                showToast('Aula debitada do pacote.', 'success');
    
            // --- Logic for changing FROM 'paid' or 'package' to something else ---
            } else {
                if (classToUpdate.transactionId) {
                    const txRef = db.collection('transactions').doc(classToUpdate.transactionId);
                    batch.delete(txRef);
                    showToast('Transação financeira estornada.', 'info');
                }
                batch.update(classRef, { paymentStatus: newStatus, packageId: firebase.firestore.FieldValue.delete(), transactionId: firebase.firestore.FieldValue.delete() });
                showToast('Status da aula atualizado.', 'success');
            }
            
            await batch.commit();

        } catch (error) {
            console.error("Error updating class payment status:", error);
            showToast('Erro ao atualizar status da aula.', 'error');
        }
    };


    const getStatusStyles = (status: Student['status']) => ({ matricula: 'bg-secondary/10 text-secondary-dark', prospeccao: 'bg-amber-100 text-amber-800', inativo: 'bg-zinc-200 text-zinc-700' }[status]);
    const getStatusText = (status: Student['status']) => ({ matricula: 'Matriculado', prospeccao: 'Prospecção', inativo: 'Inativo' }[status]);

    return (
        <>
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
            <header className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 p-2 rounded-full hover:bg-zinc-100"><ArrowLeftIcon className="h-6 w-6" /></button>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-800 flex items-center gap-3" title={student.name}>{student.name}<span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStatusStyles(student.status)}`}>{getStatusText(student.status)}</span></h2>
                        <p className="text-sm text-zinc-500">{student.school} - {student.grade}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {student.status === 'prospeccao' && (<button onClick={() => updateStatus('matricula')} className="flex items-center gap-2 text-sm bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-3 rounded-lg"><CheckBadgeIcon/><span>Converter para Matriculado</span></button>)}
                    {student.status === 'inativo' && (<button onClick={() => updateStatus('matricula')} className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg"><UserPlusIcon /><span>Reativar Aluno</span></button>)}
                    <button onClick={() => setIsAccessModalOpen(true)} className="flex items-center gap-2 text-sm bg-zinc-600 hover:bg-zinc-700 text-white font-semibold py-2 px-3 rounded-lg"><KeyIcon /><span>Gerenciar</span></button>
                </div>
            </header>

            <main className="flex-grow overflow-y-auto space-y-8 pr-2 -mr-2">
                <section className="bg-neutral p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                    <button onClick={() => setShowAllInfo(!showAllInfo)} className="w-full text-secondary hover:text-secondary-dark font-semibold text-sm flex items-center gap-1 justify-center">
                        <span>{showAllInfo ? 'Ocultar' : 'Mostrar'} todas as informações</span>
                        <ChevronDownIcon className={`h-4 w-4 transition-transform ${showAllInfo ? 'rotate-180' : ''}`} />
                    </button>
                </section>
                
                {showAllInfo && (<section><StudentInfoDisplay student={student} /></section>)}

                <section>
                    <AISummaryDisplay summaryData={student.aiSummary} />
                </section>

                 <section>
                    <div className="flex items-center justify-between mb-4">
                         <h3 className="text-xl font-semibold text-zinc-700">Aulas do Mês</h3>
                         <div className="flex items-center gap-2">
                            <button onClick={() => setMonthOffset(monthOffset - 1)} className="p-2 rounded-full hover:bg-zinc-100"><ChevronLeftIcon /></button>
                            <span className="font-semibold text-lg text-zinc-800 capitalize">{monthName}</span>
                            <button onClick={() => setMonthOffset(monthOffset + 1)} className="p-2 rounded-full hover:bg-zinc-100"><ChevronRightIcon /></button>
                        </div>
                    </div>
                     <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-zinc-200">
                            <thead className="bg-zinc-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Data</th><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Disciplina</th><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Professor</th><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase w-48">Status Pagamento</th></tr></thead>
                            <tbody className="bg-white divide-y divide-zinc-200">{monthlyClasses.map(aula => {
                                const professional = professionals.find(p => p.id === aula.professionalId);
                                return (<tr key={aula.id} className={(aula as any).isGroup ? 'bg-zinc-50' : ''}><td className="px-4 py-3 text-sm text-zinc-600">{new Date(aula.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} às {aula.time}</td><td className="px-4 py-3 text-sm font-medium text-zinc-800 flex items-center">{aula.discipline} {(aula as any).isGroup && <span className="text-xs font-normal text-zinc-500 ml-1">({(aula as any).groupName})</span>} {aula.location === 'online' && <span className="ml-2 text-xs font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">Online</span>} {aula.location === 'presencial' && <span className="ml-2 text-xs font-semibold bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">Presencial</span>}</td><td className="px-4 py-3 text-sm text-zinc-600" title={professional?.name}>{getShortName(professional?.name) || 'N/A'}</td><td className="px-4 py-3 text-sm">
                                {!(aula as any).isGroup ? (
                                    <select value={aula.paymentStatus || 'pending'} onChange={e => handlePaymentStatusChange(aula.id, e.target.value as any)} className="w-full text-sm p-1 border-zinc-300 rounded-md focus:ring-secondary focus:border-secondary">
                                        <option value="pending">Pendente</option>
                                        <option value="paid">Paga</option>
                                        <option value="package">Pacote</option>
                                        <option value="free">Gratuita</option>
                                    </select>
                                ) : (<span className="text-zinc-400">N/A</span>)}
                            </td></tr>)})}</tbody>
                        </table>
                        {monthlyClasses.length === 0 && <p className="p-4 text-center text-zinc-500">Nenhuma aula encontrada neste mês.</p>}
                    </div>
                </section>

                <section>
                    <div className="flex items-center gap-3 mb-4"><CalendarDaysIcon className="h-6 w-6 text-secondary" /><h3 className="text-xl font-semibold text-zinc-700">Próximas Aulas Individuais</h3></div>
                    <div className="space-y-3">{upcomingClasses.length > 0 ? upcomingClasses.map(aula => {
                        const professional = professionals.find(p=>p.id === aula.professionalId);
                        return (<div key={aula.id} className="bg-zinc-50 p-3 rounded-lg flex items-center justify-between"><div><p className="font-bold text-zinc-800 flex items-center">{aula.discipline} {aula.location === 'online' && <span className="ml-2 text-xs font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">Online</span>} {aula.location === 'presencial' && <span className="ml-2 text-xs font-semibold bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">Presencial</span>}</p><p className="text-sm text-zinc-500" title={professional?.name}>{`Prof. ${getShortName(professional?.name) || 'N/A'}`}</p></div><div className="text-right text-sm text-zinc-600"><p>{new Date(aula.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p><p className="flex items-center justify-end gap-1"><ClockIcon/> {aula.time}</p></div></div>)
                    }) : <p className="text-zinc-500 text-sm p-4 text-center">Nenhuma aula agendada.</p>}</div>
                </section>

                <section>
                    <h3 className="text-xl font-semibold text-zinc-700 mb-4">Histórico de Aulas Individuais</h3>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-zinc-200">
                            <thead className="bg-zinc-50"><tr><th scope="col" className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Data</th><th scope="col" className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Disciplina</th><th scope="col" className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Professor</th><th scope="col" className="relative px-4 py-2"><span className="sr-only">Ações</span></th></tr></thead>
                            <tbody className="bg-white divide-y divide-zinc-200">{pastClasses.map(aula => {
                                const professional = professionals.find(p => p.id === aula.professionalId);
                                return (<tr key={aula.id}><td className="px-4 py-3 text-sm text-zinc-600">{new Date(aula.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td><td className="px-4 py-3 text-sm font-medium text-zinc-800">{aula.discipline}</td><td className="px-4 py-3 text-sm text-zinc-600" title={professional?.name}>{`Prof. ${getShortName(professional?.name) || 'N/A'}`}</td><td className="px-4 py-3 text-right text-sm">{aula.reportRegistered ? (<button onClick={() => setSelectedClassReport(aula)} className="text-secondary hover:text-secondary-dark font-semibold">Ver Relatório</button>) : (<span className="text-zinc-400">Pendente</span>)}</td></tr>)
                            })}</tbody>
                        </table>
                        {pastClasses.length === 0 && <p className="p-4 text-center text-zinc-500">Nenhum histórico de aulas encontrado.</p>}
                    </div>
                </section>

                <section>
                    <h3 className="text-xl font-semibold text-zinc-700 mb-4">Histórico de Aulas em Turma</h3>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-zinc-200">
                            <thead className="bg-zinc-50"><tr><th scope="col" className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Data</th><th scope="col" className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Turma</th><th scope="col" className="relative px-4 py-2"><span className="sr-only">Ações</span></th></tr></thead>
                            <tbody className="bg-white divide-y divide-zinc-200">{groupReports.map(report => (<tr key={report.id}><td className="px-4 py-3 text-sm text-zinc-600">{new Date(report.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td><td className="px-4 py-3 text-sm font-medium text-zinc-800">{classGroups.find(g => g.id === report.groupId)?.name || 'Turma não encontrada'}</td><td className="px-4 py-3 text-right text-sm"><button onClick={() => setSelectedGroupReport(report)} className="text-secondary hover:text-secondary-dark font-semibold">Ver Relatório</button></td></tr>))}</tbody>
                        </table>
                        {groupReports.length === 0 && <p className="p-4 text-center text-zinc-500">Nenhum relatório de aulas em turma encontrado.</p>}
                    </div>
                </section>
            </main>
        </div>
        <ManageStudentModal isOpen={isAccessModalOpen} onClose={() => setIsAccessModalOpen(false)} onInactivate={() => updateStatus('inativo')} student={student} onEdit={() => { setIsAccessModalOpen(false); onEdit(); }} />
        <ClassReportModal aula={selectedClassReport} onClose={() => setSelectedClassReport(null)} professionals={professionals}/>
        <GroupReportModal report={selectedGroupReport} group={classGroups.find(g => g.id === selectedGroupReport?.groupId)} onClose={() => setSelectedGroupReport(null)} />
        <style>{`
            @keyframes fade-in-fast { from { opacity: 0; } to { opacity: 1; } } .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
            @keyframes fade-in-down { from { opacity: 0; transform: translateY(-10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } } .animate-fade-in-down { animation: fade-in-down 0.2s ease-out forwards; }
        `}</style>
        </>
    );
}

export default StudentDetail;