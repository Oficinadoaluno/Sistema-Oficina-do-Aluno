import React, { useState, useEffect, useContext } from 'react';
import { ClassReport, ScheduledClass, Student } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon, CheckCircleIcon, XCircleIcon, ClipboardDocumentCheckIcon } from './Icons';
import { ToastContext } from '../App';

const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";
const textareaStyle = `${inputStyle} min-h-[80px]`;
const moodOptions = ['😞', '😕', '😐', '🙂', '😊'];
const testTypeOptions = ['Bimestral', 'Semanal', 'Trabalho', 'Simulado', 'Outro'];


interface ClassReportFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (context: ScheduledClass, reportData: ClassReport) => void;
    context: {
        class: ScheduledClass;
        student: Student | undefined;
        isFirstReport: boolean;
    } | null;
}

const ClassReportFormModal: React.FC<ClassReportFormModalProps> = ({ isOpen, onClose, onSave, context }) => {
    const { showToast } = useContext(ToastContext) as { showToast: (message: string, type?: 'success' | 'error' | 'info') => void; };

    const [mood, setMood] = useState('😊');
    const [initialObservations, setInitialObservations] = useState('');
    const [contents, setContents] = useState<{ discipline: string; content: string }[]>([{ discipline: '', content: '' }]);
    const [description, setDescription] = useState('');
    const [nextSteps, setNextSteps] = useState<string[]>(['']);
    const [homeworkAssigned, setHomeworkAssigned] = useState(false);
    const [showTestRecord, setShowTestRecord] = useState(false);
    const [testRecord, setTestRecord] = useState<{ type: string; maxScore: number | ''; studentScore: number | '' }>({ type: 'Bimestral', maxScore: '', studentScore: '' });
    
    useEffect(() => {
        if (isOpen && context) {
            const existingReport = context.class.report;
            if (existingReport) {
                setMood(existingReport.mood || '😊');
                setInitialObservations(existingReport.initialObservations || '');
                setContents(existingReport.contents && existingReport.contents.length > 0 ? existingReport.contents : [{ discipline: context.class.discipline, content: '' }]);
                setDescription(existingReport.description || '');
                setNextSteps(existingReport.nextSteps && existingReport.nextSteps.length > 0 ? existingReport.nextSteps : ['']);
                setHomeworkAssigned(existingReport.homeworkAssigned || false);
                if (existingReport.testRecord) {
                    setTestRecord({
                        type: existingReport.testRecord.type,
                        maxScore: existingReport.testRecord.maxScore,
                        studentScore: existingReport.testRecord.studentScore,
                    });
                    setShowTestRecord(true);
                } else {
                    setTestRecord({ type: 'Bimestral', maxScore: '', studentScore: '' });
                    setShowTestRecord(false);
                }
            } else {
                // Reset for new report
                setMood('😊');
                setInitialObservations('');
                setContents([{ discipline: context.class.discipline, content: '' }]);
                setDescription('');
                setNextSteps(['']);
                setHomeworkAssigned(false);
                setTestRecord({ type: 'Bimestral', maxScore: '', studentScore: '' });
                setShowTestRecord(false);
            }
        }
    }, [isOpen, context]);

    if (!isOpen || !context) return null;

    const handleNextStepChange = (index: number, value: string) => {
        const newSteps = [...nextSteps];
        newSteps[index] = value;
        setNextSteps(newSteps);
    };

    const addNextStep = () => setNextSteps([...nextSteps, '']);
    const removeNextStep = (index: number) => {
        if (nextSteps.length > 1) {
            setNextSteps(nextSteps.filter((_, i) => i !== index));
        }
    };
    
    const handleSaveClick = () => {
        if (!mood) {
            showToast('Por favor, selecione o humor do aluno.', 'error');
            return;
        }
        if (context.isFirstReport && !initialObservations.trim()) {
            showToast('O campo "Observações" é obrigatório para o primeiro relatório.', 'error');
            return;
        }
        if (!description.trim()) {
            showToast('O campo "Observações da Aula" é obrigatório.', 'error');
            return;
        }

        const reportData: ClassReport = {
            mood,
            initialObservations: context.isFirstReport ? initialObservations : undefined,
            contents: contents.filter(c => c.content.trim() !== ''),
            description,
            nextSteps: nextSteps.filter(s => s.trim() !== ''),
            homeworkAssigned,
        };

        if (showTestRecord && testRecord.maxScore !== '' && testRecord.studentScore !== '') {
            reportData.testRecord = {
                type: testRecord.type,
                maxScore: Number(testRecord.maxScore),
                studentScore: Number(testRecord.studentScore),
            };
        }

        onSave(context.class, reportData);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl m-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-start p-4 border-b">
                    <div>
                        <h3 className="text-xl font-bold text-zinc-800">Lançar Relatório de Aula</h3>
                        <p className="text-zinc-600 font-semibold">{context.student?.name}</p>
                        <p className="text-sm text-zinc-500">{new Date(context.class.date).toLocaleDateString('pt-BR', {timeZone:'UTC'})} - {context.class.discipline}</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 -mt-1 -mr-1 rounded-full text-zinc-400 hover:bg-zinc-100"><XMarkIcon /></button>
                </header>
                <main className="flex-grow overflow-y-auto p-6 space-y-6">
                    <div>
                        <label className={labelStyle}>Como o aluno estava na aula? <span className="text-red-500">*</span></label>
                        <div className="flex items-center gap-2 bg-zinc-100 p-2 rounded-lg">
                            {moodOptions.map(m => (
                                <button key={m} type="button" onClick={() => setMood(m)} className={`flex-1 text-3xl py-1 rounded-md transition-all ${mood === m ? 'bg-white shadow scale-110' : 'hover:bg-white/50'}`}>{m}</button>
                            ))}
                        </div>
                    </div>

                    {context.isFirstReport && (
                         <div className="animate-fade-in-view">
                            <label htmlFor="initial-obs" className={labelStyle}>Observacoes <span className="text-red-500">*</span></label>
                            <textarea id="initial-obs" value={initialObservations} onChange={e => setInitialObservations(e.target.value)} className={textareaStyle} placeholder="Descreva suas impressões sobre as habilidades, dificuldades e a estratégia utilizada" required />
                         </div>
                    )}
                    
                    <div>
                        <label htmlFor="content" className={labelStyle}>Conteúdo(s) Abordado(s)</label>
                        <div className="p-2 bg-zinc-50 rounded-md">
                             <input value={contents[0]?.content || ''} onChange={e => setContents([{ discipline: context.class.discipline, content: e.target.value }])} className={inputStyle} placeholder="Descreva o que foi trabalhado na aula" />
                        </div>
                    </div>
                    
                     <div>
                        <label htmlFor="description" className={labelStyle}>Observações da Aula <span className="text-red-500">*</span></label>
                        <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} className={textareaStyle} placeholder="Descreva o desenvolvimento do aluno, dificuldades, sucessos e comportamento geral." required />
                    </div>

                    <div>
                        <label className={labelStyle}>Deixou exercício para casa?</label>
                        <div className="flex items-center gap-4 bg-zinc-100 p-2 rounded-lg">
                            <button type="button" onClick={() => setHomeworkAssigned(true)} className={`flex-1 flex items-center justify-center gap-2 py-1 rounded-md text-sm font-semibold ${homeworkAssigned ? 'bg-white shadow' : 'hover:bg-white/50'}`}>
                                <CheckCircleIcon className="h-5 w-5 text-green-500" /> Sim
                            </button>
                            <button type="button" onClick={() => setHomeworkAssigned(false)} className={`flex-1 flex items-center justify-center gap-2 py-1 rounded-md text-sm font-semibold ${!homeworkAssigned ? 'bg-white shadow' : 'hover:bg-white/50'}`}>
                                 <XCircleIcon className="h-5 w-5 text-red-500" /> Não
                            </button>
                        </div>
                    </div>

                    {!showTestRecord ? (
                        <button type="button" onClick={() => setShowTestRecord(true)} className="w-full flex items-center justify-center gap-2 text-sm text-secondary font-semibold hover:underline py-2">
                            <ClipboardDocumentCheckIcon className="h-5 w-5" /> Registrar Nota de Prova
                        </button>
                    ) : (
                        <div className="p-4 bg-zinc-50 rounded-lg space-y-3 animate-fade-in-fast border">
                            <div className="flex justify-between items-center">
                                <h4 className="font-semibold text-zinc-700">Registro de Nota de Prova</h4>
                                <button type="button" onClick={() => setShowTestRecord(false)} className="text-sm text-zinc-500 hover:text-red-600">Remover</button>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label htmlFor="test-type" className={labelStyle}>Tipo</label>
                                    <select id="test-type" value={testRecord.type} onChange={e => setTestRecord(p => ({...p, type: e.target.value}))} className={inputStyle}>
                                        {testTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                 <div>
                                    <label htmlFor="max-score" className={labelStyle}>Nota Máx.</label>
                                    <input id="max-score" type="number" step="0.1" placeholder="10.0" value={testRecord.maxScore} onChange={e => setTestRecord(p => ({...p, maxScore: e.target.value === '' ? '' : parseFloat(e.target.value)}))} className={inputStyle}/>
                                </div>
                                 <div>
                                    <label htmlFor="student-score" className={labelStyle}>Nota Aluno</label>
                                    <input id="student-score" type="number" step="0.1" placeholder="8.5" value={testRecord.studentScore} onChange={e => setTestRecord(p => ({...p, studentScore: e.target.value === '' ? '' : parseFloat(e.target.value)}))} className={inputStyle} />
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <label className={labelStyle}>Próximos Passos / Tópicos a Revisar</label>
                        <div className="space-y-2">
                             {nextSteps.map((step, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input type="text" value={step} onChange={e => handleNextStepChange(index, e.target.value)} className={inputStyle} placeholder="Ex: Revisar equação de 2º grau" />
                                    <button type="button" onClick={() => removeNextStep(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-md flex-shrink-0 disabled:opacity-50" disabled={nextSteps.length <= 1}><TrashIcon /></button>
                                </div>
                             ))}
                            <button type="button" onClick={addNextStep} className="flex items-center gap-2 text-sm text-secondary font-semibold hover:underline"><PlusIcon className="h-4 w-4" /> Adicionar Item</button>
                        </div>
                    </div>
                </main>
                <footer className="flex justify-end items-center gap-4 p-4 border-t">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Cancelar</button>
                    <button type="button" onClick={handleSaveClick} className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark">Salvar Relatório</button>
                </footer>
            </div>
            <style>{`.animate-fade-in-fast { animation: fadeIn 0.2s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } } .animate-fade-in-view { animation: fadeIn 0.4s ease-out; }`}</style>
        </div>
    );
};

export default ClassReportFormModal;