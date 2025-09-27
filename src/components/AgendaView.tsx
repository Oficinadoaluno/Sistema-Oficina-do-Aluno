import React, { useState, useMemo, useRef, useEffect, useContext } from 'react';
import { Student, Professional, ScheduledClass, DayOfWeek, ClassGroup, ClassPackage } from '../types';
import { db } from '../firebase';
import { 
    ArrowLeftIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon, ExclamationTriangleIcon, UsersIcon, BuildingOffice2Icon, ComputerDesktopIcon
} from './Icons';
import { ToastContext } from '../App';
import { sanitizeFirestore } from '../utils/sanitizeFirestore';

// --- Constants & Types ---
const inputStyle = "w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow disabled:bg-zinc-200";
const labelStyle = "block text-xs font-medium text-zinc-600 mb-1";
const VIEW_START_HOUR = 8;
const VIEW_END_HOUR = 22;
const SLOT_DURATION_MINUTES = 30;
const CELL_HEIGHT_PX = 30; // Height of one 30-minute slot

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
    classToEdit: Partial<ScheduledClass> | null;
    students: Student[];
    professionals: Professional[];
    allDisciplines: string[];
    allPackages: (ClassPackage & { usedHours: number })[];
}> = ({ isOpen, onClose, onSchedule, classToEdit, students, professionals, allDisciplines, allPackages }) => {
    
    const isEditing = !!classToEdit?.id;

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
    
    const selectedStudentName = useMemo(() => students.find(s => s.id === studentId)?.name || '', [studentId, students]);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast">
            <form className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-zinc-800">{isEditing ? 'Editar Aula' : 'Agendar Nova Aula'}</h2>
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
                                value={studentId ? selectedStudentName : studentSearch}
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
                <footer className="flex justify-end items-center gap-4 p-4 border-t">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200 transition-colors">Cancelar</button>
                    <button type="submit" className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark transition-colors transform hover:scale-105">{isEditing ? 'Salvar Alterações' : 'Agendar Aula'}</button>
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
    const [classToEdit, setClassToEdit] = useState<Partial<ScheduledClass> | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [classesSnap, studentsSnap, profsSnap, groupsSnap, pkgSnap] = await Promise.all([
                    db.collection("scheduledClasses").get(),
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
                showToast("Ocorreu um erro ao carregar os dados da agenda.", "error");
                setError("Ocorreu um erro ao carregar os dados da agenda.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [showToast]);

    const allDisciplines = useMemo(() => Array.from(new Set(professionals.flatMap(p => p.disciplines))).sort(), [professionals]);
    
    const timeSlots = useMemo(() => {
        const slots = [];
        for (let hour = VIEW_START_HOUR; hour < VIEW_END_HOUR; hour++) {
            slots.push(`${String(hour).padStart(2, '0')}:00`);
            slots.push(`${String(hour).padStart(2, '0')}:30`);
        }
        return slots;
    }, []);
    
    const allDisplayClassesForDay = useMemo((): DisplayClass[] => {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const individualClasses: DisplayIndividualClass[] = scheduledClasses
            .filter(c => c.date === dateStr)
            .map(c => ({ ...c, classType: 'individual' }));

        const groupClassInstances: DisplayGroupClass[] = [];
        classGroups.forEach(group => {
            if (group.status !== 'active') return;
            
            if (group.schedule.type === 'recurring' && group.schedule.days) {
                const dayOfWeek = (['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as DayOfWeek[])[currentDate.getUTCDay()];
                const timeInfo = (group.schedule.days as any)[dayOfWeek];
                
                if (timeInfo && typeof timeInfo === 'object' && timeInfo.start && timeInfo.end) {
                     const duration = timeToMinutes(timeInfo.end) - timeToMinutes(timeInfo.start);
                    if (duration > 0) {
                        groupClassInstances.push({ id: `group-${group.id}-${dateStr}`, classType: 'group', group, date: dateStr, time: timeInfo.start, professionalId: group.professionalId, duration });
                    }
                }
            } else if (group.schedule.type === 'single' && group.schedule.date === dateStr && group.schedule.time) {
                 groupClassInstances.push({ id: `group-${group.id}-${dateStr}`, classType: 'group', group, date: dateStr, time: group.schedule.time, professionalId: group.professionalId, duration: 90 });
            }
        });

        return [...individualClasses, ...groupClassInstances];
    }, [currentDate, scheduledClasses, classGroups]);

    const professorsToShow = useMemo(() => {
        const dayOfWeek = (['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as DayOfWeek[])[currentDate.getUTCDay()];
        const profsWithClasses = new Set(allDisplayClassesForDay.map(c => c.professionalId));
        const profsWithAvailability = professionals
            .filter(p => p.status === 'ativo' && p.availability && p.availability[dayOfWeek] && p.availability[dayOfWeek]!.length > 0)
            .map(p => p.id);
        const allRelevantProfIds = new Set([...profsWithClasses, ...profsWithAvailability]);
        return professionals
            .filter(p => allRelevantProfIds.has(p.id))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allDisplayClassesForDay, professionals, currentDate]);

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
            if (classToEdit && classToEdit.id) {
                const classRef = db.collection('scheduledClasses').doc(classToEdit.id);
                await classRef.update(sanitizeFirestore(dataToSave as any));
                showToast('Aula atualizada com sucesso!', 'success');
            } else {
                const docRef = await db.collection('scheduledClasses').add(sanitizeFirestore(dataToSave as any));
                setScheduledClasses(prev => [...prev, { ...dataToSave, id: docRef.id } as ScheduledClass]);
                showToast('Aula agendada com sucesso!', 'success');
            }
        } catch (error: any) {
            console.error("Error scheduling class:", error);
            showToast("Ocorreu um erro ao agendar a aula.", "error");
        } finally {
            setClassToEdit(null);
        }
    };
    
    const handleCellClick = (profId: string, timeSlot: string) => {
        const newClassData: Partial<ScheduledClass> = {
            professionalId: profId,
            date: currentDate.toISOString().split('T')[0],
            time: timeSlot,
            duration: 60,
            status: 'scheduled',
            type: 'Aula Regular',
            location: 'presencial',
        };
        setClassToEdit(newClassData);
        setIsModalOpen(true);
    };

    const handleClassClick = (cls: ScheduledClass) => {
        setClassToEdit(cls);
        setIsModalOpen(true);
    };
    
    const timeToPosition = (time: string) => (timeToMinutes(time) - (VIEW_START_HOUR * 60)) / SLOT_DURATION_MINUTES * CELL_HEIGHT_PX;
    const durationToHeight = (duration: number) => (duration / SLOT_DURATION_MINUTES) * CELL_HEIGHT_PX;

    if (loading) return <div className="bg-white p-6 rounded-xl shadow-sm h-full flex items-center justify-center"><p>Carregando agenda...</p></div>;
    if (error) return <div className="bg-white p-6 rounded-xl shadow-sm h-full flex items-center justify-center text-red-600">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
            <header className="flex items-center justify-between flex-wrap gap-4 mb-4">
                 <div className="flex items-center gap-4">
                     <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 transition-colors"><ArrowLeftIcon className="h-6 w-6" /></button>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-800">Agenda do Dia</h2>
                        <p className="text-zinc-500">{currentDate.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2">
                        <button onClick={() => handleDateChange(-1)} className="p-2 rounded-full hover:bg-zinc-100"><ChevronLeftIcon /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="text-sm font-semibold text-secondary hover:underline">Hoje</button>
                        <button onClick={() => handleDateChange(1)} className="p-2 rounded-full hover:bg-zinc-100"><ChevronRightIcon /></button>
                    </div>
                    <button onClick={() => handleCellClick('', '')} className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary-dark text-white font-semibold py-2 px-4 rounded-lg"><PlusIcon /><span>Agendar Aula</span></button>
                </div>
            </header>
            
            <div className="flex-grow overflow-auto border rounded-lg">
                <div className="grid min-w-[1200px]" style={{ gridTemplateColumns: `60px repeat(${professorsToShow.length}, 1fr)` }}>
                    {/* Header Row */}
                    <div className="sticky top-0 z-20 bg-white/70 backdrop-blur-sm"></div>
                    {professorsToShow.map(prof => (
                        <div key={prof.id} className="sticky top-0 z-20 bg-white/70 backdrop-blur-sm p-2 text-center font-semibold text-zinc-700 border-b border-l">
                            {prof.name}
                        </div>
                    ))}

                    {/* Time Column & Professor Grids */}
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
                        const profClasses = allDisplayClassesForDay.filter(c => c.professionalId === prof.id);

                        return (
                            <div key={prof.id} className="relative border-l" style={{ gridColumn: `${profIndex + 2}`, gridRow: `2 / span ${timeSlots.length + 1}` }}>
                                {timeSlots.map((time, timeIndex) => (
                                    <button key={time} onClick={() => handleCellClick(prof.id, time)} className={`w-full border-t border-dashed border-zinc-200 hover:bg-secondary/10`} style={{ height: `${CELL_HEIGHT_PX}px`, backgroundColor: availableSlots.has(time) ? '#f0fdf4' : '' }} />
                                ))}

                                {profClasses.map(cls => {
                                    if (cls.classType === 'individual') {
                                        const student = students.find(s => s.id === cls.studentId);
                                        const statusStyle = { canceled: 'bg-red-100 border-red-500 text-red-700 line-through', rescheduled: 'bg-zinc-100 border-zinc-500 text-zinc-500 italic', scheduled: 'bg-cyan-100 border-cyan-500 text-cyan-800', completed: 'bg-cyan-100 border-cyan-500 text-cyan-800' }[cls.status];
                                        return (
                                            <button key={cls.id} onClick={() => handleClassClick(cls)} style={{ top: timeToPosition(cls.time), height: durationToHeight(cls.duration) }} className={`absolute w-full p-1 rounded-md overflow-hidden text-left border-l-4 transition-shadow hover:shadow-lg hover:z-20 ${statusStyle}`}>
                                                <p className="font-bold text-xs truncate">{student?.name}</p>
                                                <p className="text-[10px] truncate">{cls.discipline}</p>
                                            </button>
                                        );
                                    } else {
                                        return (
                                            <div key={cls.id} style={{ top: timeToPosition(cls.time), height: durationToHeight(cls.duration) }} className="absolute w-full p-1 rounded-md overflow-hidden text-left bg-primary/20 border-l-4 border-primary">
                                                 <p className="font-bold text-xs text-primary-dark truncate">{cls.group.name}</p>
                                                 <p className="text-[10px] truncate flex items-center gap-1"><UsersIcon className="h-3 w-3" /> {cls.group.studentIds.length} alunos</p>
                                            </div>
                                        );
                                    }
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
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
