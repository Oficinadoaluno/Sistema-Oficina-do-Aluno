import React, { useState, useMemo, useRef, useEffect, useContext } from 'react';
import { Student, Professional, ScheduledClass, DayOfWeek, ClassGroup, ClassPackage } from '../types';
import { db } from '../firebase';
import { 
    ArrowLeftIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon, ExclamationTriangleIcon, UsersIcon, BuildingOffice2Icon, ComputerDesktopIcon, TrashIcon
} from './Icons';
import { ToastContext } from '../App';
import { sanitizeFirestore, getShortName } from '../utils/sanitizeFirestore';
import InfoItem from './InfoItem';

// --- Constants & Types ---
const inputStyle = "w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow disabled:bg-zinc-200";
const labelStyle = "block text-xs font-medium text-zinc-600 mb-1";
const VIEW_START_HOUR = 8;
const VIEW_END_HOUR = 22;
const SLOT_DURATION_MINUTES = 30;
const CELL_HEIGHT_PX = 30; // Height of one 30-minute slot
type ViewMode = 'day' | 'week' | 'month';

const timeToMinutes = (time: string): number => {
    if (!time || !time.includes(':')) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours * 60 + minutes;
};

interface EventLayout {
    top: number;
    height: number;
    left: number;
    width: number;
}

interface DisplayIndividualClass extends ScheduledClass {
    classType: 'individual';
    layout?: EventLayout;
}
interface DisplayGroupClass {
    id: string; 
    classType: 'group';
    group: ClassGroup;
    date: string;
    time: string;
    professionalId: string;
    duration: number; // in minutes
    layout?: EventLayout;
}
type DisplayClass = DisplayIndividualClass | DisplayGroupClass;


// --- Report Modal ---
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


