import React, { useState } from 'react';
import { Professional } from '../types';
import { ArrowLeftIcon } from './Icons';

interface AddProfessionalFormProps {
    onBack: () => void;
    professionalToEdit?: Professional;
}

const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";

const disciplineOptions = ['Matemática', 'Física', 'Química', 'Biologia', 'Português', 'Redação', 'Inglês', 'História', 'Geografia', 'Filosofia', 'Sociologia'];

const AddProfessionalForm: React.FC<AddProfessionalFormProps> = ({ onBack, professionalToEdit }) => {
    const isEditing = !!professionalToEdit;

    const [fullName, setFullName] = useState(professionalToEdit?.name || '');
    const [email, setEmail] = useState(professionalToEdit?.email || '');
    const [phone, setPhone] = useState(professionalToEdit?.phone || '');
    const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>(professionalToEdit?.disciplines || []);
    const [otherDiscipline, setOtherDiscipline] = useState('');

    const handleDisciplineChange = (discipline: string, isChecked: boolean) => {
        if (isChecked) {
            setSelectedDisciplines(prev => [...prev, discipline]);
        } else {
            setSelectedDisciplines(prev => prev.filter(d => d !== discipline));
        }
    };
    
    const handleAddOtherDiscipline = () => {
        if (otherDiscipline.trim() && !selectedDisciplines.includes(otherDiscipline.trim())) {
            setSelectedDisciplines(prev => [...prev, otherDiscipline.trim()]);
        }
        setOtherDiscipline('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName.trim() || !phone.trim()) {
            alert('Por favor, preencha os campos obrigatórios: Nome Completo e Celular.');
            return;
        }
        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());
        console.log("Form Data:", { ...data, disciplines: selectedDisciplines });
        alert(isEditing ? 'Dados do profissional atualizados com sucesso! (Simulação)' : 'Profissional cadastrado com sucesso! (Simulação)');
        onBack();
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 transition-colors">
                    <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <h2 className="text-2xl font-bold text-zinc-800">{isEditing ? 'Editar Profissional' : 'Cadastrar Novo Profissional'}</h2>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto space-y-8 pr-2">
                
                {/* Personal Data Section */}
                <fieldset>
                    <legend className="text-lg font-semibold text-zinc-700 border-b pb-2 mb-4">Dados Pessoais</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="md:col-span-2">
                            <label htmlFor="fullName" className={labelStyle}>Nome Completo <span className="text-red-500">*</span></label>
                            <input type="text" id="fullName" name="fullName" className={inputStyle} required value={fullName} onChange={e => setFullName(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="birthDate" className={labelStyle}>Data de Nascimento</label>
                            <input type="date" id="birthDate" name="birthDate" className={inputStyle} defaultValue={professionalToEdit?.birthDate}/>
                        </div>
                         <div>
                            <label htmlFor="cpf" className={labelStyle}>CPF</label>
                            <input type="text" id="cpf" name="cpf" className={inputStyle} defaultValue={professionalToEdit?.cpf}/>
                        </div>
                         <div className="md:col-span-2">
                            <label htmlFor="address" className={labelStyle}>Endereço</label>
                            <input type="text" id="address" name="address" className={inputStyle} defaultValue={professionalToEdit?.address}/>
                        </div>
                        <div>
                            <label htmlFor="phone" className={labelStyle}>Celular <span className="text-red-500">*</span></label>
                            <input type="tel" id="phone" name="phone" className={inputStyle} required value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="email" className={labelStyle}>Email</label>
                            <input type="email" id="email" name="email" className={inputStyle} value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                    </div>
                </fieldset>

                 {/* Academic Data Section */}
                <fieldset>
                    <legend className="text-lg font-semibold text-zinc-700 border-b pb-2 mb-4">Dados Acadêmicos e Disciplinas</legend>
                    <div className="space-y-4">
                         <div>
                            <label htmlFor="education" className={labelStyle}>Formação Acadêmica</label>
                            <input type="text" id="education" name="education" className={inputStyle} defaultValue={professionalToEdit?.education} placeholder="Ex: Graduação em Letras - UFMG"/>
                        </div>
                        <div>
                            <label htmlFor="currentSchool" className={labelStyle}>Colégio em que atua (opcional)</label>
                            <input type="text" id="currentSchool" name="currentSchool" className={inputStyle} defaultValue={professionalToEdit?.currentSchool} placeholder="Ex: Colégio Batista"/>
                        </div>
                        <div>
                            <label htmlFor="certifications" className={labelStyle}>Cursos e Certificações</label>
                             <textarea id="certifications" name="certifications" rows={3} className={inputStyle} defaultValue={professionalToEdit?.certifications}></textarea>
                        </div>
                        <div>
                            <span className={labelStyle}>Disciplinas</span>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 p-3 bg-zinc-50 rounded-lg">
                                {disciplineOptions.map(d => (
                                    <label key={d} className="flex items-center gap-2">
                                        <input type="checkbox" checked={selectedDisciplines.includes(d)} onChange={e => handleDisciplineChange(d, e.target.checked)} className="h-4 w-4 rounded text-secondary focus:ring-secondary"/>
                                        <span>{d}</span>
                                    </label>
                                ))}
                            </div>
                             <div className="flex items-center gap-2 mt-2">
                                <input type="text" value={otherDiscipline} onChange={e => setOtherDiscipline(e.target.value)} className={inputStyle} placeholder="Outra disciplina..."/>
                                <button type="button" onClick={handleAddOtherDiscipline} className="py-2 px-3 bg-zinc-200 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-300">Adicionar</button>
                            </div>
                        </div>
                    </div>
                </fieldset>
                
                {/* Financial Data Section */}
                 <fieldset>
                    <legend className="text-lg font-semibold text-zinc-700 border-b pb-2 mb-4">Dados Financeiros</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                         <div>
                            <label htmlFor="pixKey" className={labelStyle}>Chave PIX</label>
                            <input type="text" id="pixKey" name="pixKey" className={inputStyle} defaultValue={professionalToEdit?.pixKey}/>
                        </div>
                         <div>
                            <label htmlFor="bank" className={labelStyle}>Banco</label>
                            <input type="text" id="bank" name="bank" className={inputStyle} defaultValue={professionalToEdit?.bank}/>
                        </div>
                        <div>
                            <label htmlFor="agency" className={labelStyle}>Agência</label>
                            <input type="text" id="agency" name="agency" className={inputStyle} defaultValue={professionalToEdit?.agency}/>
                        </div>
                         <div>
                            <label htmlFor="account" className={labelStyle}>Conta Corrente</label>
                            <input type="text" id="account" name="account" className={inputStyle} defaultValue={professionalToEdit?.account}/>
                        </div>
                        <div>
                            <label htmlFor="hourlyRateIndividual" className={labelStyle}>Valor Hora/Aula Individual (R$)</label>
                            <input type="number" id="hourlyRateIndividual" name="hourlyRateIndividual" className={inputStyle} defaultValue={professionalToEdit?.hourlyRateIndividual} placeholder="Ex: 80" step="0.01"/>
                        </div>
                         <div>
                            <label htmlFor="hourlyRateGroup" className={labelStyle}>Valor Hora/Aula Turma (R$)</label>
                            <input type="number" id="hourlyRateGroup" name="hourlyRateGroup" className={inputStyle} defaultValue={professionalToEdit?.hourlyRateGroup} placeholder="Ex: 65" step="0.01"/>
                        </div>
                    </div>
                 </fieldset>

                {/* Action Buttons */}
                <div className="flex justify-end items-center gap-4 pt-4 border-t">
                    <button type="button" onClick={onBack} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200 transition-colors">
                        Cancelar
                    </button>
                    <button type="submit" className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark transition-colors transform hover:scale-105">
                        {isEditing ? 'Salvar Alterações' : 'Salvar Profissional'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddProfessionalForm;