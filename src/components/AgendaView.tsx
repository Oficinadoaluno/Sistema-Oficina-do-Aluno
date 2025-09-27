import React, { useState, useMemo, useRef, useEffect, useContext } from 'react';
import { Student, Professional, ScheduledClass, DayOfWeek, ClassGroup, ClassPackage } from '../types';
import { db } from '../firebase';
import { 
    ArrowLeftIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon, ExclamationTriangleIcon, UsersIcon, ClockIcon, BuildingOffice2Icon, ComputerDesktopIcon
} from './Icons';
import { ToastContext } from '../App';
import { sanitizeFirestore } from '../utils/sanitizeFirestore';

// --- Constants & Types ---
const inputStyle = "w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow disabled:bg-zinc-200";
const labelStyle = "block text-xs font-medium text-zinc-600 mb-1";
const HOUR_HEIGHT_PX = 80; // The height of one hour in the timeline grid

const timeToMinutes = (time: string): number => {
    if (!time || !time.includes(':')) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours * 60 + minutes;
};

interface DisplayIndividualClass extends ScheduledClass {
    classType: 'individual';
}
interface DisplayGroupClass {
    id: string; 
    classType: 'group';
    group: ClassGroup;
    date: string;
    time: string;
    professionalId: string;
    duration: number; // in minutes
}
type DisplayClass = DisplayIndividualClass | DisplayGroupClass;


// --- Schedule/Detail Modal ---
const ScheduleClassModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSchedule: (newClass: Omit<ScheduledClass, 'id' | 'report'>) => Promise<void>;
    classToEdit: ScheduledClass | null;
    students: Student[];
    professionals: Professional[];
    allDisciplines: string[];
    allPackages: (ClassPackage & { usedHours: number })[];
}> = ({ isOpen, onClose, onSchedule, classToEdit, students, professionals, allDisciplines, allPackages }) => {
    
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
            setCustomDiscipline(isCustom ? classToEdit.discipline : '');
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

    const finalDiscipline = discipline === 'Outro' ? customDiscipline : discipline;

    const { student, professional, availabilityWarning } = useMemo(() => {
        const student = studentId ? students.find(s => s.id === studentId) : null;
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

        return { student, professional, availabilityWarning };
    }, [studentId, professionalId, date, time, students, professionals]);
    
    const filteredStudents = useMemo(() => {
        const activeStudents = students.filter(s => s.status === 'matricula');
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast">
            <form className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-zinc-800">{classToEdit ? 'Editar Aula' : 'Agendar Nova Aula'}</h2>
                    <button type="button" onClick={onClose} className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100"><XMarkIcon /></button>
                </header>
                <main className="flex-grow overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative" ref={studentDropdownRef}>
                            <label htmlFor="student-search" className={labelStyle}>Aluno</label>
                            <input
                                id="student-search"
                                type="text"
                                className={inputStyle}
                                value={studentId ? students.find(s => s.id === studentId)?.name || '' : studentSearch}
                                onChange={(e) => {
                                    setStudentSearch(e.target.value);
                                    setStudentId('');
                                    setIsStudentDropdownOpen(true);
                                }}
                                onFocus={() => setIsStudentDropdownOpen(true)}
                                placeholder="Pesquisar aluno..."
                                autoComplete="off"
                                required
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
                            <input type="time" id="time" value={time} onChange={e => setTime(e.target.value)} className={inputStyle} required />
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
                           <input type="number" id="duration" value={duration} onChange={e => setDuration(parseInt(e.target.value))} className={inputStyle} />
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
                        <div className="p-3 bg-red-50 border-l-4 border-red-400 text-red-800 flex items-center gap-2 font-semibold">
                            <ExclamationTriangleIcon className="h-5 w-5"/>
                            <span>Horário indisponível para este professor.</span>
                        </div>
                     )}
                     {classToEdit && (
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
                <footer className="flex justify-end items-center gap-4 p-4 border-t">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200 transition-colors">Cancelar</button>
                    <button type="submit" className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark transition-colors transform hover:scale-105">{classToEdit ? 'Salvar Alterações' : 'Agendar Aula'}</button>
                </footer>
            </form>
        </div>
    );
};

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
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [classToEdit, setClassToEdit] = useState<ScheduledClass | null>(null);
    const [filterType, setFilterType] = useState('');
    const [filterDetail, setFilterDetail] = useState('');
    const [filterProfessional, setFilterProfessional] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [classesSnap, studentsSnap, profsSnap, groupsSnap, pkgSnap] = await Promise.all([
                    db.collection("scheduledClasses").orderBy("date", "asc").get(),
                    db.collection("students").get(),
                    db.collection("professionals").get(),
                    db.collection("classGroups").get(),
                    db.collection("classPackages").where("status", "==", "active").get()
                ]);

                setScheduledClasses(classesSnap.docs.map(d => ({id: d.id, ...d.data()})) as ScheduledClass[]);
                setStudents(studentsSnap.docs.map(d => ({id: d.id, ...d.data()})) as Student[]);
                setProfessionals(profsSnap.docs.map(d => ({id: d.id, ...d.data()})) as Professional[]);
                setClassGroups(groupsSnap.docs.map(d => ({id: d.id, ...d.data()})) as ClassGroup[]);
                setAllPackages(pkgSnap.docs.map(d => ({id: d.id, ...d.data()})) as ClassPackage[]);

            } catch (err: any) {
                console.error(`Firestore Error (AgendaView):`, err);
                let message = `Ocorreu um erro ao carregar os dados da agenda.`;
                if (err.code === 'permission-denied') {
                    message = `Você não tem permissão para acessar os dados da agenda. Verifique as regras do Firestore.`;
                } else if (err.code === 'failed-precondition') {
                    message = `Erro de configuração do banco de dados para a agenda (índice ausente). Consulte o administrador.`;
                } else if (err.code === 'unavailable') {
                    message = `Erro de conexão. Não foi possível carregar os dados da agenda. Verifique sua internet.`;
                }
                showToast(message, "error");
                setError(message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [showToast]);

    const allDisciplines = useMemo(() => Array.from(new Set(professionals.flatMap(p => p.disciplines))).sort(), [professionals]);
    
    const allDisplayClasses = useMemo((): DisplayClass[] => {
        const individualClasses: DisplayIndividualClass[] = scheduledClasses.map(c => ({ ...c, classType: 'individual' }));
        const groupClassInstances: DisplayGroupClass[] = [];
        
        classGroups.forEach(group => {
            if (group.status !== 'active') return;

            const today = new Date();
            const startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
            const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0);
            
            if (group.schedule.type === 'recurring' && group.schedule.days) {
                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    const dayOfWeek = (['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as DayOfWeek[])[d.getUTCDay()];
                    const timeInfo = (group.schedule.days as any)[dayOfWeek];
                    
                    if (timeInfo && typeof timeInfo === 'object' && timeInfo.start && timeInfo.end) {
                         const duration = timeToMinutes(timeInfo.end) - timeToMinutes(timeInfo.start);
                        if (duration > 0) {
                            const dateStr = d.toISOString().split('T')[0];
                            groupClassInstances.push({ id: `group-${group.id}-${dateStr}`, classType: 'group', group, date: dateStr, time: timeInfo.start, professionalId: group.professionalId, duration });
                        }
                    }
                }
            } else if (group.schedule.type === 'single' && group.schedule.date && group.schedule.time) {
                 groupClassInstances.push({ id: `group-${group.id}-${group.schedule.date}`, classType: 'group', group, date: group.schedule.date, time: group.schedule.time, professionalId: group.professionalId, duration: 90 });
            }
        });

        return [...individualClasses, ...groupClassInstances];
    }, [scheduledClasses, classGroups]);

    const dailyClasses = useMemo(() => {
        const dateStr = currentDate.toISOString().split('T')[0];
        return allDisplayClasses.filter(c => c.date === dateStr);
    }, [currentDate, allDisplayClasses]);

    const { viewStartHour, viewEndHour, dailyGridTimeSlots } = useMemo(() => {
        let minHour = 8;
        let maxHour = 21;

        if (dailyClasses.length > 0) {
            const times = dailyClasses.flatMap(c => {
                const start = timeToMinutes(c.time);
                const end = start + c.duration;
                return [start, end];
            });
            minHour = Math.floor(Math.min(...times) / 60);
            maxHour = Math.ceil(Math.max(...times) / 60);
        }

        const finalStartHour = Math.min(8, minHour);
        const finalEndHour = Math.max(21, maxHour);
        const slots = Array.from({ length: finalEndHour - finalStartHour }, (_, i) => `${(i + finalStartHour).toString().padStart(2, '0')}:00`);
        
        return { viewStartHour: finalStartHour, viewEndHour: finalEndHour, dailyGridTimeSlots: slots };
    }, [dailyClasses]);
    
    const allMonthlyClasses = useMemo(() => {
        const individualClasses = allDisplayClasses.filter(c => c.classType === 'individual');
        return individualClasses
            .filter(c => {
                const classDate = new Date(c.date);
                return classDate.getUTCMonth() === currentDate.getUTCMonth() && classDate.getUTCFullYear() === currentDate.getUTCFullYear();
            })
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [currentDate, allDisplayClasses]);
    
    const filteredMonthlyClasses = useMemo(() => {
        return allMonthlyClasses.filter(cls => {
            const individualClass = cls as DisplayIndividualClass;
            if (filterProfessional && individualClass.professionalId !== filterProfessional) return false;
            if (filterDetail) {
                const studentName = students.find(s => s.id === individualClass.studentId)?.name || '';
                if (!studentName.toLowerCase().includes(filterDetail.toLowerCase())) return false;
            }
            if (filterType) {
                if (filterType === 'group') return false; 
                if (filterType === 'individual') { /* This is always true */ }
                if (filterType === 'online' && individualClass.location !== 'online') return false;
                if (filterType === 'presencial' && individualClass.location !== 'presencial') return false;
            }
            if (filterStatus && individualClass.status !== filterStatus) return false;
            return true;
        });
    }, [allMonthlyClasses, filterType, filterDetail, filterProfessional, filterStatus, students]);

    const professorsToShow = useMemo(() => {
        const dayOfWeek = (['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as DayOfWeek[])[currentDate.getUTCDay()];
        const profsWithClasses = new Set(dailyClasses.map(c => c.professionalId));
        const profsWithAvailability = professionals
            .filter(p => p.status === 'ativo' && p.availability && p.availability[dayOfWeek] && p.availability[dayOfWeek]!.length > 0)
            .map(p => p.id);
        const allRelevantProfIds = new Set([...profsWithClasses, ...profsWithAvailability]);
        return professionals
            .filter(p => allRelevantProfIds.has(p.id))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [dailyClasses, professionals, currentDate]);

    const packagesWithUsage = useMemo(() => {
        return allPackages.map(pkg => {
            const usedHours = scheduledClasses.filter(c => c.packageId === pkg.id).reduce((sum, currentClass) => sum + (currentClass.duration / 60), 0);
            return { ...pkg, usedHours };
        });
    }, [allPackages, scheduledClasses]);

    const handleDateChange = (amount: number) => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + amount);
        setCurrentDate(newDate);
    };

    const handleScheduleClass = async (newClassData: Omit<ScheduledClass, 'id'>) => {
        try {
            const dataToSave = { ...newClassData, paymentStatus: newClassData.packageId ? 'package' : 'pending' };
            if (classToEdit) {
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
        }
    };
    
    const openScheduleModal = (classData: ScheduledClass | null = null) => {
        setClassToEdit(classData);
        setIsModalOpen(true);
    };

    const getStatusBadge = (cls: ScheduledClass) => {
        const statusText = { scheduled: 'Agendada', completed: 'Concluída', canceled: 'Cancelada', rescheduled: 'Remarcada' };
        const statusColors = { scheduled: 'bg-blue-100 text-blue-800', completed: 'bg-green-100 text-green-800', canceled: 'bg-red-100 text-red-800', rescheduled: 'bg-zinc-200 text-zinc-700' };
        if (cls.status === 'scheduled' && !cls.reportRegistered && new Date(`${cls.date}T${cls.time}`) < new Date()) {
            return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">Pendente Relatório</span>;
        }
        return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusColors[cls.status]}`}>{statusText[cls.status]}</span>
    };

    if (loading) return <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col items-center justify-center animate-fade-in-view"><p className="text-zinc-500 font-semibold">Carregando dados da agenda...</p></div>;
    
    if (error) return <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col items-center justify-center animate-fade-in-view"><ExclamationTriangleIcon className="h-12 w-12 text-red-400 mb-4" /><h3 className="text-xl font-bold text-red-600">Erro ao Carregar a Agenda</h3><p className="text-zinc-600 mt-2 max-w-md text-center">{error}</p><button onClick={onBack} className="mt-6 py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Voltar ao Painel</button></div>;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view space-y-6">
            <header className="flex items-center justify-between flex-wrap gap-2">
                 <div className="flex items-center gap-4">
                     <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 transition-colors"><ArrowLeftIcon className="h-6 w-6" /></button>
                    <h2 className="text-2xl font-bold text-zinc-800">Agenda</h2>
                </div>
                <button onClick={() => openScheduleModal()} className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary-dark text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"><PlusIcon /><span>Agendar Aula</span></button>
            </header>
            
            <main className="flex-grow overflow-y-auto space-y-8 pr-2">
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-zinc-700">Agenda do Dia</h3>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleDateChange(-1)} className="p-2 rounded-full hover:bg-zinc-100"><ChevronLeftIcon /></button>
                            <button onClick={() => setCurrentDate(new Date())} className="text-sm font-semibold text-secondary hover:underline">Hoje</button>
                            <span className="font-semibold text-lg text-zinc-800">{currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</span>
                            <button onClick={() => handleDateChange(1)} className="p-2 rounded-full hover:bg-zinc-100"><ChevronRightIcon /></button>
                        </div>
                    </div>
                    <div className="border rounded-lg overflow-x-auto bg-white">
                        <div className="min-w-[1200px] grid" style={{ gridTemplateColumns: '150px 1fr' }}>
                            <div className="sticky top-0 left-0 bg-white z-20 border-r border-b p-2 font-semibold text-zinc-600 text-sm">Professor</div>
                            <div className="sticky top-0 bg-white z-10 border-b grid" style={{ gridTemplateColumns: `repeat(${dailyGridTimeSlots.length}, 1fr)` }}>
                                {dailyGridTimeSlots.map(time => <div key={time} className="text-center p-2 text-xs font-semibold text-zinc-500 border-l">{time}</div>)}
                            </div>

                            {professorsToShow.map(prof => {
                                const profDailyClasses = dailyClasses.filter(c => c.professionalId === prof.id);
                                const dayOfWeek = (['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as DayOfWeek[])[currentDate.getUTCDay()];
                                const availableSlots = prof.availability?.[dayOfWeek] || [];
                                const timelineHeight = (viewEndHour - viewStartHour) * HOUR_HEIGHT_PX;

                                return (
                                    <React.Fragment key={prof.id}>
                                        <div className="border-r border-t p-2 text-sm font-medium text-zinc-800 sticky left-0 bg-white/70 backdrop-blur-sm flex items-center">{prof.name}</div>
                                        <div className="border-t relative" style={{ height: `${timelineHeight}px` }}>
                                            {/* Background Grid & Availability */}
                                            {dailyGridTimeSlots.map((time, index) => (
                                                <div key={`grid-${time}`} className={`absolute w-full ${availableSlots.includes(time) ? 'bg-green-50' : ''}`} style={{ top: `${index * HOUR_HEIGHT_PX}px`, height: `${HOUR_HEIGHT_PX}px`, borderBottom: '1px dashed #e5e7eb', borderLeft: '1px solid #e5e7eb' }}></div>
                                            ))}
                                            {/* Class Blocks */}
                                            {profDailyClasses.map(cls => {
                                                const startMinutes = timeToMinutes(cls.time);
                                                const durationMinutes = cls.duration;
                                                const endMinutes = startMinutes + durationMinutes;
                                                if (endMinutes < viewStartHour * 60 || startMinutes >= viewEndHour * 60) return null;

                                                const topPx = ((startMinutes - (viewStartHour * 60)) / 60) * HOUR_HEIGHT_PX;
                                                const heightPx = (durationMinutes / 60) * HOUR_HEIGHT_PX;
                                                const style = { top: `${topPx}px`, height: `${Math.max(heightPx - 2, 1)}px`, left: '1px', right: '1px', zIndex: 10 };

                                                if (cls.classType === 'individual') {
                                                    const student = students.find(s => s.id === cls.studentId);
                                                    const statusStyle = { canceled: 'bg-red-100 border-red-500 text-red-700 line-through', rescheduled: 'bg-zinc-100 border-zinc-500 text-zinc-500 italic', scheduled: 'bg-secondary/20 border-secondary text-secondary-dark', completed: 'bg-secondary/20 border-secondary text-secondary-dark' }[cls.status];
                                                    return (
                                                        <button key={cls.id} onClick={() => openScheduleModal(cls)} style={style} className={`absolute p-1 rounded-md overflow-hidden text-left border-l-4 transition-shadow hover:shadow-lg hover:z-20 ${statusStyle}`}>
                                                            <p className="font-bold text-xs truncate">{student?.name}</p>
                                                            <p className="text-[10px] truncate">{cls.discipline}</p>
                                                            <p className="text-[10px] text-zinc-500">{cls.time}</p>
                                                        </button>
                                                    );
                                                } else {
                                                    return (
                                                        <div key={cls.id} style={style} className="absolute p-1 rounded-md overflow-hidden text-left bg-primary/20 border-l-4 border-primary">
                                                             <p className="font-bold text-xs text-primary-dark truncate">{cls.group.name}</p>
                                                             <p className="text-[10px] truncate flex items-center gap-1"><UsersIcon className="h-3 w-3" /> {cls.group.studentIds.length} alunos</p>
                                                             <p className="text-[10px] text-zinc-500">{cls.time}</p>
                                                        </div>
                                                    );
                                                }
                                            })}
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                        {professorsToShow.length === 0 && <div className="text-center py-12 border-t"><p className="text-zinc-500">Nenhuma aula ou disponibilidade de professor para este dia.</p></div>}
                    </div>
                </section>
                
                <section>
                    <h3 className="text-xl font-semibold text-zinc-700 mb-4">Aulas Agendadas no Mês ({filteredMonthlyClasses.length} total)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-zinc-50 rounded-lg">
                        <div>
                            <label className={labelStyle}>Tipo</label>
                            <select value={filterType} onChange={e => setFilterType(e.target.value)} className={inputStyle}>
                                <option value="">Todos</option>
                                <option value="individual">Individual</option>
                                <option value="online">Online</option>
                                <option value="presencial">Presencial</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelStyle}>Detalhe (Aluno)</label>
                            <input type="text" value={filterDetail} onChange={e => setFilterDetail(e.target.value)} placeholder="Buscar..." className={inputStyle} />
                        </div>
                        <div>
                            <label className={labelStyle}>Professor</label>
                            <select value={filterProfessional} onChange={e => setFilterProfessional(e.target.value)} className={inputStyle}>
                                <option value="">Todos</option>
                                {professionals.filter(p => p.status === 'ativo').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelStyle}>Status</label>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={inputStyle}>
                                <option value="">Todos</option>
                                <option value="scheduled">Agendada</option>
                                <option value="completed">Concluída</option>
                                <option value="canceled">Cancelada</option>
                                <option value="rescheduled">Remarcada</option>
                            </select>
                        </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        {filteredMonthlyClasses.length > 0 ? (
                            <table className="min-w-full divide-y divide-zinc-200">
                                <thead className="bg-zinc-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Data</th><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Tipo</th><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Aluno</th><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Professor</th><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Status</th><th className="relative px-4 py-2"><span className="sr-only">Ações</span></th></tr></thead>
                                <tbody className="bg-white divide-y divide-zinc-200">
                                    {filteredMonthlyClasses.map(cls => {
                                        const individualClass = cls as DisplayIndividualClass;
                                        const professional = professionals.find(p => p.id === individualClass.professionalId);
                                        const student = students.find(s => s.id === individualClass.studentId);
                                        return (
                                            <tr key={individualClass.id}>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-600">{new Date(individualClass.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} às {individualClass.time}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm"><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${individualClass.location === 'online' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{individualClass.location === 'online' ? 'Online' : 'Presencial'}</span></td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-zinc-800">{student?.name || 'Aluno não encontrado'}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-600">{professional?.name || 'N/A'}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm">{getStatusBadge(individualClass)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right text-sm"><button onClick={() => openScheduleModal(individualClass)} className="text-secondary hover:text-secondary-dark font-semibold">Ver mais</button></td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        ) : (<p className="p-6 text-center text-zinc-500">{allMonthlyClasses.length > 0 ? 'Nenhuma aula encontrada com os filtros aplicados.' : 'Nenhuma aula agendada para este mês.'}</p>)}
                    </div>
                </section>
            </main>
            <ScheduleClassModal 
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setClassToEdit(null); }}
                onSchedule={handleScheduleClass}
                classToEdit={classToEdit}
                students={students}
                professionals={professionals}
                allDisciplines={allDisciplines}
                allPackages={packagesWithUsage}
            />
        </div>
    );
};

export default AgendaView;