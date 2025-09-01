import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Student, Collaborator, ScheduledClass, ContinuityItem, Professional } from '../types';
import FinancialModal from './FinancialModal';
import { db } from '../firebase';
import { ToastContext } from '../App';
import {
    ArrowLeftIcon, CreditCardIcon, KeyIcon, CheckBadgeIcon, CalendarDaysIcon, ClockIcon, UserMinusIcon,
    UserPlusIcon, ChevronDownIcon, PencilIcon, XMarkIcon, ClipboardDocumentIcon
} from './Icons';
import InfoItem from './InfoItem';
import { sanitizeFirestore } from '../utils/sanitizeFirestore';

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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
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
    continuityItems: ContinuityItem[];
}
const ClassReportModal: React.FC<ClassReportModalProps> = ({ aula, onClose, professionals, continuityItems }) => {
    if (!aula || !aula.report) return null;

    const report = aula.report;
    const professional = professionals.find(p => p.id === aula.professionalId);

    return (
         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl m-4 animate-fade-in-down" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-zinc-800">Relatório da Aula</h3>
                        <p className="text-zinc-600 font-semibold">{aula.discipline}</p>
                        <p className="text-sm text-zinc-500">Prof. {professional?.name || 'N/A'} - {new Date(aula.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                    </div>
                     <button onClick={onClose} className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100 -mt-2 -mr-2"><XMarkIcon /></button>
                </div>
                <div className="mt-4 pt-4 border-t max-h-[60vh] overflow-y-auto pr-2 space-y-4">
                    <InfoItem label="Humor do Aluno" value={<span className="text-2xl">{report.mood}</span>} />
                    <div>
                        <h4 className="text-sm font-medium text-zinc-500">Conteúdo Abordado</h4>
                        <div className="p-3 bg-zinc-50 rounded-md mt-1 space-y-2">{(report.contents && report.contents.length > 0) ? report.contents.map((c, index) => (<div key={index}><p className="font-semibold text-zinc-800">{c.discipline}</p><p className="text-zinc-700 pl-2">{c.content}</p></div>)) : <p className="text-zinc-500">Nenhum conteúdo especificado.</p>}</div>
                    </div>
                    <InfoItem label="Descrição da Aula" value={<p className="whitespace-pre-wrap">{report.description}</p>} />
                    <div className="grid grid-cols-2 gap-4"><InfoItem label="Habilidades" value={report.skills} /><InfoItem label="Dificuldades" value={report.difficulties} /></div>
                    <div>
                        <h4 className="text-sm font-medium text-zinc-500">Plano de Continuidade</h4>
                        <div className="p-3 bg-zinc-50 rounded-md mt-1 space-y-2">
                           {report.continuityUpdates && report.continuityUpdates.length > 0 && <div><strong>Atualizações:</strong><ul className="list-disc pl-5">{report.continuityUpdates.map(upd => { const item = continuityItems.find(i => i.id === upd.id); return <li key={upd.id}>"{item?.description}" → {upd.newStatus.replace('_', ' ')}</li>; })}</ul></div>}
                           {report.continuityCreated && report.continuityCreated.length > 0 && (<div><strong>Novos itens criados:</strong><ul className="list-disc pl-5 mt-1 space-y-1">{report.continuityCreated.map((item, index) => (<li key={index}>{item.description}<span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-zinc-200 text-zinc-700">Status inicial: {item.status.replace('_', ' ')}</span></li>))}</ul></div>)}
                        </div>
                    </div>
                     <div>
                        <h4 className="text-sm font-medium text-zinc-500">Exercícios</h4>
                        {report.exercisesDismissed ? (<div className="p-3 bg-amber-50 rounded-md mt-1"><p className="font-semibold text-amber-800">Exercícios dispensados</p><p className="text-amber-700">{report.dismissalReason}</p></div>) : (<div className="p-3 bg-green-50 rounded-md mt-1"><p className="font-semibold text-green-800">Instruções</p><p className="text-green-700">{report.exerciseInstructions}</p></div>)}
                    </div>
                </div>
                <div className="mt-6 flex justify-end"><button onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200 transition-colors">Fechar</button></div>
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
                    {copied ? (<CheckBadgeIcon className="h-5 w-5 text-green-500" />) : (<ClipboardDocumentIcon className="h-5 w-5" />)}
                </button>
            </div>
        </div>
    );
};

const StudentInfoDisplay: React.FC<{student: Student; continuityItems: ContinuityItem[]}> = ({ student, continuityItems }) => {
    const age = student.birthDate ? calculateAge(student.birthDate) : null;
    const formattedBirthDate = student.birthDate ? new Date(student.birthDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : undefined;
    const activeContinuityItems = continuityItems.filter(i => i.studentId === student.id && i.status !== 'concluido');
    const getStatusStyles = (status: ContinuityItem['status']) => ({
        'em_andamento': 'bg-blue-100 text-blue-800',
        'nao_iniciado': 'bg-amber-100 text-amber-800',
        'concluido': 'bg-green-100 text-green-800'
    }[status]);

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
                <legend className="text-lg font-semibold text-zinc-700 -mt-8 px-2 bg-white">Plano de Continuidade</legend>
                <div className="pt-2 space-y-2">{activeContinuityItems.length > 0 ? activeContinuityItems.map(item => (<div key={item.id} className="p-3 bg-zinc-50 rounded-lg flex justify-between items-center"><p className="text-zinc-800">{item.description}</p><span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStatusStyles(item.status)}`}>{item.status.replace('_', ' ')}</span></div>)) : <p className="text-zinc-500 text-sm">Nenhum item de continuidade ativo.</p>}</div>
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

// --- Componente Principal ---

interface StudentDetailProps { student: Student; onBack: () => void; onEdit: () => void; currentUser: Collaborator; }

const StudentDetail: React.FC<StudentDetailProps> = ({ student, onBack, onEdit, currentUser }) => {
    const { showToast } = useContext(ToastContext) as { showToast: (message: string, type?: 'success' | 'error' | 'info') => void; };

    const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
    const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
    const [showAllInfo, setShowAllInfo] = useState(false);
    const [selectedClassReport, setSelectedClassReport] = useState<ScheduledClass | null>(null);
    const [allScheduledClasses, setAllScheduledClasses] = useState<ScheduledClass[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [continuityItems, setContinuityItems] = useState<ContinuityItem[]>([]);

    useEffect(() => {
        const createSpecificErrorHandler = (context: string) => (error: any) => {
            console.error(`Firestore (${context}) Error:`, error);
            if (error.code === 'permission-denied') {
                showToast(`Você não tem permissão para ver ${context.toLowerCase()}.`, "error");
            } else if (error.code === 'failed-precondition') {
                showToast(`Erro de configuração: índice ausente para ${context.toLowerCase()}.`, "error");
            } else if (error.code === 'unavailable') {
                showToast(`Erro de conexão ao buscar ${context.toLowerCase()}. Verifique sua internet.`, "error");
            } else {
                showToast(`Ocorreu um erro ao buscar dados de ${context.toLowerCase()}.`, "error");
            }
        };
        
        // FIX: Removed server-side orderBy to prevent index error. Sorting is now done client-side.
        const qClasses = db.collection("scheduledClasses").where("studentId", "==", student.id);
        const unsubClasses = qClasses.onSnapshot(
            snap => {
                const classes = snap.docs.map(d => ({id: d.id, ...d.data()})) as ScheduledClass[];
                // Sort classes by date ascending client-side
                classes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setAllScheduledClasses(classes);
            }, 
            createSpecificErrorHandler("aulas agendadas")
        );
        
        const qContinuity = db.collection("continuityItems").where("studentId", "==", student.id);
        const unsubContinuity = qContinuity.onSnapshot(
            snap => setContinuityItems(snap.docs.map(d => ({id: d.id, ...d.data()})) as ContinuityItem[]), 
            createSpecificErrorHandler("plano de continuidade")
        );
        
        const qProfessionals = db.collection("professionals");
        const unsubProfessionals = qProfessionals.onSnapshot(
            snap => setProfessionals(snap.docs.map(d => ({id: d.id, ...d.data()})) as Professional[]), 
            createSpecificErrorHandler("profissionais")
        );

        return () => { unsubClasses(); unsubContinuity(); unsubProfessionals(); };
    }, [student.id, showToast]);
    
    const { upcomingClasses, pastClasses } = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const upcoming = allScheduledClasses.filter(c => c.date >= todayStr);
        const past = allScheduledClasses
            .filter(c => c.date < todayStr)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return { upcomingClasses: upcoming, pastClasses: past };
    }, [allScheduledClasses]);

    const updateStatus = async (newStatus: Student['status']) => {
        const studentRef = db.collection("students").doc(student.id);
        try {
            await studentRef.update(sanitizeFirestore({ status: newStatus }));
            showToast(`Status do aluno atualizado para "${newStatus}"!`, 'success');
        } catch (error: any) {
            console.error("Error updating student status: ", error);
            if (error.code === 'permission-denied') showToast("Você não tem permissão para alterar o status.", "error");
            else showToast("Falha ao atualizar status.", 'error');
        }
    };

    const getStatusStyles = (status: Student['status']) => ({ matricula: 'bg-green-100 text-green-800', prospeccao: 'bg-amber-100 text-amber-800', inativo: 'bg-zinc-200 text-zinc-700' }[status]);
    const getStatusText = (status: Student['status']) => ({ matricula: 'Matriculado', prospeccao: 'Prospecção', inativo: 'Inativo' }[status]);

    return (
        <>
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
            <header className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 p-2 rounded-full hover:bg-zinc-100"><ArrowLeftIcon className="h-6 w-6" /></button>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-800 flex items-center gap-3">{student.name}<span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStatusStyles(student.status)}`}>{getStatusText(student.status)}</span></h2>
                        <p className="text-sm text-zinc-500">{student.school} - {student.grade}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {student.status === 'prospeccao' && (<button onClick={() => updateStatus('matricula')} className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded-lg"><CheckBadgeIcon/><span>Converter para Matriculado</span></button>)}
                    {student.status === 'inativo' && (<button onClick={() => updateStatus('matricula')} className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg"><UserPlusIcon /><span>Reativar Aluno</span></button>)}
                    <button onClick={() => setIsAccessModalOpen(true)} className="flex items-center gap-2 text-sm bg-zinc-600 hover:bg-zinc-700 text-white font-semibold py-2 px-3 rounded-lg"><KeyIcon /><span>Gerenciar</span></button>
                </div>
            </header>

            <main className="flex-grow overflow-y-auto space-y-8 pr-2 -mr-2">
                <section className="bg-neutral p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4"><div className="bg-primary/10 p-3 rounded-full"><CreditCardIcon className="h-8 w-8 text-primary" /></div><div><h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Saldo de Créditos</h3><p className="text-4xl font-bold text-primary">{student.credits || 0}</p></div></div>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <button onClick={() => setShowAllInfo(!showAllInfo)} className="flex-1 text-secondary hover:text-secondary-dark font-semibold text-sm flex items-center gap-1 justify-center"><span>{showAllInfo ? 'Ocultar' : 'Mostrar'} informações</span><ChevronDownIcon className={`h-4 w-4 transition-transform ${showAllInfo ? 'rotate-180' : ''}`} /></button>
                        <button onClick={() => setIsFinancialModalOpen(true)} className="flex-1 py-2 px-4 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark">Financeiro</button>
                    </div>
                </section>
                
                {showAllInfo && (<section><StudentInfoDisplay student={student} continuityItems={continuityItems} /></section>)}

                <section>
                    <div className="flex items-center gap-3 mb-4"><CalendarDaysIcon className="h-6 w-6 text-secondary" /><h3 className="text-xl font-semibold text-zinc-700">Próximas Aulas</h3></div>
                    <div className="space-y-3">{upcomingClasses.length > 0 ? upcomingClasses.map(aula => (<div key={aula.id} className="bg-zinc-50 p-3 rounded-lg flex items-center justify-between"><div><p className="font-bold text-zinc-800">{aula.discipline}</p><p className="text-sm text-zinc-500">Prof. {professionals.find(p=>p.id === aula.professionalId)?.name || 'N/A'}</p></div><div className="text-right text-sm text-zinc-600"><p>{new Date(aula.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p><p className="flex items-center justify-end gap-1"><ClockIcon/> {aula.time}</p></div></div>)) : <p className="text-zinc-500 text-sm p-4 text-center">Nenhuma aula agendada.</p>}</div>
                </section>

                <section>
                    <h3 className="text-xl font-semibold text-zinc-700 mb-4">Histórico de Aulas</h3>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-zinc-200">
                            <thead className="bg-zinc-50"><tr><th scope="col" className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Data</th><th scope="col" className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Disciplina</th><th scope="col" className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Professor</th><th scope="col" className="relative px-4 py-2"><span className="sr-only">Ações</span></th></tr></thead>
                            <tbody className="bg-white divide-y divide-zinc-200">{pastClasses.map(aula => (<tr key={aula.id}><td className="px-4 py-3 text-sm text-zinc-600">{new Date(aula.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td><td className="px-4 py-3 text-sm font-medium text-zinc-800">{aula.discipline}</td><td className="px-4 py-3 text-sm text-zinc-600">Prof. {professionals.find(p => p.id === aula.professionalId)?.name || 'N/A'}</td><td className="px-4 py-3 text-right text-sm">{aula.reportRegistered ? (<button onClick={() => setSelectedClassReport(aula)} className="text-secondary hover:text-secondary-dark font-semibold">Ver Relatório</button>) : (<span className="text-zinc-400">Pendente</span>)}</td></tr>))}</tbody>
                        </table>
                        {pastClasses.length === 0 && <p className="p-4 text-center text-zinc-500">Nenhum histórico de aulas encontrado.</p>}
                    </div>
                </section>
            </main>
        </div>
        <ManageStudentModal isOpen={isAccessModalOpen} onClose={() => setIsAccessModalOpen(false)} onInactivate={() => updateStatus('inativo')} student={student} onEdit={() => { setIsAccessModalOpen(false); onEdit(); }} />
        <FinancialModal isOpen={isFinancialModalOpen} onClose={() => setIsFinancialModalOpen(false)} student={student} currentUser={currentUser} />
        <ClassReportModal aula={selectedClassReport} onClose={() => setSelectedClassReport(null)} professionals={professionals} continuityItems={continuityItems}/>
        <style>{`
            @keyframes fade-in-fast { from { opacity: 0; } to { opacity: 1; } } .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
            @keyframes fade-in-down { from { opacity: 0; transform: translateY(-10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } } .animate-fade-in-down { animation: fade-in-down 0.2s ease-out forwards; }
        `}</style>
        </>
    );
}

export default StudentDetail;
