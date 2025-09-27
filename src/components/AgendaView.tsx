import React, { useState, useMemo, useRef, useEffect, useContext } from 'react';
import { Student, Professional, ScheduledClass, DayOfWeek, ClassGroup, ClassPackage } from '../types';
import { db } from '../firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { 
    ArrowLeftIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon, ExclamationTriangleIcon, UsersIcon, ClockIcon, BuildingOffice2Icon, ComputerDesktopIcon
} from './Icons';
import { ToastContext } from '../App';
import { sanitizeFirestore } from '../utils/sanitizeFirestore';

// --- Constants & Types ---
const inputStyle = "w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow disabled:bg-zinc-200";
const labelStyle = "block text-xs font-medium text-zinc-600 mb-1";

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
    onSchedule: (newClass: Omit<ScheduledClass, 'id' | 'report'>, classToEdit: ScheduledClass | null) => Promise<void>;
    classToEdit: ScheduledClass | null;
    initialContext: { date: string, time: string, professionalId: string } | null;
    students: Student[];
    professionals: Professional[];
    allDisciplines: string[];
    allPackages: (ClassPackage & { usedHours: number })[];
}> = ({ isOpen, onClose, onSchedule, classToEdit, initialContext, students, professionals, allDisciplines, allPackages }) => {
    
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [studentId, setStudentId] = useState<string>('');
    const [professionalId, setProfessionalId] = useState<string>('');
    const [type, setType] = useState<ScheduledClass['type']>('Aula Regular');
    const [discipline, setDiscipline] = useState('');
    const [customDiscipline, setCustomDiscipline] = useState('');
    const [content, setContent] = useState('');
    const [duration, setDuration] = useState(60);
    const [location, setLocation] = useState<'online' | 'presencial'>('presencial');
    const [status, setStatus] = useState<ScheduledClass['status']>('scheduled');
    const [statusChangeReason, setStatusChangeReason] = useState('');
    const [packageId, setPackageId] = useState<string | undefined>(undefined);
    
    const [studentSearch, setStudentSearch] = useState('');
    const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
    const studentDropdownRef = useRef<HTMLDivElement>(null);

    const timeOptions = useMemo(() => {
        return Array.from({ length: (21 - 8) * 2 }, (_, i) => {
            const hour = Math.floor(i / 2) + 8;
            const minute = (i % 2) * 30;
            return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        });
    }, []);

     useEffect(() => {
        if (!isOpen) return;

        const resetForm = (defaults: Partial<ScheduledClass & { professionalId: string }> = {}) => {
            setDate(defaults.date || initialContext?.date || new Date().toISOString().split('T')[0]);
            setTime(defaults.time || initialContext?.time || '');
            setStudentId(defaults.studentId || '');
            setProfessionalId(defaults.professionalId || initialContext?.professionalId || '');
            setType(defaults.type || 'Aula Regular');
            const isCustom = defaults.discipline && !allDisciplines.includes(defaults.discipline);
            setDiscipline(isCustom ? 'Outro' : defaults.discipline || '');
            setCustomDiscipline(isCustom ? defaults.discipline || '' : '');
            setContent(defaults.content || '');
            setDuration(defaults.duration || 60);
            setLocation(defaults.location || 'presencial');
            setStatus(defaults.status || 'scheduled');
            setStatusChangeReason(defaults.statusChangeReason || '');
            setPackageId(defaults.packageId);
            setStudentSearch('');
        };

        if (classToEdit) {
            resetForm(classToEdit);
        } else {
            resetForm();
        }
    }, [classToEdit, initialContext, isOpen, allDisciplines]);


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
        let warning = false;
        if (professional?.availability && date && time) {
            const dayIndex = new Date(date).getUTCDay();
            const dayName = (['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as DayOfWeek[])[dayIndex];
            const availableSlots = professional.availability[dayName] || [];
            if (!availableSlots.includes(time.substring(0, 5))) {
                warning = true;
            }
        }
        return { availabilityWarning: warning };
    }, [professionalId, date, time, professionals]);
    
    const filteredStudents = useMemo(() => {
        const activeStudents = students.filter(s => s.status === 'matricula');
        if (!studentSearch) return activeStudents;
        return activeStudents.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()));
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
        }, classToEdit);
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
                                id="student-search" type="text" className={inputStyle}
                                value={studentId ? students.find(s => s.id === studentId)?.name || '' : studentSearch}
                                onChange={(e) => { setStudentSearch(e.target.value); setStudentId(''); setIsStudentDropdownOpen(true); }}
                                onFocus={() => setIsStudentDropdownOpen(true)} placeholder="Pesquisar aluno..." autoComplete="off" required
                            />
                            {isStudentDropdownOpen && (
                                <ul className="absolute z-20 w-full bg-white border border-zinc-300 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                                    {filteredStudents.length > 0 ? filteredStudents.map(s => (
                                        <li key={s.id} className="px-3 py-2 cursor-pointer hover:bg-zinc-100"
                                            onMouseDown={(e) => { e.preventDefault(); setStudentId(s.id); setStudentSearch(''); setIsStudentDropdownOpen(false); }}>
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
                            <select id="time" value={time} onChange={e => setTime(e.target.value)} className={inputStyle} required>
                                <option value="" disabled>Selecione...</option>
                                {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                           <label htmlFor="discipline" className={labelStyle}>Disciplina</label>
                            <select id="discipline" value={discipline} onChange={e => { setDiscipline(e.target.value); if(e.target.value !== 'Outro') setCustomDiscipline(''); }} className={inputStyle} required>
                                <option value="" disabled>Selecione...</option>
                                {allDisciplines.map(d => <option key={d} value={d}>{d}</option>)}
                                <option value="Outro">Outro</option>
                            </select>
                        </div>
                        {discipline === 'Outro' ? (
                             <div>
                                <label htmlFor="custom-discipline" className={labelStyle}>Qual disciplina?</label>
                                <input type="text" id="custom-discipline" value={customDiscipline} onChange={e => setCustomDiscipline(e.target.value)} className={inputStyle} placeholder="Digite a disciplina" required/>
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
                           <input type="number" id="duration" value={duration} onChange={e => setDuration(parseInt(e.target.value))} className={inputStyle} step="30" />
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelStyle}>Local da Aula</label>
                            <div className="flex items-center gap-4 bg-zinc-100 p-2 rounded-lg">
                                <button type="button" onClick={() => setLocation('presencial')} className={`flex-1 flex items-center justify-center gap-2 py-1 rounded-md text-sm font-semibold ${location === 'presencial' ? 'bg-white shadow' : 'hover:bg-white/50'}`}><BuildingOffice2Icon className="h-5 w-5" /> Presencial</button>
                                <button type="button" onClick={() => setLocation('online')} className={`flex-1 flex items-center justify-center gap-2 py-1 rounded-md text-sm font-semibold ${location === 'online' ? 'bg-white shadow' : 'hover:bg-white/50'}`}><ComputerDesktopIcon className="h-5 w-5" /> Online</button>
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
                                     return <option key={pkg.id} value={pkg.id}>Pacote de {pkg.totalHours} horas ({remaining.toFixed(1)} restantes)</option>;
                                 })}
                             </select>
                        </div>
                    )}
                     {availabilityWarning && (
                        <div className="p-3 bg-amber-50 border-l-4 border-amber-400 text-amber-800 flex items-center gap-2 font-semibold text-sm">
                            <ExclamationTriangleIcon className="h-5 w-5"/>
                            <span>Atenção: Horário fora da disponibilidade padrão deste professor.</span>
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
interface AgendaViewProps { onBack: () => void; }

const AgendaView: React.FC<AgendaViewProps> = ({ onBack }) => {
    const { showToast } = useContext(ToastContext);

    // Data State
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<Student[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
    const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
    const [allPackages, setAllPackages] = useState<ClassPackage[]>([]);
    
    // UI State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [classToEdit, setClassToEdit] = useState<ScheduledClass | null>(null);
    const [modalInitialContext, setModalInitialContext] = useState<{ date: string, time: string, professionalId: string } | null>(null);

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
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [showToast]);

    const TIME_SLOTS = useMemo(() => Array.from({ length: (21 - 8) * 2 }, (_, i) => {
        const hour = Math.floor(i / 2) + 8;
        const minute = (i % 2) * 30;
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }), []);
    
    const allDisciplines = useMemo(() => Array.from(new Set(professionals.flatMap(p => p.disciplines))).sort(), [professionals]);
    const activeProfessionals = useMemo(() => professionals.filter(p => p.status === 'ativo').sort((a,b) => a.name.localeCompare(b.name)), [professionals]);

    const gridData = useMemo(() => {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = (['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as DayOfWeek[])[currentDate.getUTCDay()];

        const dailyIndividualClasses = scheduledClasses.filter(c => c.date === dateStr);
        const dailyGroupClasses: DisplayGroupClass[] = [];

        classGroups.forEach(group => {
            if (group.status !== 'active') return;
            if (group.schedule.type === 'recurring' && group.schedule.days) {
                const timeInfo = (group.schedule.days as any)[dayOfWeek];
                if (timeInfo && timeInfo.start && timeInfo.end) {
                    const duration = timeToMinutes(timeInfo.end) - timeToMinutes(timeInfo.start);
                    if(duration > 0) dailyGroupClasses.push({ id: `group-${group.id}-${dateStr}`, classType: 'group', group, date: dateStr, time: timeInfo.start, professionalId: group.professionalId, duration });
                }
            } else if (group.schedule.type === 'single' && group.schedule.date === dateStr && group.schedule.time) {
                dailyGroupClasses.push({ id: `group-${group.id}-${dateStr}`, classType: 'group', group, date: dateStr, time: group.schedule.time, professionalId: group.professionalId, duration: 90 });
            }
        });
        
        const grid: Record<string, Record<string, { status: 'available' | 'unavailable' | 'scheduled' | 'blocked', classInfo?: DisplayClass | DisplayIndividualClass, span?: number }>> = {};

        activeProfessionals.forEach(prof => {
            grid[prof.id] = {};
            const profAvailability = prof.availability?.[dayOfWeek] || [];
            TIME_SLOTS.forEach(time => {
                grid[prof.id][time] = { status: profAvailability.some(slot => slot.startsWith(time.substring(0,2))) ? 'available' : 'unavailable' };
            });
        });

        [...dailyIndividualClasses, ...dailyGroupClasses].forEach(cls => {
            if (!grid[cls.professionalId]) return;
            
            const startMinutes = timeToMinutes(cls.time);
            const startSlotIndex = TIME_SLOTS.findIndex(slot => timeToMinutes(slot) >= startMinutes);
            if (startSlotIndex === -1) return;

            const startSlotTime = TIME_SLOTS[startSlotIndex];
            const span = Math.ceil(cls.duration / 30);
            
            grid[cls.professionalId][startSlotTime] = { status: 'scheduled', classInfo: cls.classType === 'individual' ? { ...cls, classType: 'individual' } : cls, span };
            for (let i = 1; i < span; i++) {
                const nextSlotIndex = startSlotIndex + i;
                if (nextSlotIndex < TIME_SLOTS.length) {
                    grid[cls.professionalId][TIME_SLOTS[nextSlotIndex]] = { status: 'blocked' };
                }
            }
        });

        return grid;
    }, [currentDate, scheduledClasses, classGroups, activeProfessionals, TIME_SLOTS]);

    const packagesWithUsage = useMemo(() => {
        return allPackages.map(pkg => {
            const usedHours = scheduledClasses.filter(c => c.packageId === pkg.id).reduce((sum, currentClass) => sum + (currentClass.duration / 60), 0);
            return { ...pkg, usedHours };
        });
    }, [allPackages, scheduledClasses]);

    const handleOpenModalForNew = (profId: string, time: string) => {
        setClassToEdit(null);
        setModalInitialContext({ date: currentDate.toISOString().split('T')[0], time, professionalId: profId });
        setIsModalOpen(true);
    };

    const handleOpenModalForEdit = (cls: ScheduledClass) => {
        setModalInitialContext(null);
        setClassToEdit(cls);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setClassToEdit(null);
        setModalInitialContext(null);
    };

    const handleScheduleClass = async (newClassData: Omit<ScheduledClass, 'id'>, classToEdit: ScheduledClass | null) => {
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

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view space-y-4">
            <header className="flex items-center justify-between flex-wrap gap-2">
                 <div className="flex items-center gap-4">
                     <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 transition-colors"><ArrowLeftIcon className="h-6 w-6" /></button>
                    <h2 className="text-2xl font-bold text-zinc-800">Agenda</h2>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentDate(d => {const n = new Date(d); n.setDate(d.getDate() - 1); return n;})} className="p-2 rounded-full hover:bg-zinc-100"><ChevronLeftIcon /></button>
                        <span className="font-semibold text-lg text-zinc-800 w-48 text-center">{currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
                        <button onClick={() => setCurrentDate(d => {const n = new Date(d); n.setDate(d.getDate() + 1); return n;})} className="p-2 rounded-full hover:bg-zinc-100"><ChevronRightIcon /></button>
                    </div>
                    <button onClick={() => setCurrentDate(new Date())} className="text-sm font-semibold text-secondary hover:underline">Hoje</button>
                </div>
                <button onClick={() => { setClassToEdit(null); setModalInitialContext(null); setIsModalOpen(true); }} className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary-dark text-white font-semibold py-2 px-4 rounded-lg"><PlusIcon /><span>Agendar Aula</span></button>
            </header>
            
            <main className="flex-grow overflow-auto border rounded-lg">
                <table className="min-w-full border-separate" style={{ borderSpacing: 0 }}>
                    <thead className="sticky top-0 bg-white z-10">
                        <tr>
                            <th className="sticky left-0 bg-white p-2 border-b border-r text-xs font-semibold text-zinc-500 w-40">Professor</th>
                            {TIME_SLOTS.map(time => <th key={time} className="p-2 border-b text-xs font-semibold text-zinc-500 w-20">{time.endsWith(':00') ? time : ''}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {activeProfessionals.map(prof => {
                            const cellsToRender = [];
                            for (let i = 0; i < TIME_SLOTS.length; i++) {
                                const time = TIME_SLOTS[i];
                                const cellData = gridData[prof.id]?.[time];

                                if (!cellData || cellData.status === 'blocked') continue;
                                
                                const cellKey = `${prof.id}-${time}`;

                                if (cellData.status === 'scheduled') {
                                    const { classInfo, span } = cellData;
                                    const student = classInfo?.classType === 'individual' ? students.find(s => s.id === (classInfo as ScheduledClass).studentId) : null;
                                    const statusStyle = classInfo?.classType === 'individual' && (classInfo as ScheduledClass).status !== 'scheduled' ? 'opacity-60' : '';
                                    
                                    cellsToRender.push(
                                        <td key={cellKey} colSpan={span} className="p-0 align-top relative border-l" style={{ minWidth: `${(span || 1) * 5}rem`}}>
                                            <button 
                                                onClick={() => classInfo?.classType === 'individual' && handleOpenModalForEdit(classInfo as ScheduledClass)}
                                                disabled={classInfo?.classType !== 'individual'}
                                                className={`absolute inset-0.5 rounded-md overflow-hidden text-left p-1 text-xs ${statusStyle} ${classInfo?.classType === 'group' ? 'bg-primary/20 border-l-4 border-primary' : 'bg-secondary/20 border-l-4 border-secondary'}`}
                                            >
                                                <p className="font-bold truncate">{classInfo?.classType === 'group' ? (classInfo as DisplayGroupClass).group.name : student?.name}</p>
                                                <p className="truncate">{classInfo?.classType === 'group' ? (classInfo as DisplayGroupClass).group.discipline : (classInfo as ScheduledClass).discipline}</p>
                                            </button>
                                        </td>
                                    );
                                    i += (span || 1) - 1;
                                } else {
                                    cellsToRender.push(
                                        <td key={cellKey} className={`border-l ${cellData.status === 'available' ? 'bg-green-50 hover:bg-green-100 cursor-pointer' : 'bg-zinc-50'}`}
                                            onClick={() => cellData.status === 'available' && handleOpenModalForNew(prof.id, time)}
                                        ></td>
                                    );
                                }
                            }
                            return <tr key={prof.id}><th className="sticky left-0 bg-white p-2 border-r border-t text-sm font-medium text-zinc-800 text-left align-top">{prof.name}</th>{cellsToRender}</tr>;
                        })}
                    </tbody>
                </table>
            </main>
            <ScheduleClassModal 
                isOpen={isModalOpen} onClose={handleCloseModal} onSchedule={handleScheduleClass}
                classToEdit={classToEdit} initialContext={modalInitialContext}
                students={students} professionals={professionals} allDisciplines={allDisciplines}
                allPackages={packagesWithUsage}
            />
        </div>
    );
};

export default AgendaView;