// --- Schedule/Detail Modal ---
const ScheduleClassModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSchedule: (newClass: Omit<ScheduledClass, 'id' | 'report'>) => Promise<void>;
    onDelete: (classId: string, transactionId?: string) => Promise<void>;
    classToEdit: Partial<ScheduledClass> | null;
    students: Student[];
    professionals: Professional[];
    allDisciplines: string[];
    allPackages: (ClassPackage & { usedHours: number })[];
}> = ({ isOpen, onClose, onSchedule, onDelete, classToEdit, students, professionals, allDisciplines, allPackages }) => {
    
    const isEditing = !!classToEdit?.id;

    // All hooks are defined at the top level to respect the Rules of Hooks.
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [studentId, setStudentId] = useState<string>('');
    const [professionalId, setProfessionalId] = useState<string>('');
    const [type, setType] = useState<ScheduledClass['type']>('Aula Regular');
    const [discipline, setDiscipline] = useState('');
    const [customDiscipline, setCustomDiscipline] = useState('');
    const [content, setContent] = useState('');
    const [duration, setDuration] = useState(90);
    const [location, setLocation] = useState<'online' | 'presencial'>('presencial');
    const [status, setStatus] = useState<ScheduledClass['status']>('scheduled');
    const [statusChangeReason, setStatusChangeReason] = useState('');
    const [packageId, setPackageId] = useState<string | undefined>(undefined);
    const [studentSearch, setStudentSearch] = useState('');
    const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
    const [pendingPaymentWarning, setPendingPaymentWarning] = useState(false);
    const studentDropdownRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        if (classToEdit) {
            setDate(classToEdit.date || new Date().toISOString().split('T')[0]);
            setTime(classToEdit.time || '');
            setStudentId(classToEdit.studentId || '');
            setProfessionalId(classToEdit.professionalId || '');
            setType(classToEdit.type || 'Aula Regular');
            const isCustom = classToEdit.discipline && !allDisciplines.includes(classToEdit.discipline);
            setDiscipline(isCustom ? 'Outro' : classToEdit.discipline || '');
            setCustomDiscipline(isCustom ? classToEdit.discipline || '' : '');
            setContent(classToEdit.content || '');
            setDuration(classToEdit.duration || 90);
            setLocation(classToEdit.location || 'presencial');
            setStatus(classToEdit.status || 'scheduled');
            setStatusChangeReason(classToEdit.statusChangeReason || '');
            setPackageId(classToEdit.packageId);
        } else {
            // Reset for new class
            setDate(new Date().toISOString().split('T')[0]);
            setTime(''); setStudentId(''); setProfessionalId(''); setType('Aula Regular');
            setDiscipline(''); setCustomDiscipline(''); setContent(''); setDuration(90);
            setLocation('presencial');
            setStatus('scheduled'); setStatusChangeReason('');
            setPackageId(undefined);
        }
    }, [classToEdit, isOpen, allDisciplines]);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target as Node)) {
                setIsStudentDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!studentId) {
            setPendingPaymentWarning(false);
            return;
        }
        const checkPendingPayments = async () => {
            try {
                const todayStr = new Date().toISOString().split('T')[0];
                const pendingClassesQuery = db.collection('scheduledClasses')
                    .where('studentId', '==', studentId)
                    .where('date', '<', todayStr)
                    .where('paymentStatus', '==', 'pending');

                const pendingTransactionsQuery = db.collection('transactions')
                    .where('studentId', '==', studentId)
                    .where('status', '==', 'pendente');

                const [classesSnap, transactionsSnap] = await Promise.all([
                    pendingClassesQuery.get(),
                    pendingTransactionsQuery.get()
                ]);

                if (!classesSnap.empty || !transactionsSnap.empty) {
                    setPendingPaymentWarning(true);
                } else {
                    setPendingPaymentWarning(false);
                }
            } catch (error) {
                console.error("Error checking pending payments:", error);
            }
        };
        checkPendingPayments();
    }, [studentId]);


    const finalDiscipline = discipline === 'Outro' ? customDiscipline : discipline;

    const { availabilityWarning } = useMemo(() => {
        const professional = professionalId ? professionals.find(p => p.id === professionalId) : null;

        let availabilityWarning = false;
        if (professional?.availability && date && time) {
            const dayIndex = new Date(date).getUTCDay();
            const dayName = (['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as DayOfWeek[])[dayIndex];
            const availableSlots = professional.availability[dayName] || [];
            if (!availableSlots.includes(time.substring(0, 5))) { // Compare HH:MM format
                availabilityWarning = true;
            }
        }

        return { availabilityWarning };
    }, [professionalId, date, time, professionals]);
    
    const filteredStudents = useMemo(() => {
        const activeStudents = students.filter(s => s.status === 'matricula' || s.status === 'prospeccao');
        if (!studentSearch) {
            return activeStudents;
        }
        return activeStudents.filter(s =>
            s.name.toLowerCase().includes(studentSearch.toLowerCase())
        );
    }, [studentSearch, students]);

    const studentActivePackages = useMemo(() => {
        if (!studentId) return [];
        return allPackages.filter(p => p.studentId === studentId && p.status === 'active' && (p.totalHours - p.usedHours) > 0);
    }, [studentId, allPackages]);
    
    const selectedStudentName = useMemo(() => students.find(s => s.id === studentId)?.name || '', [studentId, students]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSchedule({
            date, time, studentId, professionalId,
            type, discipline: finalDiscipline, content, duration,
            location,
            reportRegistered: classToEdit?.reportRegistered || false,
            status,
            statusChangeReason: (status === 'canceled' || status === 'rescheduled') ? statusChangeReason : undefined,
            packageId,
        });
        onClose();
    };
    
    const handleDelete = () => {
        if (classToEdit?.id) {
            onDelete(classToEdit.id, classToEdit.transactionId);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast">
            <form className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-zinc-800">{isEditing ? 'Editar Aula' : 'Agendar Nova Aula'}</h2>
                    <button type="button" onClick={onClose} className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100"><XMarkIcon /></button>
                </header>
                <main className="flex-grow overflow-y-auto p-6 space-y-4">
                    {pendingPaymentWarning && (
                        <div className="p-3 bg-amber-100 border-l-4 border-amber-500 text-amber-800 flex items-center gap-2 font-semibold text-sm rounded-r-md">
                            <ExclamationTriangleIcon className="h-5 w-5"/>
                            <span>Atenção: Este aluno possui pendências financeiras.</span>
                        </div>
                     )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative" ref={studentDropdownRef}>
                            <label htmlFor="student-search" className={labelStyle}>Aluno</label>
                            <input
                                id="student-search"
                                type="text"
                                className={inputStyle}
                                value={studentId ? getShortName(selectedStudentName) : studentSearch}
                                onChange={(e) => {
                                    setStudentSearch(e.target.value);
                                    setStudentId('');
                                    setIsStudentDropdownOpen(true);
                                }}
                                onFocus={() => setIsStudentDropdownOpen(true)}
                                placeholder="Pesquisar aluno..."
                                autoComplete="off"
                                required
                                title={selectedStudentName}
                            />
                            {isStudentDropdownOpen && (
                                <ul className="absolute z-20 w-full bg-white border border-zinc-300 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                                    {filteredStudents.length > 0 ? filteredStudents.map(s => (
                                        <li
                                            key={s.id}
                                            className="px-3 py-2 cursor-pointer hover:bg-zinc-100"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setStudentId(s.id.toString());
                                                setStudentSearch('');
                                                setIsStudentDropdownOpen(false);
                                            }}
                                        >
                                            {s.name}
                                        </li>
                                    )) : <li className="px-3 py-2 text-zinc-500">Nenhum aluno encontrado</li>}
                                </ul>
                            )}
                        </div>
                        <div>
                           <label htmlFor="professional" className={labelStyle}>Professor</label>
                            <select id="professional" value={professionalId} onChange={e => setProfessionalId(e.target.value)} className={inputStyle} required>
                                <option value="" disabled>Selecione...</option>
                                {professionals.filter(p => p.status === 'ativo' && (!finalDiscipline || p.disciplines.includes(finalDiscipline))).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="date" className={labelStyle}>Data</label>
                            <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className={inputStyle} required />
                        </div>
                        <div>
                           <label htmlFor="time" className={labelStyle}>Horário</label>
                            <input type="time" id="time" value={time} onChange={e => setTime(e.target.value)} className={inputStyle} step="1800" required />
                        </div>
                        <div>
                           <label htmlFor="discipline" className={labelStyle}>Disciplina</label>
                            <select 
                                id="discipline" 
                                value={discipline} 
                                onChange={e => {
                                    setDiscipline(e.target.value);
                                    if(e.target.value !== 'Outro') {
                                        setCustomDiscipline('');
                                    }
                                }} 
                                className={inputStyle} 
                                required
                            >
                                <option value="" disabled>Selecione...</option>
                                {allDisciplines.map(d => <option key={d} value={d}>{d}</option>)}
                                <option value="Outro">Outro</option>
                            </select>
                        </div>
                        {discipline === 'Outro' ? (
                             <div>
                                <label htmlFor="custom-discipline" className={labelStyle}>Qual disciplina?</label>
                                <input
                                     type="text"
                                     id="custom-discipline"
                                     value={customDiscipline}
                                     onChange={e => setCustomDiscipline(e.target.value)}
                                     className={inputStyle}
                                     placeholder="Digite a disciplina"
                                     required
                                />
                             </div>
                        ) : (
                             <div>
                               <label htmlFor="type" className={labelStyle}>Tipo</label>
                                <select id="type" value={type} onChange={e => setType(e.target.value as any)} className={inputStyle}>
                                    <option>Aula Regular</option>
                                    <option>Avaliação Diagnóstica</option>
                                    <option>Curso</option>
                                    <option>Outro</option>
                                </select>
                            </div>
                        )}
                        <div className="md:col-span-2">
                           <label htmlFor="content" className={labelStyle}>Conteúdo a ser Abordado</label>
                            <textarea id="content" value={content} onChange={e => setContent(e.target.value)} rows={3} className={inputStyle} required />
                        </div>
                        <div>
                           <label htmlFor="duration" className={labelStyle}>Duração (minutos)</label>
                           <input type="number" id="duration" value={duration} onChange={e => setDuration(parseInt(e.target.value))} step="30" className={inputStyle} />
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelStyle}>Local da Aula</label>
                            <div className="flex items-center gap-4 bg-zinc-100 p-2 rounded-lg">
                                <button type="button" onClick={() => setLocation('presencial')} className={`flex-1 flex items-center justify-center gap-2 py-1 rounded-md text-sm font-semibold ${location === 'presencial' ? 'bg-white shadow' : 'hover:bg-white/50'}`}>
                                    <BuildingOffice2Icon className="h-5 w-5" /> Presencial
                                </button>
                                <button type="button" onClick={() => setLocation('online')} className={`flex-1 flex items-center justify-center gap-2 py-1 rounded-md text-sm font-semibold ${location === 'online' ? 'bg-white shadow' : 'hover:bg-white/50'}`}>
                                    <ComputerDesktopIcon className="h-5 w-5" /> Online
                                </button>
                            </div>
                        </div>
                    </div>
                     {studentActivePackages.length > 0 && (
                        <div className="p-3 bg-cyan-50 border-l-4 border-cyan-400 rounded-r-lg">
                             <label htmlFor="package-select" className={labelStyle}>Usar Crédito de Pacote?</label>
                             <select id="package-select" value={packageId || ''} onChange={e => setPackageId(e.target.value || undefined)} className={inputStyle}>
                                 <option value="">Não (aula avulsa)</option>
                                 {studentActivePackages.map(pkg => {
                                     const remaining = pkg.totalHours - pkg.usedHours;
                                     return <option key={pkg.id} value={pkg.id}>
                                         Pacote de {pkg.totalHours} horas ({remaining.toFixed(2)} restantes) - Comprado em {new Date(pkg.purchaseDate).toLocaleDateString('pt-BR', {timeZone:'UTC'})}
                                     </option>;
                                 })}
                             </select>
                        </div>
                    )}
                     {availabilityWarning && (
                        <div className="p-3 bg-amber-50 border-l-4 border-amber-400 text-amber-800 flex items-center gap-2 font-semibold text-sm">
                            <ExclamationTriangleIcon className="h-5 w-5"/>
                            <span>Atenção: Horário fora da disponibilidade padrão do professor.</span>
                        </div>
                     )}
                     {isEditing && (
                        <div className="border-t pt-4">
                            <h3 className="text-lg font-semibold text-zinc-700 mb-2">Gerenciar Status da Aula</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="class-status" className={labelStyle}>Status</label>
                                    <select id="class-status" value={status} onChange={e => setStatus(e.target.value as any)} className={inputStyle}>
                                        <option value="scheduled">Agendada</option>
                                        <option value="canceled">Cancelada</option>
                                        <option value="rescheduled">Remarcada</option>
                                    </select>
                                </div>
                                {(status === 'canceled' || status === 'rescheduled') && (
                                    <div className="md:col-span-2">
                                        <label htmlFor="status-reason" className={labelStyle}>Justificativa <span className="text-red-500">*</span></label>
                                        <textarea id="status-reason" value={statusChangeReason} onChange={e => setStatusChangeReason(e.target.value)} rows={2} className={inputStyle} placeholder="Ex: Aluno solicitou alteração." required />
                                    </div>
                                )}
                            </div>
                        </div>
                     )}
                </main>
                <footer className="flex justify-between items-center gap-4 p-4 border-t">
                    <div>
                        {isEditing && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="flex items-center gap-2 py-2 px-4 bg-red-50 text-red-700 font-semibold rounded-lg hover:bg-red-100 transition-colors"
                            >
                                <TrashIcon />
                                Excluir Aula
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200 transition-colors">Cancelar</button>
                        <button type="submit" className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark transition-colors transform hover:scale-105">{isEditing ? 'Salvar Alterações' : 'Agendar Aula'}</button>
                    </div>
                </footer>
            </form>
        </div>
    );
};

