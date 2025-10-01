import React, { useState, useEffect, useContext } from 'react';
import { Collaborator, AdminPermissions, SystemPanel } from '../types';
import { ArrowLeftIcon, ClipboardDocumentIcon, KeyIcon, ArrowTopRightOnSquareIcon, CheckIcon } from './Icons';
import { sanitizeFirestore, validateCPF, phoneMask, onlyDigits } from '../utils/sanitizeFirestore';
import { ToastContext } from '../App';
import { db, auth } from '../firebase';

interface AddCollaboratorFormProps {
    onBack: () => void;
    onSave: (collaboratorData: Omit<Collaborator, 'id'>, password?: string) => Promise<void>;
    collaboratorToEdit: Collaborator | null;
}

const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";
const checkboxLabelStyle = "flex items-center gap-2 text-sm text-zinc-700 cursor-pointer";
const checkboxInputStyle = "h-4 w-4 rounded text-secondary focus:ring-secondary";

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


const AddCollaboratorForm: React.FC<AddCollaboratorFormProps> = ({ onBack, onSave, collaboratorToEdit }) => {
    const isEditing = !!collaboratorToEdit;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useContext(ToastContext);

    // Form State
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [cpf, setCpf] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [pixKey, setPixKey] = useState('');
    const [bank, setBank] = useState('');
    const [agency, setAgency] = useState('');
    const [account, setAccount] = useState('');
    const [systemAccess, setSystemAccess] = useState<SystemPanel[]>([]);
    const [remunerationType, setRemunerationType] = useState<'fixed' | 'commission' | undefined>(undefined);
    const [fixedSalary, setFixedSalary] = useState<number | ''>('');
    const [commissionPercentage, setCommissionPercentage] = useState<number | ''>('');
    const [cpfError, setCpfError] = useState('');
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

    useEffect(() => {
        if (collaboratorToEdit) {
            setName(collaboratorToEdit.name);
            setRole(collaboratorToEdit.role);
            setLogin(collaboratorToEdit.login);
            setPassword('');
            setPhone(phoneMask(collaboratorToEdit.phone || ''));
            setEmail(collaboratorToEdit.email || '');
            setAddress(collaboratorToEdit.address || '');
            setCpf(collaboratorToEdit.cpf || '');
            setBirthDate(collaboratorToEdit.birthDate || '');
            setPixKey(collaboratorToEdit.pixKey || '');
            setBank(collaboratorToEdit.bank || '');
            setAgency(collaboratorToEdit.agency || '');
            setAccount(collaboratorToEdit.account || '');
            
            // Defensively handle malformed systemAccess data
            const accessData = collaboratorToEdit.systemAccess || [];
            if (Array.isArray(accessData)) {
                setSystemAccess(accessData);
            } else if (typeof accessData === 'object' && accessData !== null) {
                // This handles legacy data that was incorrectly saved as an object instead of an array.
                setSystemAccess(Object.values(accessData));
            } else {
                setSystemAccess([]);
            }

            setRemunerationType(collaboratorToEdit.remunerationType);
            setFixedSalary(collaboratorToEdit.fixedSalary || '');
            setCommissionPercentage(collaboratorToEdit.commissionPercentage || '');
        } else {
            // Reset form for new entry
            setName('');
            setRole('');
            setLogin('');
            setPassword('');
            setPhone('');
            setEmail('');
            setAddress('');
            setCpf('');
            setBirthDate('');
            setPixKey('');
            setBank('');
            setAgency('');
            setAccount('');
            setSystemAccess([]);
            setRemunerationType(undefined);
            setFixedSalary('');
            setCommissionPercentage('');
        }
    }, [collaboratorToEdit]);

    const handleSystemAccessChange = (panel: SystemPanel) => {
        setSystemAccess(prev =>
            prev.includes(panel)
                ? prev.filter(p => p !== panel)
                : [...prev, panel]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCpfError('');

        if (cpf && !validateCPF(cpf)) {
            setCpfError('CPF inválido.');
            return;
        }

        if (!isEditing && password.length < 6) {
            showToast('A senha temporária deve ter pelo menos 6 caracteres.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const collaboratorData = {
                name,
                role,
                login,
                phone: onlyDigits(phone),
                email,
                address,
                cpf: onlyDigits(cpf),
                birthDate,
                pixKey,
                bank,
                agency,
                account,
                systemAccess,
                adminPermissions: systemAccess.includes('admin') ? {
                    canAccessStudents: true,
                    canAccessProfessionals: true,
                    canAccessClassGroups: true,
                    canAccessAgenda: true,
                    canAccessFinancial: true,
                    canAccessSettings: true,
                    canAccessPackages: true,
                    canAccessPricing: true,
                } : undefined,
                remunerationType,
                fixedSalary: remunerationType === 'fixed' ? Number(fixedSalary) : undefined,
                commissionPercentage: remunerationType === 'commission' ? Number(commissionPercentage) : undefined,
            };
            
            const sanitizedData = sanitizeFirestore(collaboratorData);

            await onSave(sanitizedData, isEditing ? undefined : password);
        } catch (error) {
            // Error is handled by parent, this just catches the promise rejection
            console.error("Save operation failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
            <header className="flex items-center gap-4 mb-6 flex-shrink-0">
                <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 transition-colors">
                    <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <h2 className="text-2xl font-bold text-zinc-800">{isEditing ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
            </header>

            <form onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden">
                <main className="flex-grow overflow-y-auto pr-2 space-y-6">
                    {/* Basic Info */}
                    <fieldset>
                        <legend className="text-lg font-semibold text-zinc-700 mb-2">Informações do Colaborador</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label htmlFor="collaboratorName" className={labelStyle}>Nome Completo <span className="text-red-500">*</span></label>
                                <input id="collaboratorName" type="text" value={name} onChange={e => setName(e.target.value)} className={inputStyle} required />
                            </div>
                            <div>
                                <label htmlFor="collaboratorRole" className={labelStyle}>Função <span className="text-red-500">*</span></label>
                                <select id="collaboratorRole" value={role} onChange={e => setRole(e.target.value)} className={inputStyle} required>
                                    <option value="" disabled>Selecione a função</option>
                                    <option value="Secretaria">Secretaria</option>
                                    <option value="Diretor">Diretoria</option>
                                </select>
                            </div>
                             <div>
                                <label htmlFor="collaboratorPhone" className={labelStyle}>Telefone</label>
                                <input id="collaboratorPhone" type="tel" value={phone} onChange={e => setPhone(phoneMask(e.target.value))} className={inputStyle} />
                            </div>
                             <div>
                                <label htmlFor="collaboratorEmail" className={labelStyle}>Email</label>
                                <input id="collaboratorEmail" type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputStyle} />
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="collaboratorAddress" className={labelStyle}>Endereço</label>
                                <input id="collaboratorAddress" type="text" value={address} onChange={e => setAddress(e.target.value)} className={inputStyle} />
                            </div>
                            <div>
                                <label htmlFor="collaboratorCpf" className={labelStyle}>CPF</label>
                                <input id="collaboratorCpf" type="text" value={cpf} onChange={e => setCpf(e.target.value)} className={inputStyle} />
                                {cpfError && <p className="text-sm text-red-600 mt-1">{cpfError}</p>}
                            </div>
                            <div>
                                <label htmlFor="collaboratorBirthDate" className={labelStyle}>Data de Nascimento</label>
                                <input id="collaboratorBirthDate" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inputStyle} />
                            </div>
                        </div>
                    </fieldset>

                    {/* System Access */}
                    <fieldset>
                        <legend className="text-lg font-semibold text-zinc-700 mb-2">Acesso ao Sistema</legend>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {isEditing ? (
                                <>
                                    <div>
                                        <label htmlFor="collaboratorLogin" className={labelStyle}>Login de Acesso</label>
                                        <input id="collaboratorLogin" type="text" value={login} className={`${inputStyle} bg-zinc-200`} disabled />
                                        <p className="text-xs text-zinc-500 mt-1">O login não pode ser alterado após a criação.</p>
                                    </div>
                                    <div>
                                        <label className={labelStyle}>Senha</label>
                                        <button type="button" onClick={() => setIsResetModalOpen(true)} className="w-full py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200 transition-colors">
                                            Redefinir Senha...
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label htmlFor="collaboratorLogin" className={labelStyle}>Login de Acesso <span className="text-red-500">*</span></label>
                                        <input id="collaboratorLogin" type="text" value={login} onChange={e => setLogin(e.target.value)} className={inputStyle} required />
                                    </div>
                                    <div>
                                        <label htmlFor="collaboratorPassword" className={labelStyle}>Senha Temporária *</label>
                                        <input id="collaboratorPassword" type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputStyle} required placeholder="Mínimo 6 caracteres" />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="space-y-2 p-3 bg-zinc-50 rounded-lg">
                            <h4 className="font-medium text-zinc-600">Painéis de Acesso</h4>
                            <label className={checkboxLabelStyle}>
                                <input type="checkbox" checked={systemAccess.includes('admin')} onChange={() => handleSystemAccessChange('admin')} className={checkboxInputStyle} />
                                Painel Administrativo
                            </label>
                            <label className={checkboxLabelStyle}>
                                <input type="checkbox" checked={systemAccess.includes('teacher')} onChange={() => handleSystemAccessChange('teacher')} className={checkboxInputStyle} />
                                Painel do Professor
                            </label>
                        </div>
                    </fieldset>
                    
                     {/* Remuneration & Financial */}
                    <fieldset>
                        <legend className="text-lg font-semibold text-zinc-700 mb-2">Informações Financeiras e Remuneração</legend>
                        <div className="flex items-center gap-6 mb-4">
                            <span className={labelStyle}>Tipo de Remuneração:</span>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="remunerationType" value="fixed" checked={remunerationType === 'fixed'} onChange={() => setRemunerationType('fixed')} className="h-4 w-4 text-secondary focus:ring-secondary" />
                                Salário Fixo
                            </label>
                             <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="remunerationType" value="commission" checked={remunerationType === 'commission'} onChange={() => setRemunerationType('commission')} className="h-4 w-4 text-secondary focus:ring-secondary" />
                                Comissão
                            </label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {remunerationType === 'fixed' && (
                                <div className="animate-fade-in-fast md:col-span-2">
                                    <label htmlFor="fixedSalary" className={labelStyle}>Valor do Salário (R$)</label>
                                    <input id="fixedSalary" type="number" value={fixedSalary} onChange={e => setFixedSalary(Number(e.target.value))} className={inputStyle} placeholder="ex: 3000.00" />
                                </div>
                            )}
                            {remunerationType === 'commission' && (
                                <div className="animate-fade-in-fast md:col-span-2">
                                    <label htmlFor="commissionPercentage" className={labelStyle}>Porcentagem da Comissão (%)</label>
                                    <input id="commissionPercentage" type="number" value={commissionPercentage} onChange={e => setCommissionPercentage(Number(e.target.value))} className={inputStyle} placeholder="ex: 12" />
                                </div>
                            )}
                             <div>
                                <label htmlFor="collaboratorPix" className={labelStyle}>Chave PIX</label>
                                <input id="collaboratorPix" type="text" value={pixKey} onChange={e => setPixKey(e.target.value)} className={inputStyle} />
                            </div>
                            <div>
                                <label htmlFor="collaboratorBank" className={labelStyle}>Banco</label>
                                <input id="collaboratorBank" type="text" value={bank} onChange={e => setBank(e.target.value)} className={inputStyle} />
                            </div>
                            <div>
                                <label htmlFor="collaboratorAgency" className={labelStyle}>Agência</label>
                                <input id="collaboratorAgency" type="text" value={agency} onChange={e => setAgency(e.target.value)} className={inputStyle} />
                            </div>
                            <div>
                                <label htmlFor="collaboratorAccount" className={labelStyle}>Conta</label>
                                <input id="collaboratorAccount" type="text" value={account} onChange={e => setAccount(e.target.value)} className={inputStyle} />
                            </div>
                        </div>
                    </fieldset>
                </main>
                <footer className="flex justify-end items-center gap-4 pt-4 border-t flex-shrink-0">
                    <button type="button" onClick={onBack} disabled={isSubmitting} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200 transition-colors">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark transition-colors transform hover:scale-105 disabled:bg-zinc-400 disabled:cursor-not-allowed">
                        {isSubmitting ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar Colaborador')}
                    </button>
                </footer>
            </form>

            {isEditing && collaboratorToEdit && (
                <PasswordResetModal
                    isOpen={isResetModalOpen}
                    onClose={() => setIsResetModalOpen(false)}
                    userLogin={
                        collaboratorToEdit.login?.includes('@')
                            ? collaboratorToEdit.login
                            : `${collaboratorToEdit.login}@sistema-oficinadoaluno.com`
                    }
                />
            )}

             <style>{`
                @keyframes fade-in-fast {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in-fast {
                    animation: fade-in-fast 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default AddCollaboratorForm;