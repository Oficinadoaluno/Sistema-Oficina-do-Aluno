
import React, { useState, useContext } from 'react';
import { Professional } from '../types';
import { ArrowLeftIcon } from './Icons';
import { db, auth } from '../firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ToastContext } from '../App';

interface AddProfessionalFormProps {
    onBack: () => void;
    professionalToEdit?: Professional;
}

const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";

const disciplineOptions = ['Matemática', 'Física', 'Química', 'Biologia', 'Português', 'Redação', 'Inglês', 'História', 'Geografia', 'Filosofia', 'Sociologia'];

const validateCPF = (cpf: string): boolean => {
    if (!cpf) return true; // Optional field is valid if empty
    const cpfClean = cpf.replace(/[^\d]/g, '');

    if (cpfClean.length !== 11 || /^(\d)\1{10}$/.test(cpfClean)) {
        return false;
    }

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
        sum += parseInt(cpfClean.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) {
        remainder = 0;
    }
    if (remainder !== parseInt(cpfClean.substring(9, 10))) {
        return false;
    }

    sum = 0;
    for (let i = 1; i <= 10; i++) {
        sum += parseInt(cpfClean.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) {
        remainder = 0;
    }
    if (remainder !== parseInt(cpfClean.substring(10, 11))) {
        return false;
    }

    return true;
};

const phoneMask = (v: string): string => {
  if (!v) return "";
  v = v.replace(/\D/g, '');
  v = v.substring(0, 11);
  if (v.length > 10) {
    v = v.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (v.length > 6) {
    v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  } else if (v.length > 2) {
    v = v.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
  } else {
    v = v.replace(/^(\d*)/, '($1');
  }
  return v;
};

const AddProfessionalForm: React.FC<AddProfessionalFormProps> = ({ onBack, professionalToEdit }) => {
    const { showToast } = useContext(ToastContext);
    const isEditing = !!professionalToEdit;
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [fullName, setFullName] = useState(professionalToEdit?.name || '');
    const [email, setEmail] = useState(professionalToEdit?.email || '');
    const [phone, setPhone] = useState(professionalToEdit?.phone || '');
    const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>(professionalToEdit?.disciplines || []);
    const [otherDiscipline, setOtherDiscipline] = useState('');
    const [login, setLogin] = useState(professionalToEdit?.login || '');
    const [password, setPassword] = useState('');
    const [cpf, setCpf] = useState(professionalToEdit?.cpf || '');
    const [cpfError, setCpfError] = useState('');

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCpfError('');

        if (cpf && !validateCPF(cpf)) {
            setCpfError('CPF inválido.');
            showToast('O CPF informado é inválido.', 'error');
            return;
        }

        if (!fullName.trim() || !phone.trim() || (!isEditing && !login.trim())) {
            showToast('Por favor, preencha todos os campos obrigatórios (*).', 'error');
            return;
        }

        if (!isEditing && password.length < 6) {
            showToast('A senha temporária deve ter pelo menos 6 caracteres.', 'error');
            return;
        }
        
        setIsSubmitting(true);
        const formData = new FormData(e.target as HTMLFormElement);
        const formProps = Object.fromEntries(formData.entries());

        const professionalData = {
            name: formProps.fullName as string,
            disciplines: selectedDisciplines,
            birthDate: formProps.birthDate as string,
            cpf: (formProps.cpf as string).replace(/\D/g, ''),
            address: formProps.address as string,
            phone: (formProps.phone as string).replace(/\D/g, ''),
            email: formProps.email as string,
            currentSchool: formProps.currentSchool as string,
            education: formProps.education as string,
            certifications: formProps.certifications as string,
            pixKey: formProps.pixKey as string,
            bank: formProps.bank as string,
            agency: formProps.agency as string,
            account: formProps.account as string,
            hourlyRateIndividual: Number(formProps.hourlyRateIndividual) || 0,
            hourlyRateGroup: Number(formProps.hourlyRateGroup) || 0,
            login: formProps.login as string,
            availability: professionalToEdit?.availability || {},
        };

        try {
            if (isEditing) {
                const profRef = doc(db, "professionals", professionalToEdit.id);
                await updateDoc(profRef, professionalData);
                showToast('Dados do profissional atualizados com sucesso!', 'success');
            } else {
                const emailForAuth = login.includes('@') ? login : `${login}@sistema-oficinadoaluno.com`;
                const userCredential = await createUserWithEmailAndPassword(auth, emailForAuth, password);
                const uid = userCredential.user.uid;

                const newProfessionalData = {
                    ...professionalData,
                    status: 'ativo' as const,
                };
                
                await setDoc(doc(db, "professionals", uid), newProfessionalData);
                showToast('Profissional cadastrado com sucesso!', 'success');
            }
            onBack();
        } catch (error: any) {
            console.error("Error saving professional:", error);
            if (error.code === 'auth/email-already-in-use') {
                showToast('Erro: O login (email) já está em uso.', 'error');
            } else if (error.code === 'auth/weak-password') {
                showToast('Erro: A senha é muito fraca. Use pelo menos 6 caracteres.', 'error');
            } else if (error.code === 'permission-denied') {
                showToast("Você não tem permissão para salvar este profissional.", "error");
            } else if (error.code === 'unavailable') {
                showToast("Erro de conexão. Verifique sua internet.", "error");
            } else {
                showToast("Ocorreu um erro ao salvar o profissional.", 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
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
                            <input type="text" id="cpf" name="cpf" className={inputStyle} value={cpf} onChange={e => setCpf(e.target.value)}/>
                            {cpfError && <p className="text-sm text-red-600 mt-1">{cpfError}</p>}
                        </div>
                         <div className="md:col-span-2">
                            <label htmlFor="address" className={labelStyle}>Endereço</label>
                            <input type="text" id="address" name="address" className={inputStyle} defaultValue={professionalToEdit?.address}/>
                        </div>
                        <div>
                            <label htmlFor="phone" className={labelStyle}>Celular <span className="text-red-500">*</span></label>
                            <input type="tel" id="phone" name="phone" className={inputStyle} required value={phoneMask(phone)} onChange={e => setPhone(e.target.value)} />
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
                 
                 {/* System Access Section */}
                <fieldset>
                    <legend className="text-lg font-semibold text-zinc-700 border-b pb-2 mb-4">Acesso ao Sistema</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div>
                            <label htmlFor="login" className={labelStyle}>Login <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                id="login"
                                name="login"
                                className={`${inputStyle} ${isEditing ? 'bg-zinc-200 cursor-not-allowed' : ''}`}
                                required
                                value={login}
                                onChange={e => setLogin(e.target.value)}
                                readOnly={isEditing}
                            />
                             {!isEditing && <p className="text-xs text-zinc-500 mt-1">Será convertido para o email: {login}@sistema-oficinadoaluno.com</p>}
                        </div>
                        {!isEditing && (
                             <div className="animate-fade-in-fast">
                                <label htmlFor="password" className={labelStyle}>Senha Temporária <span className="text-red-500">*</span></label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    className={inputStyle}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>
                        )}
                    </div>
                </fieldset>


                {/* Action Buttons */}
                <div className="flex justify-end items-center gap-4 pt-4 border-t">
                    <button type="button" onClick={onBack} disabled={isSubmitting} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200 transition-colors">
                        Cancelar
                    </button>
                    <button type="submit" disabled={isSubmitting} className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark transition-colors transform hover:scale-105 disabled:bg-zinc-400 disabled:scale-100">
                        {isSubmitting ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Salvar Profissional')}
                    </button>
                </div>
            </form>
             <style>{`.animate-fade-in-fast { animation: fadeIn 0.2s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
        </div>
    );
};

export default AddProfessionalForm;
