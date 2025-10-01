import React, { useState, useContext, useEffect } from 'react';
import { Professional } from '../types';
import { ArrowLeftIcon, ClipboardDocumentIcon, KeyIcon, ArrowTopRightOnSquareIcon, CheckIcon } from './Icons';
import { db, auth } from '../firebase';
import { ToastContext } from './../App';
import { sanitizeFirestore, onlyDigits, phoneMask, validateCPF } from '../utils/sanitizeFirestore';

interface AddProfessionalFormProps {
    onBack: () => void;
    professionalToEdit?: Professional;
}

const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";

const initialDisciplineOptions = ['Matemática', 'Física', 'Química', 'Biologia', 'Português', 'Redação', 'Inglês', 'História', 'Geografia', 'Filosofia', 'Sociologia'];


const PasswordResetModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    userLogin: string;
}> = ({ isOpen, onClose, userLogin }) => {
    const { showToast } = useContext(ToastContext) as { showToast: (message: string, type?: 'success' | 'error' | 'info') => void; };
    const [newPassword, setNewPassword] = useState('');
    const [copied, setCopied] = useState(false);

    const generatePassword = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let pass = '';
        for (let i = 0; i < 12; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setNewPassword(pass);
        setCopied(false);
    };

    const copyPassword = () => {
        if (!newPassword) return;
        navigator.clipboard.writeText(newPassword).then(() => {
            setCopied(true);
            showToast('Senha copiada para a área de transferência!', 'success');
            setTimeout(() => setCopied(false), 2500);
        });
    };
    
    useEffect(() => {
        if(isOpen) {
            generatePassword();
        }
    }, [isOpen]);

    if (!isOpen) return null;
    
    const firebaseUsersUrl = `https://console.firebase.google.com/project/${(window as any).__FIREBASE_CONFIG__?.projectId}/authentication/users`;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-zinc-800 mb-2">Definir Nova Senha Temporária</h3>
                <p className="text-sm text-zinc-600 mb-4">
                    Para redefinir a senha do usuário <strong className="text-zinc-800">{userLogin}</strong>, siga os passos abaixo.
                </p>

                <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                        <h4 className="font-semibold text-zinc-800">Passo 1: Gerar e Copiar a Nova Senha</h4>
                        <div className="flex items-center gap-2 mt-2">
                            <input type="text" value={newPassword} readOnly className={`${inputStyle} bg-zinc-200 font-mono`} />
                            <button type="button" onClick={generatePassword} title="Gerar nova senha" className="p-2 bg-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-300"><KeyIcon className="h-5 w-5"/></button>
                            <button type="button" onClick={copyPassword} title="Copiar senha" className="p-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark flex items-center gap-1.5 px-3">
                                {copied ? <CheckIcon className="h-5 w-5" /> : <ClipboardDocumentIcon className="h-5 w-5" />}
                                <span className="text-sm font-semibold">{copied ? 'Copiado!' : 'Copiar'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="border rounded-lg p-4">
                        <h4 className="font-semibold text-zinc-800">Passo 2: Redefinir no Painel do Firebase</h4>
                        <p className="text-sm text-zinc-500 mt-1">
                            Clique no botão abaixo para abrir o painel de autenticação. Encontre o usuário, clique nos três pontos (⋮) ao final da linha e selecione "Redefinir senha". Cole a senha gerada acima.
                        </p>
                        <a href={firebaseUsersUrl} target="_blank" rel="noopener noreferrer"
                           className="mt-3 inline-flex items-center gap-2 py-2 px-4 bg-zinc-200 text-zinc-800 font-semibold rounded-lg hover:bg-zinc-300 transition-colors text-sm">
                            <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                            Abrir Painel de Autenticação
                        </a>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};


const AddProfessionalForm: React.FC<AddProfessionalFormProps> = ({ onBack, professionalToEdit }) => {
    const { showToast } = useContext(ToastContext) as { showToast: (message: string, type?: 'success' | 'error' | 'info') => void; };
    const isEditing = !!professionalToEdit;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cpfError, setCpfError] = useState('');
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    
    // Common fields
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
    const [otherDiscipline, setOtherDiscipline] = useState('');
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    
    // UI state for disciplines
    const [allDisciplines, setAllDisciplines] = useState(initialDisciplineOptions);
    const [disciplineAdded, setDisciplineAdded] = useState(false);
    
    // Full form fields
    const [birthDate, setBirthDate] = useState('');
    const [cpf, setCpf] = useState('');
    const [address, setAddress] = useState('');
    const [email, setEmail] = useState('');
    const [education, setEducation] = useState('');
    const [currentSchool, setCurrentSchool] = useState('');
    const [certifications, setCertifications] = useState('');
    const [pixKey, setPixKey] = useState('');
    const [bank, setBank] = useState('');
    const [agency, setAgency] = useState('');
    const [account, setAccount] = useState('');
    const [hourlyRateIndividual, setHourlyRateIndividual] = useState<number | ''>('');
    const [hourlyRateGroup, setHourlyRateGroup] = useState<number | ''>('');
    const [fixedSalary, setFixedSalary] = useState<number | ''>('');
    

    useEffect(() => {
        if (professionalToEdit) {
            setFullName(professionalToEdit.name || '');
            setBirthDate(professionalToEdit.birthDate || '');
            setCpf(professionalToEdit.cpf || '');
            setAddress(professionalToEdit.address || '');
            setPhone(phoneMask(professionalToEdit.phone || ''));
            setEmail(professionalToEdit.email || '');
            setEducation(professionalToEdit.education || '');
            setCurrentSchool(professionalToEdit.currentSchool || '');
            setCertifications(professionalToEdit.certifications || '');
            setSelectedDisciplines(professionalToEdit.disciplines || []);
            setPixKey(professionalToEdit.pixKey || '');
            setBank(professionalToEdit.bank || '');
            setAgency(professionalToEdit.agency || '');
            setAccount(professionalToEdit.account || '');
            setHourlyRateIndividual(professionalToEdit.hourlyRateIndividual || '');
            setHourlyRateGroup(professionalToEdit.hourlyRateGroup || '');
            setFixedSalary(professionalToEdit.fixedSalary || '');
            setLogin(professionalToEdit.login || '');
            setPassword('');
        } else {
             // Reset form for new entry
            setFullName('');
            setPhone('');
            setSelectedDisciplines([]);
            setOtherDiscipline('');
            setLogin('');
            setPassword('');
        }
    }, [professionalToEdit]);


    const handleDisciplineChange = (discipline: string, isChecked: boolean) => {
        setSelectedDisciplines(prev => isChecked ? [...prev, discipline] : prev.filter(d => d !== discipline));
    };
    
    const handleAddOtherDiscipline = () => {
        const trimmed = otherDiscipline.trim();
        if (trimmed) {
            if (!selectedDisciplines.includes(trimmed)) {
                setSelectedDisciplines(prev => [...prev, trimmed]);
            }
            if (!allDisciplines.includes(trimmed)) {
                setAllDisciplines(prev => [...prev, trimmed].sort());
            }
            setDisciplineAdded(true);
            setTimeout(() => setDisciplineAdded(false), 2000);
        }
        setOtherDiscipline('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!fullName.trim() || !phone.trim() || !login.trim()) {
            showToast('Por favor, preencha todos os campos obrigatórios (*).', 'error');
            return;
        }

        if (cpf && !validateCPF(cpf)) {
            setCpfError('CPF inválido.');
            showToast('O CPF informado é inválido.', 'error');
            return;
        }

        if (!isEditing && password.length < 6) {
            showToast('A senha temporária deve ter pelo menos 6 caracteres.', 'error');
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            if (isEditing && professionalToEdit) {
                const professionalData = {
                    name: fullName,
                    disciplines: selectedDisciplines,
                    birthDate,
                    cpf: onlyDigits(cpf),
                    address,
                    phone: onlyDigits(phone),
                    email,
                    currentSchool,
                    education,
                    certifications,
                    pixKey,
                    bank,
                    agency,
                    account,
                    hourlyRateIndividual: Number(hourlyRateIndividual) || undefined,
                    hourlyRateGroup: Number(hourlyRateGroup) || undefined,
                    fixedSalary: Number(fixedSalary) || undefined,
                    availability: professionalToEdit?.availability || {},
                };

                const profRef = db.collection("professionals").doc(professionalToEdit.id);
                await profRef.update(sanitizeFirestore(professionalData));
                showToast('Dados do professor atualizados!', 'success');
                onBack();

            } else { // Creating a new professional
                const professionalData = {
                    name: fullName,
                    disciplines: selectedDisciplines,
                    phone: onlyDigits(phone),
                    login,
                    availability: {},
                };
                
                const emailForAuth = login.includes('@') ? login : `${login}@oficinadoaluno.com.br`;
                const userCredential = await auth.createUserWithEmailAndPassword(emailForAuth, password);
                const uid = userCredential.user!.uid;

                const newProfessionalData = { ...sanitizeFirestore(professionalData), status: 'ativo' as const };
                await db.collection("professionals").doc(uid).set(newProfessionalData);
                showToast('Professor cadastrado com sucesso!', 'success');
                onBack();
            }
        } catch (error: any) {
            console.error("Error saving professional:", error);
            if (error.code === 'auth/email-already-in-use') {
                showToast('Erro: O login (e-mail) já está em uso por outra conta.', 'error');
            } else if (error.code === 'permission-denied') {
                showToast("Erro de permissão. Verifique as regras de segurança do Firestore.", "error");
            } else {
                showToast("Ocorreu um erro ao salvar o professor. Tente novamente.", 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderFullForm = () => (
         <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-x-8">
            <div className="flex flex-col space-y-8">
                <fieldset>
                    <legend className="text-lg font-semibold text-zinc-700 border-b pb-2 mb-4">Dados Pessoais</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="md:col-span-2"><label htmlFor="fullName" className={labelStyle}>Nome Completo <span className="text-red-500">*</span></label><input type="text" id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} className={inputStyle} required disabled={isSubmitting} /></div>
                        <div><label htmlFor="birthDate" className={labelStyle}>Data de Nascimento</label><input type="date" id="birthDate" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inputStyle} disabled={isSubmitting}/></div>
                        <div><label htmlFor="cpf" className={labelStyle}>CPF</label><input type="text" id="cpf" value={cpf} onChange={e => setCpf(e.target.value)} className={inputStyle} disabled={isSubmitting}/>{cpfError && <p className="text-sm text-red-600 mt-1">{cpfError}</p>}</div>
                        <div className="md:col-span-2"><label htmlFor="address" className={labelStyle}>Endereço</label><input type="text" id="address" value={address} onChange={e => setAddress(e.target.value)} className={inputStyle} disabled={isSubmitting}/></div>
                        <div><label htmlFor="phone" className={labelStyle}>Celular <span className="text-red-500">*</span></label><input type="tel" id="phone" value={phone} onChange={e => setPhone(phoneMask(e.target.value))} className={inputStyle} required disabled={isSubmitting} /></div>
                        <div><label htmlFor="email" className={labelStyle}>Email</label><input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} className={inputStyle} disabled={isSubmitting} /></div>
                    </div>
                </fieldset>
                <fieldset>
                    <legend className="text-lg font-semibold text-zinc-700 border-b pb-2 mb-4">Dados Acadêmicos e Disciplinas</legend>
                    <div className="space-y-4">
                        <div><label htmlFor="education" className={labelStyle}>Formação Acadêmica</label><input type="text" id="education" value={education} onChange={e => setEducation(e.target.value)} className={inputStyle} placeholder="Ex: Graduação em Letras - UFMG" disabled={isSubmitting}/></div>
                        <div><label htmlFor="currentSchool" className={labelStyle}>Colégio em que atua (opcional)</label><input type="text" id="currentSchool" value={currentSchool} onChange={e => setCurrentSchool(e.target.value)} className={inputStyle} placeholder="Ex: Colégio Batista" disabled={isSubmitting}/></div>
                        <div><label htmlFor="certifications" className={labelStyle}>Cursos e Certificações</label><textarea id="certifications" rows={3} value={certifications} onChange={e => setCertifications(e.target.value)} className={inputStyle} disabled={isSubmitting}></textarea></div>
                        <div><span className={labelStyle}>Disciplinas</span>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 p-3 bg-zinc-50 rounded-lg">{allDisciplines.map(d => (<label key={d} className="flex items-center gap-2"><input type="checkbox" checked={selectedDisciplines.includes(d)} onChange={e => handleDisciplineChange(d, e.target.checked)} className="h-4 w-4 rounded text-secondary focus:ring-secondary" disabled={isSubmitting}/><span>{d}</span></label>))}</div>
                             <div className="flex items-center gap-2 mt-2">
                                <input type="text" value={otherDiscipline} onChange={e => setOtherDiscipline(e.target.value)} className={inputStyle} placeholder="Outra disciplina..." disabled={isSubmitting}/>
                                <button type="button" onClick={handleAddOtherDiscipline} className="py-2 px-3 bg-zinc-200 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-300" disabled={isSubmitting}>Adicionar</button>
                                {disciplineAdded && <span className="text-sm text-green-600 font-semibold animate-fade-in-fast">Adicionada!</span>}
                            </div>
                        </div>
                    </div>
                </fieldset>
            </div>
            <div className="flex flex-col space-y-8">
                <fieldset>
                    <legend className="text-lg font-semibold text-zinc-700 border-b pb-2 mb-4">Dados Financeiros</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div><label htmlFor="pixKey" className={labelStyle}>Chave PIX</label><input type="text" id="pixKey" value={pixKey} onChange={e => setPixKey(e.target.value)} className={inputStyle} disabled={isSubmitting}/></div>
                        <div><label htmlFor="bank" className={labelStyle}>Banco</label><input type="text" id="bank" value={bank} onChange={e => setBank(e.target.value)} className={inputStyle} disabled={isSubmitting}/></div>
                        <div><label htmlFor="agency" className={labelStyle}>Agência</label><input type="text" id="agency" value={agency} onChange={e => setAgency(e.target.value)} className={inputStyle} disabled={isSubmitting}/></div>
                        <div><label htmlFor="account" className={labelStyle}>Conta Corrente</label><input type="text" id="account" value={account} onChange={e => setAccount(e.target.value)} className={inputStyle} disabled={isSubmitting}/></div>
                        <div><label htmlFor="hourlyRateIndividual" className={labelStyle}>Valor Hora/Aula Individual (R$)</label><input type="number" id="hourlyRateIndividual" value={hourlyRateIndividual} onChange={e => setHourlyRateIndividual(e.target.value === '' ? '' : Number(e.target.value))} className={inputStyle} placeholder="Ex: 80" step="0.01" disabled={isSubmitting}/></div>
                        <div><label htmlFor="hourlyRateGroup" className={labelStyle}>Valor Fixo Mensal (R$)</label><input type="number" id="hourlyRateGroup" value={hourlyRateGroup} onChange={e => setHourlyRateGroup(e.target.value === '' ? '' : Number(e.target.value))} className={inputStyle} placeholder="Ex: 1500" step="0.01" disabled={isSubmitting}/></div>
                        <div className="md:col-span-2"><label htmlFor="fixedSalary" className={labelStyle}>Salário Fixo (R$)</label><input type="number" id="fixedSalary" value={fixedSalary} onChange={e => setFixedSalary(e.target.value === '' ? '' : Number(e.target.value))} className={inputStyle} placeholder="Ex: 2000" step="0.01" disabled={isSubmitting}/></div>
                    </div>
                </fieldset>
                <fieldset>
                    <legend className="text-lg font-semibold text-zinc-700 border-b pb-2 mb-4">Acesso ao Sistema</legend>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="login" className={labelStyle}>Login</label>
                            <input type="text" id="login" value={login} className={`${inputStyle} bg-zinc-200`} disabled />
                            <p className="text-xs text-zinc-500 mt-1">O login não pode ser alterado após a criação.</p>
                        </div>
                        <div>
                            <label className={labelStyle}>Senha</label>
                            <button
                                type="button"
                                onClick={() => setIsResetModalOpen(true)}
                                disabled={isSubmitting}
                                className="w-full py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
                            >
                                Redefinir Senha...
                            </button>
                        </div>
                    </div>
                </fieldset>
            </div>
        </div>
    );

    const renderSimpleForm = () => (
         <div className="flex-grow space-y-8">
            <fieldset>
                <legend className="text-lg font-semibold text-zinc-700 border-b pb-2 mb-4">Dados Essenciais</legend>
                <div className="space-y-4">
                    <div><label htmlFor="fullName" className={labelStyle}>Nome Completo <span className="text-red-500">*</span></label><input type="text" id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} className={inputStyle} required disabled={isSubmitting} /></div>
                    <div><label htmlFor="phone" className={labelStyle}>Celular <span className="text-red-500">*</span></label><input type="tel" id="phone" value={phone} onChange={e => setPhone(phoneMask(e.target.value))} className={inputStyle} required disabled={isSubmitting} /></div>
                    <div><span className={labelStyle}>Disciplinas</span>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 p-3 bg-zinc-50 rounded-lg">{allDisciplines.map(d => (<label key={d} className="flex items-center gap-2"><input type="checkbox" checked={selectedDisciplines.includes(d)} onChange={e => handleDisciplineChange(d, e.target.checked)} className="h-4 w-4 rounded text-secondary focus:ring-secondary" disabled={isSubmitting}/><span>{d}</span></label>))}</div>
                        <div className="flex items-center gap-2 mt-2">
                            <input type="text" value={otherDiscipline} onChange={e => setOtherDiscipline(e.target.value)} className={inputStyle} placeholder="Outra disciplina..." disabled={isSubmitting}/>
                            <button type="button" onClick={handleAddOtherDiscipline} className="py-2 px-3 bg-zinc-200 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-300" disabled={isSubmitting}>Adicionar</button>
                            {disciplineAdded && <span className="text-sm text-green-600 font-semibold animate-fade-in-fast">Adicionada!</span>}
                        </div>
                    </div>
                </div>
            </fieldset>
            <fieldset>
                <legend className="text-lg font-semibold text-zinc-700 border-b pb-2 mb-4">Acesso ao Sistema</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div><label htmlFor="login" className={labelStyle}>Login <span className="text-red-500">*</span></label><input type="text" id="login" value={login} onChange={e => setLogin(e.target.value)} className={inputStyle} required disabled={isSubmitting}/>{!isEditing && <p className="text-xs text-zinc-500 mt-1">Será convertido para o email: {login}@oficinadoaluno.com.br</p>}</div>
                    <div><label htmlFor="password" className={labelStyle}>Senha Temporária <span className="text-red-500">*</span></label><input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} className={inputStyle} required placeholder="Mínimo 6 caracteres" disabled={isSubmitting}/></div>
                </div>
            </fieldset>
        </div>
    );

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 transition-colors"><ArrowLeftIcon className="h-6 w-6" /></button>
                <h2 className="text-2xl font-bold text-zinc-800">{isEditing ? 'Editar Professor' : 'Cadastrar Novo Professor'}</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2 flex flex-col">
                
                {isEditing ? renderFullForm() : renderSimpleForm()}

                <div className="flex justify-end items-center gap-4 pt-4 border-t mt-8">
                    <button type="button" onClick={onBack} disabled={isSubmitting} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200 transition-colors">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark transition-colors transform hover:scale-105 disabled:bg-zinc-400 disabled:scale-100">{isSubmitting ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Salvar Professor')}</button>
                </div>
            </form>

            {isEditing && professionalToEdit && (
                <PasswordResetModal
                    isOpen={isResetModalOpen}
                    onClose={() => setIsResetModalOpen(false)}
                    userLogin={
                        professionalToEdit.login?.includes('@')
                            ? professionalToEdit.login
                            : `${professionalToEdit.login}@oficinadoaluno.com.br`
                    }
                />
            )}

            <style>{`.animate-fade-in-fast { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
        </div>
    );
};

export default AddProfessionalForm;