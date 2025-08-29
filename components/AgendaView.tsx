

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Student, Professional, ScheduledClass, DayOfWeek, ClassGroup } from '../types';
// FIX: Remove mock data import and add firebase imports
import { db } from '../firebase';
import { collection, onSnapshot, query, doc, addDoc, updateDoc } from 'firebase/firestore';
import { 
    ArrowLeftIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon, ExclamationTriangleIcon 
} from './Icons';

const timeSlots = Array.from({ length: 13 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`); // 08:00 to 20:00
const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow disabled:bg-zinc-200";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";

// --- Types for Agenda Display ---
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
}
type DisplayClass = DisplayIndividualClass | DisplayGroupClass;


// --- Schedule/Detail Modal ---
const ScheduleClassModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSchedule: (newClass: Omit<ScheduledClass, 'id' | 'report' | 'diagnosticReport'>) => void;
    classToEdit: ScheduledClass | null;
    students: Student[];
    professionals: Professional[];
    allDisciplines: string[];
}> = ({ isOpen, onClose, onSchedule, classToEdit, students, professionals, allDisciplines }) => {
    
    const [date, setDate] = useState(classToEdit?.date || new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(classToEdit?.time || '');
    const [studentId, setStudentId] = useState<string>(classToEdit?.studentId || '');
    const [professionalId, setProfessionalId] = useState<string>(classToEdit?.professionalId || '');
    const [type, setType] = useState<ScheduledClass['type']>(classToEdit?.type || 'Aula Regular');
    
    const isCustomDiscipline = classToEdit && !allDisciplines.includes(classToEdit.discipline);
    const [discipline, setDiscipline] = useState(isCustomDiscipline ? 'Outro' : classToEdit?.discipline || '');
    const [customDiscipline, setCustomDiscipline] = useState(isCustomDiscipline ? classToEdit.discipline : '');
    
    const [content, setContent] = useState(classToEdit?.content || '');
    const [duration, setDuration] = useState(classToEdit?.duration || 90);
    const [creditsPerHour, setCreditsPerHour] = useState(classToEdit ? classToEdit.creditsConsumed / (classToEdit.duration/60) : 1);
    const [awareOfNoCredits, setAwareOfNoCredits] = useState(false);
    
    const [studentSearch, setStudentSearch] = useState('');
    const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
    const studentDropdownRef = useRef<HTMLDivElement>(null);

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

    const { student, professional, creditsNeeded, creditWarning, availabilityWarning } = useMemo(() => {
        const student = studentId ? students.find(s => s.id === studentId) : null;
        const professional = professionalId ? professionals.find(p => p.id === professionalId) : null;
        const creditsNeeded = (duration / 60) * creditsPerHour;
        const creditWarning = student && student.credits < creditsNeeded;

        let availabilityWarning = false;
        if (professional?.availability && date && time) {
            const dayIndex = (new Date(date).getUTCDay() + 6) % 7; // 0=Mon, 1=Tue...
            const dayName = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'][dayIndex] as DayOfWeek;
            const availableSlots = professional.availability[dayName] || [];
            if (!availableSlots.includes(time.substring(0, 5))) { // Compare HH:MM format
                availabilityWarning = true;
            }
        }

        return { student, professional, creditsNeeded, creditWarning, availabilityWarning };
    }, [studentId, professionalId, duration, creditsPerHour, date, time, students, professionals]);
    
    const filteredStudents = useMemo(() => {
        const activeStudents = students.filter(s => s.status === 'matricula');
        if (!studentSearch) {
            return activeStudents;
        }
        return activeStudents.filter(s =>
            s.name.toLowerCase().includes(studentSearch.toLowerCase())
        );
    }, [studentSearch, students]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (creditWarning && !awareOfNoCredits) {
            alert('Por favor, confirme que está ciente da falta de créditos do aluno.');
            return;
        }
        // FIX: Ensure studentId and professionalId are passed as strings, not numbers
        onSchedule({
            date, time, studentId, professionalId,
            type, discipline: finalDiscipline, content, duration, creditsConsumed: creditsNeeded,
            reportRegistered: classToEdit?.reportRegistered || false,
            status: classToEdit?.status || 'scheduled',
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
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
                        <div>
                           <label htmlFor="creditsPerHour" className={labelStyle}>Créditos / Hora</label>
                           <input type="number" id="creditsPerHour" value={creditsPerHour} onChange={e => setCreditsPerHour(parseFloat(e.target.value))} className={inputStyle} />
                        </div>
                    </div>
                    {creditWarning && (
                         <div className="p-3 bg-amber-50 border-l-4 border-amber-400 text-amber-800 space-y-2">
                            <div className="flex items-start gap-2 font-semibold">
                                <ExclamationTriangleIcon className="h-6 w-6 text-amber-500 flex-shrink-0" />
                                <span>Atenção: Aluno sem créditos suficientes! (Saldo: {student?.credits} | Necessário: {creditsNeeded})</span>
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={awareOfNoCredits} onChange={e => setAwareOfNoCredits(e.target.checked)} className="h-4 w-4 text-secondary focus:ring-secondary" />
                                <span>Estou ciente e desejo agendar mesmo assim.</span>
                            </label>
                            <div className={!awareOfNoCredits ? 'hidden' : ''}>
                                <label htmlFor="paymentDate" className={labelStyle}>Data Prevista de Pagamento</label>
                                <input type="date" id="paymentDate" className={inputStyle} />
                            </div>
                        </div>
                    )}
                     {availabilityWarning && (
                        <div className="p-3 bg-red-50 border-l-4 border-red-400 text-red-800 flex items-center gap-2 font-semibold">
                            <ExclamationTriangleIcon className="h-5 w-5"/>
                            <span>Horário indisponível para este professor.</span>
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    // FIX: Add states for firestore data
    const [students, setStudents] = useState<Student[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
    const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
    const [classToEdit, setClassToEdit] = useState<ScheduledClass | null>(null);

    // FIX: Fetch data from firestore
    useEffect(() => {
        const unsubStudents = onSnapshot(query(collection(db, "students")), snap => setStudents(snap.docs.map(d => ({id: d.id, ...d.data()})) as Student[]));
        const unsubProfessionals = onSnapshot(query(collection(db, "professionals")), snap => setProfessionals(snap.docs.map(d => ({id: d.id, ...d.data()})) as Professional[]));
        const unsubClasses = onSnapshot(query(collection(db, "scheduledClasses")), snap => setScheduledClasses(snap.docs.map(d => ({id: d.id, ...d.data()})) as ScheduledClass[]));
        const unsubGroups = onSnapshot(query(collection(db, "classGroups")), snap => setClassGroups(snap.docs.map(d => ({id: d.id, ...d.data()})) as ClassGroup[]));
        return () => { unsubStudents(); unsubProfessionals(); unsubClasses(); unsubGroups(); };
    }, []);

    const allDisciplines = useMemo(() => Array.from(new Set(professionals.flatMap(p => p.disciplines))).sort(), [professionals]);

    const handleDateChange = (amount: number) => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + amount);
        setCurrentDate(newDate);
    };

    const handleScheduleClass = async (newClassData: Omit<ScheduledClass, 'id'>) => {
        if (classToEdit) {
            const classRef = doc(db, 'scheduledClasses', classToEdit.id);
            await updateDoc(classRef, newClassData);
        } else {
            await addDoc(collection(db, 'scheduledClasses'), newClassData);
        }
    };
    
    const openScheduleModal = (classData: ScheduledClass | null = null) => {
        setClassToEdit(classData);
        setIsModalOpen(true);
    };
    
    const allDisplayClasses = useMemo((): DisplayClass[] => {
        const individualClasses: DisplayIndividualClass[] = scheduledClasses.map(c => ({
            ...c,
            classType: 'individual'
        }));
        
        const groupClassInstances: DisplayGroupClass[] = [];
        
        classGroups.forEach(group => {
            if (group.status !== 'active') return;

            if (group.schedule.type === 'recurring' && group.schedule.days) {
                // To display recurring classes, we'll check a window around the current date
                // A more performant approach would be to calculate only the visible month
                const startDate = new Date(currentDate);
                startDate.setMonth(currentDate.getMonth() - 1); // check 1 month before
                const endDate = new Date(currentDate);
                endDate.setMonth(currentDate.getMonth() + 1); // and 1 month after
                
                let tempDate = new Date(startDate);
                while(tempDate <= endDate) {
                    const dayOfWeek = tempDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as DayOfWeek;
                    const time = group.schedule.days[dayOfWeek];

                    if (time) {
                        const dateStr = tempDate.toISOString().split('T')[0];
                        groupClassInstances.push({
                            id: `group-${group.id}-${dateStr}`,
                            classType: 'group',
                            group,
                            date: dateStr,
                            time: time,
                            professionalId: group.professionalId
                        });
                    }
                    tempDate.setDate(tempDate.getDate() + 1);
                }
            } else if (group.schedule.type === 'single' && group.schedule.date && group.schedule.time) {
                 groupClassInstances.push({
                    id: `group-${group.id}-${group.schedule.date}`,
                    classType: 'group',
                    group,
                    date: group.schedule.date,
                    time: group.schedule.time,
                    professionalId: group.professionalId
                });
            }
        });

        return [...individualClasses, ...groupClassInstances];
    }, [scheduledClasses, classGroups, currentDate]);

    const dailyClasses = useMemo(() => {
        const dateStr = currentDate.toISOString().split('T')[0];
        return allDisplayClasses.filter(c => c.date === dateStr);
    }, [currentDate, allDisplayClasses]);

    const monthlyClasses = useMemo(() => {
        return allDisplayClasses
            .filter(c => {
                const classDate = new Date(c.date);
                return classDate.getMonth() === currentDate.getMonth() && classDate.getFullYear() === currentDate.getFullYear();
            })
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [currentDate, allDisplayClasses]);
    
    const professorsWithDailyClasses = useMemo(() => {
        const professionalIdsWithClasses = new Set(dailyClasses.map(c => c.professionalId));
        return professionals.filter(p => p.status === 'ativo' && professionalIdsWithClasses.has(p.id));
    }, [dailyClasses, professionals]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view space-y-6">
            <header className="flex items-center justify-between flex-wrap gap-2">
                 <div className="flex items-center gap-4">
                     <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 transition-colors"><ArrowLeftIcon className="h-6 w-6" /></button>
                    <h2 className="text-2xl font-bold text-zinc-800">Agenda</h2>
                </div>
                <button onClick={() => openScheduleModal()} className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary-dark text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105">
                    <PlusIcon />
                    <span>Agendar Aula</span>
                </button>
            </header>
            
            <main className="flex-grow overflow-y-auto space-y-8 pr-2">
                {/* Daily View */}
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
                    <div className="border rounded-lg overflow-x-auto">
                        {professorsWithDailyClasses.length > 0 ? (
                            <table className="min-w-full">
                                <thead className="bg-zinc-50">
                                    <tr>
                                        <th className="p-2 border-b text-xs font-semibold text-zinc-500 text-left sticky left-0 bg-zinc-50 w-32">Professor</th>
                                        {timeSlots.map(time => <th key={time} className="p-2 border-b text-xs font-semibold text-zinc-500 text-center w-24">{time}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {professorsWithDailyClasses.map(prof => (
                                        <tr key={prof.id}>
                                            <td className="p-2 border-b text-sm font-medium text-zinc-800 text-left sticky left-0 bg-white">{prof.name}</td>
                                            {timeSlots.map(time => {
                                                const cls = dailyClasses.find(c => c.professionalId === prof.id && c.time === time);
                                                if (!cls) {
                                                    return <td key={time} className="border p-0 align-top"><div className="h-12 w-full">&nbsp;</div></td>;
                                                }

                                                if (cls.classType === 'group') {
                                                    return (
                                                        <td key={time} className="border p-0 align-top">
                                                            <div className="w-full h-full p-2 text-left bg-primary/10 rounded-sm">
                                                                <p className="text-xs font-bold text-primary-dark truncate">{cls.group.name}</p>
                                                                <p className="text-xs text-zinc-600 truncate">{cls.group.studentIds.length} alunos</p>
                                                            </div>
                                                        </td>
                                                    );
                                                }
                                                
                                                const student = students.find(s => s.id === (cls as DisplayIndividualClass).studentId);
                                                return (
                                                    <td key={time} className="border p-0 align-top">
                                                        {student ? (
                                                            <button onClick={() => openScheduleModal(cls as ScheduledClass)} className="w-full h-full p-2 text-left bg-secondary/10 hover:bg-secondary/20 rounded-sm">
                                                                <p className="text-xs font-bold text-secondary-dark truncate">{student.name}</p>
                                                                <p className="text-xs text-zinc-600 truncate">{(cls as DisplayIndividualClass).discipline}</p>
                                                            </button>
                                                        ) : <div className="h-12 w-full">&nbsp;</div>}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-zinc-500">Nenhuma aula agendada para este dia.</p>
                            </div>
                        )}
                    </div>
                </section>
                
                {/* Monthly List */}
                <section>
                     <h3 className="text-xl font-semibold text-zinc-700 mb-4">
                        Aulas Agendadas no Mês 
                        <span className="text-lg font-normal text-zinc-500 ml-2">({monthlyClasses.length} total)</span>
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-zinc-200">
                             <thead className="bg-zinc-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Data</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Tipo</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Detalhe</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Professor</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Status Relatório</th>
                                    <th className="relative px-4 py-2"><span className="sr-only">Ações</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-zinc-200">
                                {monthlyClasses.map(cls => {
                                     const professional = professionals.find(p => p.id === cls.professionalId);
                                     if (cls.classType === 'group') {
                                         return (
                                            <tr key={cls.id}>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-600">{new Date(cls.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} às {cls.time}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm"><span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary-dark">Turma</span></td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-zinc-800">{cls.group.name}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-600">{professional?.name || 'N/A'}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-400">N/A</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right text-sm"></td>
                                            </tr>
                                         )
                                     }

                                     const student = students.find(s => s.id === (cls as DisplayIndividualClass).studentId);
                                     return (
                                        <tr key={cls.id}>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-600">{new Date(cls.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} às {cls.time}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm"><span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-secondary/10 text-secondary-dark">Individual</span></td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-zinc-800">{student?.name || 'N/A'}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-600">{professional?.name || 'N/A'}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${(cls as DisplayIndividualClass).reportRegistered ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                                    {(cls as DisplayIndividualClass).reportRegistered ? 'Registrado' : 'Pendente'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                                                <button onClick={() => openScheduleModal(cls as ScheduledClass)} className="text-secondary hover:text-secondary-dark font-semibold">Ver mais</button>
                                            </td>
                                        </tr>
                                     )
                                })}
                            </tbody>
                        </table>
                        {monthlyClasses.length === 0 && <p className="p-4 text-center text-zinc-500">Nenhuma aula agendada para este mês.</p>}
                    </div>
                </section>
            </main>
            <ScheduleClassModal 
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setClassToEdit(null);
                }}
                onSchedule={handleScheduleClass}
                classToEdit={classToEdit}
                students={students}
                professionals={professionals}
                allDisciplines={allDisciplines}
            />
        </div>
    );
};

export default AgendaView;