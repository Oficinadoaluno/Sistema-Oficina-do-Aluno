import React from 'react';
import { ClassGroup, Student, Professional, DayOfWeek } from '../types';
import InfoItem from './InfoItem';
import { 
    ArrowLeftIcon, PencilIcon, ArchiveBoxXMarkIcon, CheckBadgeIcon
} from './Icons';
import { getShortName } from '../utils/sanitizeFirestore';

const dayMap: Record<DayOfWeek, string> = {
    segunda: 'Segunda-feira', terca: 'Terça-feira', quarta: 'Quarta-feira',
    quinta: 'Quinta-feira', sexta: 'Sexta-feira', sabado: 'Sábado', domingo: 'Domingo'
};

const pastelColorStyles = [
  { name: 'sky', bg: 'bg-sky-50' },
  { name: 'teal', bg: 'bg-teal-50' },
  { name: 'rose', bg: 'bg-rose-50' },
  { name: 'amber', bg: 'bg-amber-50' },
  { name: 'violet', bg: 'bg-violet-50' },
  { name: 'lime', bg: 'bg-lime-50' },
];


// --- Component Props & Helper Components ---
interface ClassGroupDetailProps {
    group: ClassGroup;
    onBack: () => void;
    students: Student[];
    professional?: Professional;
    onEdit: () => void;
    onArchive: (groupId: string) => void;
    onReactivate: (groupId: string) => void;
}

// --- Main Component ---
const ClassGroupDetail: React.FC<ClassGroupDetailProps> = ({ group, onBack, students, professional, onEdit, onArchive, onReactivate }) => {
    const groupStudents = students.filter(s => group.studentIds.includes(s.id));

    const handleArchive = () => {
        if (window.confirm(`Tem certeza que deseja arquivar a turma "${group.name}"?`)) {
            onArchive(group.id);
        }
    };
    
    const handleReactivate = () => {
        if (window.confirm(`Tem certeza que deseja reativar a turma "${group.name}"?`)) {
            onReactivate(group.id);
        }
    };

    const colorStyle = pastelColorStyles.find(c => c.name === group.color) || { bg: 'bg-zinc-50' };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
            {/* Header */}
            <header className="flex items-start justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 transition-colors p-2 rounded-full hover:bg-zinc-100">
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-800">{group.name}</h2>
                        <p className="text-zinc-600" title={professional?.name || 'N/A'}>Prof. {getShortName(professional?.name) || 'N/A'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onEdit} className="flex items-center gap-2 text-sm bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold py-2 px-3 rounded-lg transition-colors">
                        <PencilIcon />
                        <span>Editar</span>
                    </button>
                    {group.status === 'active' ? (
                        <button onClick={handleArchive} className="flex items-center gap-2 text-sm bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-3 rounded-lg transition-colors">
                            <ArchiveBoxXMarkIcon />
                            <span>Dar Baixa</span>
                        </button>
                    ) : (
                         <button onClick={handleReactivate} className="flex items-center gap-2 text-sm bg-secondary hover:bg-secondary-dark text-white font-semibold py-2 px-3 rounded-lg transition-colors">
                            <CheckBadgeIcon />
                            <span>Reativar</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow overflow-y-auto space-y-6 pr-2 -mr-2">
                <div className={`p-4 rounded-lg ${colorStyle.bg}`}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <InfoItem label="Disciplina" value={group.discipline || 'N/A'} />
                        <InfoItem label="Status" value={<span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${group.status === 'active' ? 'bg-secondary/10 text-secondary-dark' : 'bg-zinc-200 text-zinc-700'}`}>{group.status === 'active' ? 'Ativa' : 'Arquivada'}</span>} />
                    </div>
                    {group.description && <InfoItem label="Descrição" value={group.description} className="mt-4" />}
                </div>

                {/* Schedule */}
                <section>
                    <h3 className="text-lg font-semibold text-zinc-700 mb-2">Horários</h3>
                    <div className="p-4 border rounded-lg">
                        {group.schedule.type === 'recurring' && group.schedule.days && Object.keys(group.schedule.days).length > 0 ? (
                            <ul className="space-y-1">
                                {Object.entries(group.schedule.days).map(([day, schedule]) => {
                                    // FIX: Replaced unsafe property access on 'schedule' with a type-safe block
                                    // to correctly handle both legacy string formats and object-based schedules.
                                    const timeDisplay = (() => {
                                        if (typeof schedule === 'string') {
                                            return schedule;
                                        }
                                        if (schedule && typeof schedule === 'object') {
                                            const s = schedule as { start?: string; end?: string };
                                            if (s.start && s.end) {
                                                return `${s.start} - ${s.end}`;
                                            }
                                            return s.start || 'N/A';
                                        }
                                        return 'N/A';
                                    })();

                                    return (
                                        <li key={day} className="flex justify-between">
                                            <span className="font-medium text-zinc-700">{dayMap[day as DayOfWeek]}</span>
                                            <span className="text-zinc-600">{timeDisplay}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : group.schedule.type === 'single' ? (
                            <p className="text-zinc-700">
                                Data única: {new Date(group.schedule.date || '').toLocaleDateString('pt-BR', { timeZone: 'UTC' })} às {group.schedule.time}
                            </p>
                        ) : (
                            <p className="text-zinc-500">Nenhum horário definido.</p>
                        )}
                    </div>
                </section>

                {/* Student List */}
                <section>
                    <h3 className="text-lg font-semibold text-zinc-700 mb-2">Alunos ({groupStudents.length})</h3>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full">
                            <thead className="bg-zinc-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Nome</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Plano de Pagamento</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {groupStudents.map(student => (
                                    <tr key={student.id} className="hover:bg-zinc-50">
                                        <td className="px-4 py-3 font-medium text-zinc-800" title={student.name}>{getShortName(student.name)}</td>
                                        <td className="px-4 py-3">
                                            {student.hasMonthlyPlan ? (
                                                <span className="flex items-center gap-2 text-sm text-cyan-700 font-semibold">
                                                    <CheckBadgeIcon /> Mensalidade
                                                </span>
                                            ) : (
                                                <span className="text-sm text-zinc-600">
                                                    Pagamento Avulso
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

            </main>
        </div>
    );
};

export default ClassGroupDetail;