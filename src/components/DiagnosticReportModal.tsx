import React, { useState, useEffect } from 'react';
import { DiagnosticReport, SchoolGrade } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon } from './Icons';

interface DiagnosticReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (context: any, reportData: DiagnosticReport) => void;
    context: any;
}

const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";
const textareaStyle = `${inputStyle} min-h-[80px]`;

const DiagnosticReportModal: React.FC<DiagnosticReportModalProps> = ({ isOpen, onClose, onSave, context }) => {
    // Initial State structure
    const getInitialState = (): DiagnosticReport => ({
        anamnesis: { studentComplaint: '', familyComplaint: '', neurodiversityInfo: '', therapies: '', medications: '' },
        academicPerformance: { gradingSystem: '', grades: [], observations: '' },
        pedagogicalAnalysis: { favoriteSubjects: '', difficultSubjects: '', learningProfile: '', observedSkills: '', observedDifficulties: '' },
        actionPlan: { initialImpression: '', recommendedApproach: '', initialContinuityPlan: [] },
    });

    const [report, setReport] = useState<DiagnosticReport>(getInitialState());

    useEffect(() => {
        if (context?.diagnosticReport) {
            setReport(context.diagnosticReport);
        } else {
            setReport(getInitialState());
        }
    }, [context]);

    const handleInputChange = (section: keyof DiagnosticReport, field: string, value: any) => {
        setReport(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value,
            },
        }));
    };

    const handleGradeChange = (index: number, field: keyof SchoolGrade, value: string) => {
        const newGrades = [...report.academicPerformance.grades];
        newGrades[index] = { ...newGrades[index], [field]: value };
        handleInputChange('academicPerformance', 'grades', newGrades);
    };

    const addGrade = () => {
        const newGrades = [...report.academicPerformance.grades, { discipline: '', grade: '', observations: '' }];
        handleInputChange('academicPerformance', 'grades', newGrades);
    };
    
    const removeGrade = (index: number) => {
        const newGrades = report.academicPerformance.grades.filter((_, i) => i !== index);
        handleInputChange('academicPerformance', 'grades', newGrades);
    };

    const handleContinuityChange = (index: number, value: string) => {
        const newPlan = [...report.actionPlan.initialContinuityPlan];
        newPlan[index] = { description: value };
        handleInputChange('actionPlan', 'initialContinuityPlan', newPlan);
    };

    const addContinuityItem = () => {
        const newPlan = [...report.actionPlan.initialContinuityPlan, { description: '' }];
        handleInputChange('actionPlan', 'initialContinuityPlan', newPlan);
    };
    
    const removeContinuityItem = (index: number) => {
        const newPlan = report.actionPlan.initialContinuityPlan.filter((_, i) => i !== index);
        handleInputChange('actionPlan', 'initialContinuityPlan', newPlan);
    };
    
    const handleSaveClick = () => {
        onSave(context, report);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl m-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-start p-4 border-b">
                    <div>
                        <h3 className="text-xl font-bold text-zinc-800">Relatório de Avaliação Diagnóstica</h3>
                        <p className="text-zinc-600 font-semibold">{context?.studentName}</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 -mt-1 -mr-1 rounded-full text-zinc-400 hover:bg-zinc-100"><XMarkIcon /></button>
                </header>

                <main className="flex-grow overflow-y-auto p-6 space-y-6">
                    <fieldset className="border p-4 rounded-lg">
                        <legend className="text-lg font-semibold text-zinc-700 px-2">Anamnese</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className={labelStyle}>Queixa Principal (Aluno)</label><textarea value={report.anamnesis.studentComplaint} onChange={e => handleInputChange('anamnesis', 'studentComplaint', e.target.value)} className={textareaStyle} /></div>
                            <div><label className={labelStyle}>Queixa Principal (Família)</label><textarea value={report.anamnesis.familyComplaint} onChange={e => handleInputChange('anamnesis', 'familyComplaint', e.target.value)} className={textareaStyle} /></div>
                            <div><label className={labelStyle}>Neurodiversidade e Laudos</label><textarea value={report.anamnesis.neurodiversityInfo} onChange={e => handleInputChange('anamnesis', 'neurodiversityInfo', e.target.value)} className={textareaStyle} /></div>
                            <div><label className={labelStyle}>Acompanhamentos Terapêuticos</label><textarea value={report.anamnesis.therapies} onChange={e => handleInputChange('anamnesis', 'therapies', e.target.value)} className={textareaStyle} /></div>
                            <div className="md:col-span-2"><label className={labelStyle}>Medicamentos</label><textarea value={report.anamnesis.medications} onChange={e => handleInputChange('anamnesis', 'medications', e.target.value)} className={textareaStyle} /></div>
                        </div>
                    </fieldset>

                    <fieldset className="border p-4 rounded-lg">
                        <legend className="text-lg font-semibold text-zinc-700 px-2">Desempenho Acadêmico (Boletim)</legend>
                        <div className="space-y-4">
                            <div><label className={labelStyle}>Sistema de Avaliação (Notas, Conceitos, etc.)</label><input type="text" value={report.academicPerformance.gradingSystem} onChange={e => handleInputChange('academicPerformance', 'gradingSystem', e.target.value)} className={inputStyle} /></div>
                            {report.academicPerformance.grades.map((grade, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-end p-2 bg-zinc-50 rounded-md">
                                    <div className="col-span-4"><label className={labelStyle}>Disciplina</label><input type="text" value={grade.discipline} onChange={e => handleGradeChange(index, 'discipline', e.target.value)} className={inputStyle} /></div>
                                    <div className="col-span-2"><label className={labelStyle}>Nota/Conceito</label><input type="text" value={grade.grade} onChange={e => handleGradeChange(index, 'grade', e.target.value)} className={inputStyle} /></div>
                                    <div className="col-span-5"><label className={labelStyle}>Observações</label><input type="text" value={grade.observations} onChange={e => handleGradeChange(index, 'observations', e.target.value)} className={inputStyle} /></div>
                                    <div className="col-span-1"><button onClick={() => removeGrade(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-md w-full"><TrashIcon /></button></div>
                                </div>
                            ))}
                            <button onClick={addGrade} className="flex items-center gap-2 text-sm text-secondary font-semibold hover:underline"><PlusIcon className="h-4 w-4" /> Adicionar Disciplina</button>
                            <div><label className={labelStyle}>Observações Gerais sobre o Boletim</label><textarea value={report.academicPerformance.observations} onChange={e => handleInputChange('academicPerformance', 'observations', e.target.value)} className={textareaStyle} /></div>
                        </div>
                    </fieldset>

                    <fieldset className="border p-4 rounded-lg">
                        <legend className="text-lg font-semibold text-zinc-700 px-2">Análise Pedagógica</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div><label className={labelStyle}>Disciplinas Favoritas / com Facilidade</label><textarea value={report.pedagogicalAnalysis.favoriteSubjects} onChange={e => handleInputChange('pedagogicalAnalysis', 'favoriteSubjects', e.target.value)} className={textareaStyle} /></div>
                             <div><label className={labelStyle}>Disciplinas com Dificuldade / Rejeição</label><textarea value={report.pedagogicalAnalysis.difficultSubjects} onChange={e => handleInputChange('pedagogicalAnalysis', 'difficultSubjects', e.target.value)} className={textareaStyle} /></div>
                             <div><label className={labelStyle}>Habilidades Observadas</label><textarea value={report.pedagogicalAnalysis.observedSkills} onChange={e => handleInputChange('pedagogicalAnalysis', 'observedSkills', e.target.value)} className={textareaStyle} /></div>
                             <div><label className={labelStyle}>Dificuldades Observadas</label><textarea value={report.pedagogicalAnalysis.observedDifficulties} onChange={e => handleInputChange('pedagogicalAnalysis', 'observedDifficulties', e.target.value)} className={textareaStyle} /></div>
                             <div className="md:col-span-2"><label className={labelStyle}>Perfil de Aprendizagem (Visual, Auditivo, Cinestésico)</label><textarea value={report.pedagogicalAnalysis.learningProfile} onChange={e => handleInputChange('pedagogicalAnalysis', 'learningProfile', e.target.value)} className={textareaStyle} /></div>
                        </div>
                    </fieldset>

                    <fieldset className="border p-4 rounded-lg">
                        <legend className="text-lg font-semibold text-zinc-700 px-2">Plano de Ação</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className={labelStyle}>Primeiras Impressões</label><textarea value={report.actionPlan.initialImpression} onChange={e => handleInputChange('actionPlan', 'initialImpression', e.target.value)} className={textareaStyle} /></div>
                            <div><label className={labelStyle}>Proposta Pedagógica Recomendada</label><textarea value={report.actionPlan.recommendedApproach} onChange={e => handleInputChange('actionPlan', 'recommendedApproach', e.target.value)} className={textareaStyle} /></div>
                        </div>
                        <div className="mt-4">
                             <label className={labelStyle}>Plano de Continuidade Inicial</label>
                             <div className="space-y-2">
                                {report.actionPlan.initialContinuityPlan.map((item, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <input type="text" value={item.description} onChange={e => handleContinuityChange(index, e.target.value)} className={inputStyle} placeholder="Descreva o item do plano..." />
                                        <button onClick={() => removeContinuityItem(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-md flex-shrink-0"><TrashIcon /></button>
                                    </div>
                                ))}
                                <button onClick={addContinuityItem} className="flex items-center gap-2 text-sm text-secondary font-semibold hover:underline"><PlusIcon className="h-4 w-4" /> Adicionar Item</button>
                             </div>
                        </div>
                    </fieldset>
                </main>

                <footer className="flex justify-end items-center gap-4 p-4 border-t">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Cancelar</button>
                    <button type="button" onClick={handleSaveClick} className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark">Salvar Relatório</button>
                </footer>
            </div>
             <style>{`.animate-fade-in-fast { animation: fadeIn 0.2s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }`}</style>
        </div>
    );
};

export default DiagnosticReportModal;