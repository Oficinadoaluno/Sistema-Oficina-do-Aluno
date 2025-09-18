import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ClassGroup, Student, Professional, DayOfWeek } from '../types';
import { XMarkIcon, ExclamationTriangleIcon, CheckIcon } from './Icons';

// --- Component Props & Style Constants ---
interface AddClassGroupFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (groupData: Omit<ClassGroup, 'id' | 'status'>) => void;
    groupToEdit: ClassGroup | null;
    students: Student[];
    professionals: Professional[];
}

const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";
const dayOptions: { key: DayOfWeek; label: string }[] = [
    { key: 'segunda', label: 'Seg' }, { key: 'terca', label: 'Ter' }, { key: 'quarta', label: 'Qua' },
    { key: 'quinta', label: 'Qui' }, { key: 'sexta', label: 'Sex' }, { key: 'sabado', label: 'Sáb' }
];

const pastelColors = [
  { name: 'sky', bg: 'bg-sky-200' },
  { name: 'teal', bg: 'bg-teal-200' },
  { name: 'rose', bg: 'bg-rose-200' },
  { name: 'amber', bg: 'bg-amber-200' },
  { name: 'violet', bg: 'bg-violet-200' },
  { name: 'lime', bg: 'bg-lime-200' },
];

// --- Main Form Component ---
const AddClassGroupForm: React.FC<AddClassGroupFormProps> = ({ isOpen, onClose, onSave, groupToEdit, students, professionals }) => {
    const isEditing = !!groupToEdit;

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [professionalId, setProfessionalId] = useState('');
    const [discipline, setDiscipline] = useState('');
    const [scheduleType, setScheduleType] = useState<'recurring' | 'single'>('recurring');
    const [recurringDays, setRecurringDays] = useState<{ [key in DayOfWeek]?: string }>({});
    const [singleDate, setSingleDate] = useState('');
    const [singleTime, setSingleTime] = useState('');
    const [color, setColor] = useState(pastelColors[0].name);
    
    // UI State for Student Selector
    const [studentSearch, setStudentSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (groupToEdit) {
            setName(groupToEdit.name);
            setDescription(groupToEdit.description);
            setSelectedStudentIds(groupToEdit.studentIds);
            setProfessionalId(groupToEdit.professionalId);
            setDiscipline(groupToEdit.discipline || '');
            setScheduleType(groupToEdit.schedule.type);
            setColor(groupToEdit.color || pastelColors[0].name);
            if (groupToEdit.schedule.type === 'recurring') {
                setRecurringDays(groupToEdit.schedule.days || {});
            } else {
                setSingleDate(groupToEdit.schedule.date || '');
                setSingleTime(groupToEdit.schedule.time || '');
            }
        } else {
            // Reset form for new entry
            setName('');
            setDescription('');
            setSelectedStudentIds([]);
            setProfessionalId('');
            setDiscipline('');
            setScheduleType('recurring');
            setRecurringDays({});
            setSingleDate('');
            setSingleTime('');
            setColor(pastelColors[0].name);
        }
    }, [groupToEdit, isOpen]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const availableStudents = useMemo(() => {
        return students
            .filter(s => s.status === 'matricula' && !selectedStudentIds.includes(s.id))
            .filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()));
    }, [students, selectedStudentIds, studentSearch]);

    const handleSelectStudent = (studentId: string) => {
        setSelectedStudentIds(prev => [...prev, studentId]);
        setStudentSearch('');
        setIsDropdownOpen(false);
    };
    
    const handleRemoveStudent = (studentId: string) => {
        setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
    };
    
    const handleRecurringDayToggle = (day: DayOfWeek, time: string) => {
        setRecurringDays(prev => {
            const newDays = { ...prev };
            if (!time) {
                delete newDays[day];
            } else {
                newDays[day] = time;
            }
            return newDays;
        });
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedStudentIds.length < 2) {
            alert('Uma turma precisa de no mínimo 2 alunos.');
            return;
        }
        
        const schedule = scheduleType === 'recurring' 
            ? { type: 'recurring' as const, days: recurringDays }
            : { type: 'single' as const, date: singleDate, time: singleTime };
            
        onSave({ name, description, studentIds: selectedStudentIds, professionalId: professionalId, schedule, discipline, color });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4 md:p-8" onClick={onClose}>
            <form className="bg-white rounded-xl shadow-xl w-full h-full flex flex-col" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-zinc-800">{isEditing ? 'Editar Turma' : 'Criar Nova Turma'}</h2>
                    <button type="button" onClick={onClose} className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100"><XMarkIcon /></button>
                </header>

                <main className="flex-grow overflow-y-auto p-6 space-y-6">
                    {/* Basic Info */}
                    <fieldset>
                         <legend className="text-lg font-semibold text-zinc-700 mb-2">Informações Básicas</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="groupName" className={labelStyle}>Nome da Turma <span className="text-red-500">*</span></label>
                                <input id="groupName" type="text" value={name} onChange={e => setName(e.target.value)} className={inputStyle} required />
                            </div>
                            <div>
                                <label htmlFor="professional" className={labelStyle}>Professor <span className="text-red-500">*</span></label>
                                <select id="professional" value={professionalId} onChange={e => setProfessionalId(e.target.value)} className={inputStyle} required>
                                    <option value="" disabled>Selecione...</option>
                                    {professionals.filter(p => p.status === 'ativo').map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="groupDescription" className={labelStyle}>Descrição</label>
                                <textarea id="groupDescription" value={description} onChange={e => setDescription(e.target.value)} className={inputStyle} rows={2} />
                            </div>
                        </div>
                    </fieldset>
                    
                    {/* Students */}
                    <fieldset>
                        <legend className="text-lg font-semibold text-zinc-700 mb-2">Alunos ({selectedStudentIds.length})</legend>
                        <div className="relative" ref={dropdownRef}>
                            <input
                                type="text"
                                value={studentSearch}
                                onChange={e => setStudentSearch(e.target.value)}
                                onFocus={() => setIsDropdownOpen(true)}
                                className={inputStyle}
                                placeholder="Buscar aluno para adicionar..."
                            />
                            {isDropdownOpen && (
                                <ul className="absolute z-10 w-full bg-white border border-zinc-300 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                                    {availableStudents.map(student => (
                                        <li key={student.id} onMouseDown={() => handleSelectStudent(student.id)} className="px-4 py-2 hover:bg-zinc-100 cursor-pointer">
                                            {student.name}
                                        </li>
                                    ))}
                                    {availableStudents.length === 0 && <li className="px-3 py-2 text-zinc-500">Nenhum aluno disponível</li>}
                                </ul>
                            )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 min-h-[40px] bg-zinc-50 p-2 rounded-lg">
                            {students.filter(s => selectedStudentIds.includes(s.id)).map(student => (
                                <span key={student.id} className="flex items-center gap-2 bg-secondary/10 text-secondary-dark text-sm font-semibold px-2 py-1 rounded-full">
                                    {student.name}
                                    <button type="button" onClick={() => handleRemoveStudent(student.id)} className="text-secondary-dark hover:text-red-600">
                                        <XMarkIcon className="h-4 w-4" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        {selectedStudentIds.length < 2 && <p className="text-sm text-amber-600 mt-2 flex items-center gap-2"><ExclamationTriangleIcon className="h-5 w-5" /> Mínimo de 2 alunos para formar uma turma.</p>}
                    </fieldset>
                    
                     {/* Details */}
                    <fieldset>
                        <legend className="text-lg font-semibold text-zinc-700 mb-2">Detalhes da Turma</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="discipline" className={labelStyle}>Disciplina</label>
                                <input id="discipline" type="text" value={discipline} onChange={e => setDiscipline(e.target.value)} className={inputStyle} />
                            </div>
                             <div>
                                <label className={labelStyle}>Cor de Identificação</label>
                                <div className="flex items-center gap-2 p-2 bg-zinc-50 rounded-lg">
                                {pastelColors.map(c => (
                                    <button key={c.name} type="button" onClick={() => setColor(c.name)} className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center`}>
                                        {color === c.name && <CheckIcon className="h-5 w-5 text-zinc-700" />}
                                    </button>
                                ))}
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    {/* Schedule */}
                    <fieldset>
                        <legend className="text-lg font-semibold text-zinc-700 mb-2">Horários</legend>
                        <div className="flex items-center gap-4 p-1 bg-zinc-100 rounded-lg mb-4">
                            <button type="button" onClick={() => setScheduleType('recurring')} className={`flex-1 py-1 rounded-md text-sm font-semibold ${scheduleType === 'recurring' ? 'bg-white shadow' : 'hover:bg-zinc-200'}`}>Recorrente</button>
                            <button type="button" onClick={() => setScheduleType('single')} className={`flex-1 py-1 rounded-md text-sm font-semibold ${scheduleType === 'single' ? 'bg-white shadow' : 'hover:bg-zinc-200'}`}>Data Única</button>
                        </div>
                        
                        {scheduleType === 'recurring' ? (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                {dayOptions.map(day => (
                                    <div key={day.key} className="flex items-center gap-2">
                                        <label htmlFor={`time-${day.key}`} className="w-20 font-medium text-zinc-600">{day.label}</label>
                                        <input
                                            id={`time-${day.key}`}
                                            type="time"
                                            value={recurringDays[day.key] || ''}
                                            onChange={e => handleRecurringDayToggle(day.key, e.target.value)}
                                            className={inputStyle}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="singleDate" className={labelStyle}>Data</label>
                                    <input id="singleDate" type="date" value={singleDate} onChange={e => setSingleDate(e.target.value)} className={inputStyle} />
                                </div>
                                <div>
                                    <label htmlFor="singleTime" className={labelStyle}>Horário</label>
                                    <input id="singleTime" type="time" value={singleTime} onChange={e => setSingleTime(e.target.value)} className={inputStyle} />
                                </div>
                            </div>
                        )}
                    </fieldset>
                </main>

                <footer className="flex justify-end items-center gap-4 p-4 border-t">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200 transition-colors">Cancelar</button>
                    <button type="submit" className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark transition-colors transform hover:scale-105">
                        {isEditing ? 'Salvar Alterações' : 'Salvar Turma'}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default AddClassGroupForm;