const getWeekDays = (date: Date): Date[] => {
    const startOfWeek = new Date(date);
    startOfWeek.setUTCHours(0, 0, 0, 0);
    const day = startOfWeek.getUTCDay();
    const diff = startOfWeek.getUTCDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday (0) to show monday (1)
    startOfWeek.setUTCDate(diff);

    return Array.from({ length: 7 }, (_, i) => {
        const weekDay = new Date(startOfWeek);
        weekDay.setUTCDate(startOfWeek.getUTCDate() + i);
        return weekDay;
    });
};

const AgendaEvent: React.FC<{
    cls: DisplayClass;
    studentsMap: Map<string, Student>;
    onClick: (cls: ScheduledClass, e: React.MouseEvent) => void;
}> = ({ cls, studentsMap, onClick }) => {
    
    if (cls.classType === 'individual') {
        const student = studentsMap.get(cls.studentId);
        const statusStyle = {
            canceled: 'bg-red-100 border-red-500 text-red-700 line-through',
            rescheduled: 'bg-zinc-100 border-zinc-500 text-zinc-500 italic',
            scheduled: 'bg-cyan-100 border-cyan-500 text-cyan-800',
            completed: 'bg-green-100 border-green-500 text-green-800'
        }[cls.status];

        return (
            <button
                onClick={(e) => onClick(cls, e)}
                style={{
                    top: `${cls.layout?.top}px`,
                    height: `${cls.layout?.height}px`,
                    left: `${cls.layout?.left}%`,
                    width: `${cls.layout?.width}%`,
                }}
                className={`absolute p-1 rounded-md overflow-hidden text-left border-l-4 transition-shadow hover:shadow-lg hover:z-20 ${statusStyle}`}
            >
                <p className="font-bold text-xs truncate" title={student?.name}>{getShortName(student?.name)}</p>
                <p className="text-[10px] truncate">{cls.discipline}</p>
            </button>
        );
    } else { // Group class
        return (
            <div
                 style={{
                    top: `${cls.layout?.top}px`,
                    height: `${cls.layout?.height}px`,
                    left: `${cls.layout?.left}%`,
                    width: `${cls.layout?.width}%`,
                }}
                className="absolute p-1 rounded-md overflow-hidden text-left bg-primary/20 border-l-4 border-primary"
            >
                <p className="font-bold text-xs text-primary-dark truncate">{cls.group.name}</p>
                <p className="text-[10px] truncate flex items-center gap-1"><UsersIcon className="h-3 w-3" /> {cls.group.studentIds.length} alunos</p>
            </div>
        );
    }
};

const calculateLayout = (classes: DisplayClass[]): DisplayClass[] => {
    const sortedClasses = [...classes].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

    const withLayout = sortedClasses.map(cls => {
        const startMinutes = timeToMinutes(cls.time);
        return {
            ...cls,
            start: startMinutes,
            end: startMinutes + cls.duration,
            layout: { top: 0, height: 0, left: 0, width: 100 },
        };
    });

    type LayoutClass = typeof withLayout[number];

    for (let i = 0; i < withLayout.length; i++) {
        const current = withLayout[i];
        current.layout.top = ((current.start - VIEW_START_HOUR * 60) / SLOT_DURATION_MINUTES) * CELL_HEIGHT_PX;
        current.layout.height = (current.duration / SLOT_DURATION_MINUTES) * CELL_HEIGHT_PX - 2; // -2 for small gap
    }

    const collisionGroups: LayoutClass[][] = [];
    withLayout.forEach(cls => {
        let placed = false;
        for (const group of collisionGroups) {
            if (group.some(c => c.end > cls.start && c.start < cls.end)) {
                group.push(cls);
                placed = true;
                break;
            }
        }
        if (!placed) {
            collisionGroups.push([cls]);
        }
    });

    collisionGroups.forEach(group => {
        const columns: LayoutClass[][] = [];
        group.sort((a, b) => a.start - b.start);
        
        group.forEach(cls => {
            let placed = false;
            for (const col of columns) {
                if (!col.some(c => c.end > cls.start && c.start < cls.end)) {
                    col.push(cls);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                columns.push([cls]);
            }
        });

        columns.forEach((col, colIndex) => {
            col.forEach(cls => {
                const classInLayout = withLayout.find(c => c.id === cls.id);
                if (classInLayout) {
                    classInLayout.layout.width = 100 / columns.length;
                    classInLayout.layout.left = colIndex * (100 / columns.length);
                }
            });
        });
    });

    return withLayout;
}

// --- Main View Component ---
interface AgendaViewProps {
    onBack: () => void;
}

const AgendaView: React.FC<AgendaViewProps> = ({ onBack }) => {
    const { showToast } = useContext(ToastContext);

    // Data State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
    const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
    const [allPackages, setAllPackages] = useState<ClassPackage[]>([]);
    
    // UI State
    const [viewMode, setViewMode] = useState<ViewMode>('day');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [classToEdit, setClassToEdit] = useState<Partial<ScheduledClass> | null>(null);
    const [classToShowReport, setClassToShowReport] = useState<ScheduledClass | null>(null);
    const [monthOffset, setMonthOffset] = useState(0);
    const [monthlyStudentFilter, setMonthlyStudentFilter] = useState('');
    const [monthlyProfFilter, setMonthlyProfFilter] = useState('');
    const [monthlyStatusFilter, setMonthlyStatusFilter] = useState('');

    useEffect(() => {
        setLoading(true);
        const createErrorHandler = (context: string) => (error: any) => {
            console.error(`Firestore (${context}) Error:`, error);
            setError(`Erro ao carregar ${context}.`);
            showToast(`Erro ao carregar ${context}.`, "error");
        };

        const unsubClasses = db.collection("scheduledClasses").onSnapshot(
            snap => setScheduledClasses(snap.docs.map(d => ({id: d.id, ...d.data()})) as ScheduledClass[]),
            createErrorHandler("aulas")
        );
        const unsubStudents = db.collection("students").orderBy("name").onSnapshot(
            snap => setStudents(snap.docs.map(d => ({id: d.id, ...d.data()})) as Student[]),
            createErrorHandler("alunos")
        );
        const unsubProfs = db.collection("professionals").onSnapshot(
            snap => setProfessionals(snap.docs.map(d => ({id: d.id, ...d.data()})) as Professional[]),
            createErrorHandler("profissionais")
        );
        const unsubGroups = db.collection("classGroups").onSnapshot(
            snap => setClassGroups(snap.docs.map(d => ({id: d.id, ...d.data()})) as ClassGroup[]),
            createErrorHandler("turmas")
        );
        const unsubPkgs = db.collection("classPackages").where("status", "==", "active").onSnapshot(
            snap => setAllPackages(snap.docs.map(d => ({id: d.id, ...d.data()})) as ClassPackage[]),
            createErrorHandler("pacotes")
        );

        Promise.all([
           db.collection("scheduledClasses").get(),
           db.collection("students").get()
        ]).then(() => setLoading(false)).catch(() => setLoading(false));

        return () => {
            unsubClasses();
            unsubStudents();
            unsubProfs();
            unsubGroups();
            unsubPkgs();
        };
    }, [showToast]);

    const studentsMap = useMemo(() => new Map(students.map(s => [s.id, s])), [students]);
    
    const timeSlots = useMemo(() => {
        const slots = [];
        for (let hour = VIEW_START_HOUR; hour < VIEW_END_HOUR; hour++) {
            slots.push(`${String(hour).padStart(2, '0')}:00`);
            slots.push(`${String(hour).padStart(2, '0')}:30`);
        }
        return slots;
    }, []);

    const allDisciplines = useMemo(() => Array.from(new Set(professionals.flatMap(p => p.disciplines))).sort(), [professionals]);

    const packagesWithUsage = useMemo(() => {
        return allPackages.map(pkg => {
            const usedHours = scheduledClasses.filter(c => c.packageId === pkg.id).reduce((sum, currentClass) => sum + (currentClass.duration / 60), 0);
            return { ...pkg, usedHours };
        });
    }, [allPackages, scheduledClasses]);
    
    const { dailySchedule, professorsToShow } = useMemo(() => {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = (['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as DayOfWeek[])[currentDate.getUTCDay()];
        
        const individualClasses = scheduledClasses.filter(c => c.date === dateStr).map(c => ({ ...c, classType: 'individual' as const }));
        
        const groupClassInstances: DisplayGroupClass[] = classGroups.filter(g => g.status === 'active').flatMap(group => {
            if (group.schedule.type === 'recurring' && group.schedule.days) {
                const timeInfo = (group.schedule.days as any)[dayOfWeek];
                if (timeInfo && timeInfo.start && timeInfo.end) {
                    const duration = timeToMinutes(timeInfo.end) - timeToMinutes(timeInfo.start);
                    if (duration > 0) return [{ id: `group-${group.id}-${dateStr}`, classType: 'group', group, date: dateStr, time: timeInfo.start, professionalId: group.professionalId, duration }];
                }
            } else if (group.schedule.type === 'single' && group.schedule.date === dateStr && group.schedule.time) {
                const duration = group.schedule.endTime ? timeToMinutes(group.schedule.endTime) - timeToMinutes(group.schedule.time) : 90;
                if (duration > 0) {
                    return [{ id: `group-${group.id}-${dateStr}`, classType: 'group', group, date: dateStr, time: group.schedule.time, professionalId: group.professionalId, duration }];
                }
            }
            return [];
        });

        const allDisplayClassesForDay: DisplayClass[] = [...individualClasses, ...groupClassInstances];
        
        const profsWithClasses = new Set(allDisplayClassesForDay.map(c => c.professionalId));
        const profsWithAvailability = new Set(professionals.filter(p => p.status === 'ativo' && p.availability?.[dayOfWeek]?.length).map(p => p.id));
        const allRelevantProfIds = new Set([...profsWithClasses, ...profsWithAvailability]);
        
        const sortedProfessors = professionals.filter(p => allRelevantProfIds.has(p.id)).sort((a, b) => a.name.localeCompare(b.name));

        const schedule: Record<string, DisplayClass[]> = {};
        sortedProfessors.forEach(prof => {
            const profClasses = allDisplayClassesForDay.filter(cls => cls.professionalId === prof.id);
            schedule[prof.id] = calculateLayout(profClasses);
        });
        
        return { professorsToShow: sortedProfessors, dailySchedule: schedule };
    }, [currentDate, professionals, scheduledClasses, classGroups]);

    const { weekDays, weeklySchedule } = useMemo(() => {
        const days = getWeekDays(currentDate);
        const scheduleByDate: Record<string, DisplayClass[]> = {};

        days.forEach(day => {
            const dateStr = day.toISOString().split('T')[0];
            const dayOfWeek = (['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as DayOfWeek[])[day.getUTCDay()];

            const individualClasses = scheduledClasses.filter(c => c.date === dateStr).map(c => ({ ...c, classType: 'individual' as const }));

            const groupClassInstances: DisplayGroupClass[] = classGroups.filter(g => g.status === 'active').flatMap(group => {
                if (group.schedule.type === 'recurring' && group.schedule.days) {
                    const timeInfo = (group.schedule.days as any)[dayOfWeek];
                    if (timeInfo && timeInfo.start && timeInfo.end) {
                        const duration = timeToMinutes(timeInfo.end) - timeToMinutes(timeInfo.start);
                        if(duration > 0) return [{ id: `group-${group.id}-${dateStr}`, classType: 'group', group, date: dateStr, time: timeInfo.start, professionalId: group.professionalId, duration }];
                    }
                } else if (group.schedule.type === 'single' && group.schedule.date === dateStr && group.schedule.time) {
                    const duration = group.schedule.endTime ? timeToMinutes(group.schedule.endTime) - timeToMinutes(group.schedule.time) : 90;
                    if (duration > 0) {
                        return [{ id: `group-${group.id}-${dateStr}`, classType: 'group', group, date: dateStr, time: group.schedule.time, professionalId: group.professionalId, duration }];
                    }
                }
                return [];
            });
            scheduleByDate[dateStr] = calculateLayout([...individualClasses, ...groupClassInstances]);
        });
        
        return { weekDays: days, weeklySchedule: scheduleByDate };
    }, [currentDate, scheduledClasses, classGroups]);
    
    const statusStyles: Record<ScheduledClass['status'], { label: string; bg: string; text: string; }> = {
        scheduled: { label: 'Agendada', bg: 'bg-blue-100', text: 'text-blue-800' },
        completed: { label: 'Concluída', bg: 'bg-green-100', text: 'text-green-800' },
        canceled: { label: 'Cancelada', bg: 'bg-red-100', text: 'text-red-800' },
        rescheduled: { label: 'Remarcada', bg: 'bg-zinc-200', text: 'text-zinc-800' },
    };

    const { monthName, filteredMonthlyClasses } = useMemo(() => {
        const targetDate = new Date();
        targetDate.setUTCHours(0,0,0,0);
        targetDate.setDate(1);
        targetDate.setMonth(targetDate.getMonth() + monthOffset);
        
        const targetMonth = targetDate.getUTCMonth();
        const targetYear = targetDate.getUTCFullYear();
        const monthName = targetDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        
        const classesInMonth = scheduledClasses.filter(c => {
            const classDate = new Date(c.date); // 'YYYY-MM-DD' -> UTC date object
            return classDate.getUTCFullYear() === targetYear && classDate.getUTCMonth() === targetMonth;
        });

        const filtered = classesInMonth.filter(c => {
            const studentMatch = !monthlyStudentFilter || c.studentId === monthlyStudentFilter;
            const profMatch = !monthlyProfFilter || c.professionalId === monthlyProfFilter;
            const statusMatch = !monthlyStatusFilter || c.status === monthlyStatusFilter;
            return studentMatch && profMatch && statusMatch;
        });

        return { monthName, filteredMonthlyClasses: filtered.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()) };
    }, [monthOffset, scheduledClasses, monthlyStudentFilter, monthlyProfFilter, monthlyStatusFilter]);


    const handleDateChange = (amount: number) => {
        const newDate = new Date(currentDate);
        const increment = viewMode === 'day' ? amount : amount * 7;
        newDate.setDate(currentDate.getDate() + increment);
        setCurrentDate(newDate);
    };

    const handleScheduleClass = async (newClassData: Omit<ScheduledClass, 'id'>) => {
        try {
            const dataToSave = { ...newClassData, paymentStatus: newClassData.packageId ? 'package' : 'pending' };
            if (classToEdit && classToEdit.id) {
                const classRef = db.collection('scheduledClasses').doc(classToEdit.id);
                await classRef.update(sanitizeFirestore(dataToSave as any));
                showToast('Aula atualizada com sucesso!', 'success');
            } else {
                await db.collection('scheduledClasses').add(sanitizeFirestore(dataToSave as any));
                showToast('Aula agendada com sucesso!', 'success');
            }
        } catch (error: any) {
            console.error("Error scheduling class:", error);
            showToast("Ocorreu um erro ao agendar a aula.", "error");
        } finally {
            setClassToEdit(null);
        }
    };
    
    const handleDeleteClass = async (classId: string, transactionId?: string) => {
        if (!window.confirm("Tem certeza que deseja excluir esta aula? Esta ação não pode ser desfeita.")) {
            return;
        }
        try {
            const batch = db.batch();
            const classRef = db.collection('scheduledClasses').doc(classId);
            batch.delete(classRef);

            if (transactionId) {
                const txRef = db.collection('transactions').doc(transactionId);
                batch.delete(txRef);
            }
            
            await batch.commit();
            showToast('Aula excluída com sucesso.', 'success');
            setIsModalOpen(false);
            setClassToEdit(null);
        } catch (error) {
            console.error("Error deleting class:", error);
            showToast('Erro ao excluir a aula.', 'error');
        }
    };

    const openScheduleModal = (partialData: Partial<ScheduledClass>) => {
        setClassToEdit(partialData);
        setIsModalOpen(true);
    };

    const handleClassClick = (cls: ScheduledClass, e: React.MouseEvent) => {
        e.stopPropagation(); // Stop the event from reaching the cell behind it
        openScheduleModal(cls);
    };

    const currentTitle = useMemo(() => {
        if (viewMode === 'day') return currentDate.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        if (viewMode === 'week') {
            const start = weekDays[0].toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
            const end = weekDays[6].toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', year: 'numeric' });
            return `${start} - ${end}`;
        }
        return monthName;
    }, [viewMode, currentDate, weekDays, monthName]);

    if (loading) return <div className="bg-white p-6 rounded-xl shadow-sm h-full flex items-center justify-center"><p>Carregando agenda...</p></div>;
    if (error) return <div className="bg-white p-6 rounded-xl shadow-sm h-full flex items-center justify-center text-red-600">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
            <header className="flex items-center justify-between flex-wrap gap-4 mb-4">
                 <div className="flex items-center gap-4">
                     <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 transition-colors"><ArrowLeftIcon className="h-6 w-6" /></button>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-800">Agenda</h2>
                        <p className="text-zinc-500 capitalize">{currentTitle}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-zinc-100 p-1 rounded-lg flex items-center">
                        {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
                            <button key={mode} onClick={() => setViewMode(mode)} className={`px-3 py-1 text-sm font-semibold rounded-md ${viewMode === mode ? 'bg-white shadow text-secondary' : 'text-zinc-600'}`}>
                                {{day: 'Dia', week: 'Semana', month: 'Mês'}[mode]}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        {viewMode === 'month' ? (
                            <>
                                <button onClick={() => setMonthOffset(monthOffset - 1)} className="p-2 rounded-full hover:bg-zinc-100"><ChevronLeftIcon /></button>
                                <button onClick={() => setMonthOffset(0)} className="text-sm font-semibold text-secondary hover:underline">Este Mês</button>
                                <button onClick={() => setMonthOffset(monthOffset + 1)} className="p-2 rounded-full hover:bg-zinc-100"><ChevronRightIcon /></button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => handleDateChange(-1)} className="p-2 rounded-full hover:bg-zinc-100"><ChevronLeftIcon /></button>
                                <button onClick={() => setCurrentDate(new Date())} className="text-sm font-semibold text-secondary hover:underline">Hoje</button>
                                <button onClick={() => handleDateChange(1)} className="p-2 rounded-full hover:bg-zinc-100"><ChevronRightIcon /></button>
                            </>
                        )}
                    </div>
                    <button onClick={() => openScheduleModal({ date: currentDate.toISOString().split('T')[0] })} className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary-dark text-white font-semibold py-2 px-4 rounded-lg"><PlusIcon /><span>Agendar Aula</span></button>
                </div>
            </header>
            
            <main className="flex-grow overflow-y-auto pr-2 -mr-2">
                {viewMode === 'day' && (
                    <section className="overflow-x-auto border rounded-lg">
                        <div className="grid min-w-[1200px]" style={{ gridTemplateColumns: `60px repeat(${professorsToShow.length}, 1fr)` }}>
                            <div className="sticky top-0 z-10 bg-white/70 backdrop-blur-sm"></div>
                            {professorsToShow.map(prof => (
                                <div key={prof.id} className="sticky top-0 z-10 bg-white/70 backdrop-blur-sm p-2 text-center font-semibold text-zinc-700 border-b border-l" title={prof.name}>
                                    {getShortName(prof.name)}
                                </div>
                            ))}
                            <div className="col-start-1 col-end-2 row-start-2 row-end-auto">
                                {timeSlots.map(time => (
                                    <div key={time} style={{ height: `${CELL_HEIGHT_PX}px` }} className="relative text-right pr-2 text-xs text-zinc-400">
                                        <span className="absolute -top-1.5 right-2">{time.endsWith(':00') ? time : ''}</span>
                                    </div>
                                ))}
                            </div>
                            {professorsToShow.map((prof, profIndex) => {
                                const dayOfWeek = (['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as DayOfWeek[])[currentDate.getUTCDay()];
                                const availableSlots = new Set(prof.availability?.[dayOfWeek] || []);
                                return (
                                    <div key={prof.id} className="relative border-l" style={{ gridColumn: `${profIndex + 2}`, gridRow: `2 / span ${timeSlots.length + 1}` }}>
                                        {timeSlots.map((time) => (
                                            <button key={time} onClick={() => openScheduleModal({ professionalId: prof.id, date: currentDate.toISOString().split('T')[0], time: time, duration: 60 })} className={`w-full border-t border-dashed border-zinc-200 hover:bg-secondary/10`} style={{ height: `${CELL_HEIGHT_PX}px`, backgroundColor: availableSlots.has(time) ? '#f0fdf4' : '' }} />
                                        ))}
                                        {(dailySchedule[prof.id] || []).map(cls => (
                                            <AgendaEvent key={cls.id} cls={cls} studentsMap={studentsMap} onClick={handleClassClick} />
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}
                
                {viewMode === 'week' && (
                     <section className="overflow-x-auto border rounded-lg">
                        <div className="grid min-w-[1200px]" style={{ gridTemplateColumns: `60px repeat(7, 1fr)` }}>
                            <div className="sticky top-0 z-10 bg-white/70 backdrop-blur-sm"></div>
                            {weekDays.map(day => (
                                <div key={day.toISOString()} className="sticky top-0 z-10 bg-white/70 backdrop-blur-sm p-2 text-center font-semibold text-zinc-700 border-b border-l">
                                    <span className="text-xs text-zinc-500">{day.toLocaleDateString('pt-BR', { weekday: 'short' })}</span><br/>{day.getUTCDate()}
                                </div>
                            ))}
                             <div className="col-start-1 col-end-2 row-start-2 row-end-auto">
                                {timeSlots.map(time => (
                                    <div key={time} style={{ height: `${CELL_HEIGHT_PX}px` }} className="relative text-right pr-2 text-xs text-zinc-400">
                                        <span className="absolute -top-1.5 right-2">{time.endsWith(':00') ? time : ''}</span>
                                    </div>
                                ))}
                            </div>
                            {weekDays.map((day, dayIndex) => (
                                <div key={day.toISOString()} className="relative border-l" style={{ gridColumn: `${dayIndex + 2}`, gridRow: `2 / span ${timeSlots.length + 1}` }}>
                                    {timeSlots.map((time) => (
                                        <button key={time} onClick={() => openScheduleModal({ date: day.toISOString().split('T')[0], time, duration: 60 })} className={`w-full border-t border-dashed border-zinc-200 hover:bg-secondary/10`} style={{ height: `${CELL_HEIGHT_PX}px` }} />
                                    ))}
                                    {(weeklySchedule[day.toISOString().split('T')[0]] || []).map(cls => (
                                        <AgendaEvent key={cls.id} cls={cls} studentsMap={studentsMap} onClick={handleClassClick} />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                
                {viewMode === 'month' && (
                    <section>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                             <input type="date" value={currentDate.toISOString().split('T')[0]} onChange={e => setCurrentDate(new Date(e.target.value))} className={inputStyle} />
                            <select value={monthlyStudentFilter} onChange={e => setMonthlyStudentFilter(e.target.value)} className={inputStyle}>
                                <option value="">Todos os Alunos</option>
                                {students.filter(s => s.status === 'matricula').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <select value={monthlyProfFilter} onChange={e => setMonthlyProfFilter(e.target.value)} className={inputStyle}>
                                <option value="">Todos os Professores</option>
                                {professionals.filter(p => p.status === 'ativo').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <select value={monthlyStatusFilter} onChange={e => setMonthlyStatusFilter(e.target.value)} className={inputStyle}>
                                <option value="">Todos os Status</option>
                                <option value="scheduled">Agendada</option>
                                <option value="completed">Concluída</option>
                                <option value="canceled">Cancelada</option>
                                <option value="rescheduled">Remarcada</option>
                            </select>
                        </div>
                        <div className="border rounded-lg overflow-hidden hidden md:block">
                            <table className="min-w-full divide-y divide-zinc-200">
                                <thead className="bg-zinc-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Data</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Aluno</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Professor</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Status</th>
                                        <th className="relative px-4 py-2"><span className="sr-only">Ações</span></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-zinc-200">
                                    {filteredMonthlyClasses.map(cls => (
                                        <tr key={cls.id} className={`${cls.status === 'completed' ? 'bg-green-50' : ''} ${cls.status === 'canceled' ? 'bg-red-50 opacity-80' : ''}`}>
                                            <td className="px-4 py-3 text-sm">{new Date(cls.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}<span className="text-zinc-500"> às {cls.time}</span></td>
                                            <td className="px-4 py-3 font-medium" title={studentsMap.get(cls.studentId)?.name}>{getShortName(studentsMap.get(cls.studentId)?.name) || 'Aluno desc.'}</td>
                                            <td className="px-4 py-3 text-sm" title={professionals.find(p => p.id === cls.professionalId)?.name}>{getShortName(professionals.find(p => p.id === cls.professionalId)?.name) || 'Prof. desc.'}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[cls.status].bg} ${statusStyles[cls.status].text}`}>{statusStyles[cls.status].label}</span>
                                                    {(cls.paymentStatus === 'pending' || !cls.paymentStatus) && cls.status !== 'canceled' && (<span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800" title="Pagamento Pendente">Pendente</span>)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm">
                                                {cls.reportRegistered ? (<button onClick={() => setClassToShowReport(cls)} className="font-semibold text-secondary hover:underline">Ver Relatório</button>) : (<button onClick={(e) => handleClassClick(cls, e)} className="font-semibold text-secondary hover:underline">{cls.status === 'completed' ? 'Detalhes' : 'Editar'}</button>)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="space-y-3 md:hidden">
                           {filteredMonthlyClasses.map(cls => {
                               const student = studentsMap.get(cls.studentId);
                               const professional = professionals.find(p => p.id === cls.professionalId);
                               return (
                                   <div key={cls.id} className={`border rounded-lg p-3 space-y-2 ${cls.status === 'completed' ? 'bg-green-50' : 'bg-zinc-50'} ${cls.status === 'canceled' ? 'bg-red-50 opacity-80' : ''}`}>
                                       <div className="flex justify-between items-start">
                                           <div>
                                               <p className="font-bold text-zinc-800" title={student?.name}>{getShortName(student?.name)}</p>
                                               <p className="text-sm text-zinc-600">{cls.discipline}</p>
                                           </div>
                                           <div className="flex flex-col items-end gap-1">
                                               <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusStyles[cls.status].bg} ${statusStyles[cls.status].text}`}>{statusStyles[cls.status].label}</span>
                                               {(cls.paymentStatus === 'pending' || !cls.paymentStatus) && cls.status !== 'canceled' && (<span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full" title="Pagamento Pendente">Pgto. Pendente</span>)}
                                           </div>
                                       </div>
                                       <div className="text-sm text-zinc-500 border-t pt-2"><p title={professional?.name}>Prof: {getShortName(professional?.name)}</p><p>Data: {new Date(cls.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} às {cls.time}</p></div>
                                       <div className="text-right">{cls.reportRegistered ? (<button onClick={() => setClassToShowReport(cls)} className="font-semibold text-secondary hover:underline text-sm">Ver Relatório</button>) : (<button onClick={(e) => handleClassClick(cls, e)} className="font-semibold text-secondary hover:underline text-sm">{cls.status === 'completed' ? 'Detalhes' : 'Editar'}</button>)}</div>
                                   </div>
                               );
                           })}
                        </div>
                        {filteredMonthlyClasses.length === 0 && <p className="p-4 text-center text-zinc-500">Nenhuma aula encontrada para este mês com os filtros aplicados.</p>}
                    </section>
                )}
            </main>
            
            <ScheduleClassModal 
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setClassToEdit(null); }}
                onSchedule={handleScheduleClass}
                onDelete={handleDeleteClass}
                classToEdit={classToEdit}
                students={students}
                professionals={professionals}
                allDisciplines={allDisciplines}
                allPackages={packagesWithUsage}
            />
            <ClassReportModal
                aula={classToShowReport}
                onClose={() => setClassToShowReport(null)}
                professionals={professionals}
            />
        </div>
    );
};

export default AgendaView;