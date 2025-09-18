import React, { useState, useEffect } from 'react';
import { Collaborator, AdminPermissions, SystemPanel } from '../types';
import { ArrowLeftIcon } from './Icons';
import { sanitizeFirestore, validateCPF, phoneMask, onlyDigits } from '../utils/sanitizeFirestore';

interface AddCollaboratorFormProps {
    onBack: () => void;
    onSave: (collaboratorData: Omit<Collaborator, 'id'>, password?: string) => Promise<void>;
    collaboratorToEdit: Collaborator | null;
}

const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";
const checkboxLabelStyle = "flex items-center gap-2 text-sm text-zinc-700 cursor-pointer";
const checkboxInputStyle = "h-4 w-4 rounded text-secondary focus:ring-secondary";

const allAdminPermissions: { key: keyof AdminPermissions; label: string }[] = [
    { key: 'canAccessStudents', label: 'Alunos' },
    { key: 'canAccessProfessionals', label: 'Profissionais' },
    { key: 'canAccessClassGroups', label: 'Turmas' },
    { key: 'canAccessPackages', label: 'Pacotes' },
    { key: 'canAccessAgenda', label: 'Agenda' },
    { key: 'canAccessFinancial', label: 'Financeiro' },
    { key: 'canAccessSettings', label: 'Configurações' },
];

const AddCollaboratorForm: React.FC<AddCollaboratorFormProps> = ({ onBack, onSave, collaboratorToEdit }) => {
    const isEditing = !!collaboratorToEdit;
    const [isSubmitting, setIsSubmitting] = useState(false);

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
    const [adminPermissions, setAdminPermissions] = useState<AdminPermissions>({
        canAccessStudents: false,
        canAccessProfessionals: false,
        canAccessClassGroups: false,
        canAccessAgenda: false,
        canAccessFinancial: false,
        canAccessSettings: false,
        canAccessPackages: false,
    });
    const [remunerationType, setRemunerationType] = useState<'fixed' | 'commission' | undefined>(undefined);
    const [fixedSalary, setFixedSalary] = useState<number | ''>('');
    const [commissionPercentage, setCommissionPercentage] = useState<number | ''>('');
    const [cpfError, setCpfError] = useState('');

    const emptyPermissions = {
        canAccessStudents: false, canAccessProfessionals: false, canAccessClassGroups: false,
        canAccessAgenda: false, canAccessFinancial: false, canAccessSettings: false, canAccessPackages: false,
    };

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

            setAdminPermissions(collaboratorToEdit.adminPermissions || emptyPermissions);
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
            setAdminPermissions(emptyPermissions);
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

    const handleAdminPermissionChange = (key: keyof AdminPermissions) => {
        setAdminPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCpfError('');

        if (cpf && !validateCPF(cpf)) {
            setCpfError('CPF inválido.');
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
                adminPermissions: systemAccess.includes('admin') ? adminPermissions : undefined,
                remunerationType,
                fixedSalary: remunerationType === 'fixed' ? Number(fixedSalary) : undefined,
                commissionPercentage: remunerationType === 'commission' ? Number(commissionPercentage) : undefined,
            };
            
            const sanitizedData = sanitizeFirestore(collaboratorData);

            await onSave(sanitizedData, password);
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
                                <input id="collaboratorRole" type="text" value={role} onChange={e => setRole(e.target.value)} className={inputStyle} placeholder="Ex: Secretária, Coordenador" required />
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
                            <div>
                                <label htmlFor="collaboratorLogin" className={labelStyle}>Login de Acesso <span className="text-red-500">*</span></label>
                                <input id="collaboratorLogin" type="text" value={login} onChange={e => setLogin(e.target.value)} className={`${inputStyle} ${isEditing ? 'bg-zinc-200 cursor-not-allowed' : ''}`} required readOnly={isEditing}/>
                            </div>
                            <div>
                                <label htmlFor="collaboratorPassword" className={labelStyle}>{isEditing ? 'Nova Senha (Opcional)' : 'Senha Temporária *'}</label>
                                <input id="collaboratorPassword" type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputStyle} placeholder={isEditing ? 'Deixe em branco para não alterar' : 'Mínimo 6 caracteres'} />
                            </div>
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
                            <label className={checkboxLabelStyle}>
                                <input type="checkbox" checked={systemAccess.includes('student')} onChange={() => handleSystemAccessChange('student')} className={checkboxInputStyle} />
                                Painel do Aluno
                            </label>
                        </div>
                    </fieldset>

                    {/* Admin Permissions (Conditional) */}
                    {systemAccess.includes('admin') && (
                        <fieldset className="animate-fade-in-fast">
                            <legend className="text-lg font-semibold text-zinc-700 mb-2">Permissões do Painel Administrativo</legend>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-zinc-50 rounded-lg">
                                {allAdminPermissions.map(({ key, label }) => (
                                    <label key={key} className={checkboxLabelStyle}>
                                        <input
                                            type="checkbox"
                                            checked={adminPermissions[key]}
                                            onChange={() => handleAdminPermissionChange(key)}
                                            className={checkboxInputStyle}
                                            disabled={key === 'canAccessSettings' && collaboratorToEdit?.role?.toLowerCase() !== 'diretor(a)'}
                                        />
                                        <span>{label}</span>
                                    </label>
                                ))}
                            </div>
                             <p className="text-xs text-zinc-500 mt-2">A permissão de "Configurações" só pode ser gerenciada por um(a) Diretor(a).</p>
                        </fieldset>
                    )}
                    
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