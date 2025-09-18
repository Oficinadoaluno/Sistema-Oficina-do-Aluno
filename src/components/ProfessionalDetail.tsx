import React, { useState, useEffect, useContext } from 'react';
import { Professional, WeeklyAvailability, DayOfWeek } from '../types';
import WeeklyAvailabilityComponent from './WeeklyAvailability';
import { db } from '../firebase';
import { ToastContext } from '../App';
import { 
    ArrowLeftIcon, KeyIcon, CalendarDaysIcon, UserMinusIcon, 
    UserPlusIcon, PencilIcon
} from './Icons';

const formatPhoneForDisplay = (phone?: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
};

const InfoItem: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => {
    if (value === undefined || value === null || value === '') return null;
    return (<div><p className="text-xs text-zinc-500 font-medium uppercase">{label}</p><p className="text-zinc-800">{value}</p></div>);
};

interface ManageProfessionalModalProps { isOpen: boolean; onClose: () => void; onInactivate: () => void; professional: Professional; onEdit: () => void; }
const ManageProfessionalModal: React.FC<ManageProfessionalModalProps> = ({ isOpen, onClose, onInactivate, professional, onEdit }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-zinc-800 mb-4">Gerenciar Profissional</h3>
                 <div className="mt-6 border-t pt-4 space-y-2">
                     <button onClick={onEdit} className="w-full text-left text-sm flex items-center gap-3 py-2 px-3 rounded-lg text-secondary-dark hover:bg-secondary/10"><PencilIcon /><span>Editar Dados Cadastrais</span></button>
                    {professional.status !== 'inativo' && (<button onClick={() => { onInactivate(); onClose(); }} className="w-full text-left text-sm flex items-center gap-3 py-2 px-3 rounded-lg text-red-600 hover:bg-red-50"><UserMinusIcon /><span>Inativar Profissional</span></button>)}
                </div>
                <div className="mt-6 flex justify-end gap-3"><button onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Fechar</button></div>
            </div>
        </div>
    );
};

interface ProfessionalDetailProps { professional: Professional; onBack: () => void; onEdit: () => void; }

const ProfessionalDetail: React.FC<ProfessionalDetailProps> = ({ professional, onBack, onEdit }) => {
    const { showToast } = useContext(ToastContext);
    const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
    const [showAllInfo, setShowAllInfo] = useState(false);
    
    const updateStatus = async (newStatus: Professional['status']) => {
        try {
            const profRef = db.collection("professionals").doc(professional.id);
            await profRef.update({ status: newStatus });
            showToast(`Profissional ${newStatus === 'ativo' ? 'reativado' : 'inativado'}.`, 'success');
        } catch (error: any) {
            console.error("Error updating professional status:", error);
            if (error.code === 'permission-denied') {
                showToast("Você não tem permissão para alterar o status do profissional.", "error");
            } else {
                showToast("Ocorreu um erro ao atualizar o status.", "error");
            }
        }
    };

    const handleSaveAvailability = async (newAvailability: WeeklyAvailability) => {
        try {
            const profRef = db.collection("professionals").doc(professional.id);
            await profRef.update({ availability: newAvailability });
            showToast('Disponibilidade salva com sucesso!', 'success');
        } catch (error: any) {
            console.error("Error saving availability:", error);
            if (error.code === 'permission-denied') {
                showToast("Você não tem permissão para salvar a disponibilidade.", "error");
            } else {
                showToast("Ocorreu um erro ao salvar a disponibilidade.", "error");
            }
        }
    };

    const getStatusStyles = (status: Professional['status']) => ({ ativo: 'bg-cyan-100 text-cyan-800', inativo: 'bg-zinc-200 text-zinc-700' }[status]);
    
    return (
        <>
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
            <header className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 p-2 rounded-full hover:bg-zinc-100"><ArrowLeftIcon className="h-6 w-6" /></button>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-800 flex items-center gap-3">{professional.name}<span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStatusStyles(professional.status)}`}>{professional.status === 'ativo' ? 'Ativo' : 'Inativo'}</span></h2>
                        <p className="text-sm text-zinc-500">{professional.disciplines.join(' • ')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                     {professional.status === 'inativo' && (<button onClick={() => updateStatus('ativo')} className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg"><UserPlusIcon /><span>Reativar</span></button>)}
                    <button onClick={() => setIsAccessModalOpen(true)} className="flex items-center gap-2 text-sm bg-zinc-600 hover:bg-zinc-700 text-white font-semibold py-2 px-3 rounded-lg"><KeyIcon /><span>Gerenciar</span></button>
                </div>
            </header>
            <main className="flex-grow overflow-y-auto space-y-8 pr-2 -mr-2">
                <section className="bg-neutral p-4 rounded-lg">
                    <button onClick={() => setShowAllInfo(!showAllInfo)} className="w-full py-2 px-4 bg-zinc-200 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-300">{showAllInfo ? 'Ocultar' : 'Mostrar'} Detalhes Cadastrais</button>
                </section>
                {showAllInfo && (<section className="animate-fade-in-fast space-y-6"><fieldset className="border-t pt-4"><legend className="text-lg font-semibold text-zinc-700 -mt-8 px-2 bg-white">Dados Pessoais e Contato</legend><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2"><InfoItem label="Nome Completo" value={professional.name} /><InfoItem label="Email" value={professional.email} /><InfoItem label="Celular" value={formatPhoneForDisplay(professional.phone)} /><InfoItem label="Endereço" value={professional.address} /><InfoItem label="CPF" value={professional.cpf} /><InfoItem label="Data de Nascimento" value={professional.birthDate ? new Date(professional.birthDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : undefined} /></div></fieldset><fieldset className="border-t pt-4"><legend className="text-lg font-semibold text-zinc-700 -mt-8 px-2 bg-white">Dados Acadêmicos e Financeiros</legend><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2"><InfoItem label="Formação" value={professional.education} /><InfoItem label="Colégio Atual" value={professional.currentSchool} /><InfoItem label="Valor Hora/Aula Individual" value={professional.hourlyRateIndividual?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} /><InfoItem label="Valor Hora/Aula Turma" value={professional.hourlyRateGroup?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} /><InfoItem label="Certificações" value={professional.certifications} /><InfoItem label="Chave PIX" value={professional.pixKey} /><InfoItem label="Banco" value={professional.bank} /><InfoItem label="Agência" value={professional.agency} /><InfoItem label="Conta" value={professional.account} /></div></fieldset></section>)}
                <section><div className="flex items-center gap-3 mb-4"><CalendarDaysIcon className="h-6 w-6 text-secondary" /><h3 className="text-xl font-semibold text-zinc-700">Disponibilidade Semanal</h3></div><WeeklyAvailabilityComponent initialAvailability={professional.availability || {}} onSave={handleSaveAvailability} /></section>
            </main>
        </div>
        <ManageProfessionalModal isOpen={isAccessModalOpen} onClose={() => setIsAccessModalOpen(false)} onInactivate={() => updateStatus('inativo')} professional={professional} onEdit={() => { setIsAccessModalOpen(false); onEdit(); }} />
        <style>{`@keyframes fade-in-fast{from{opacity:0}to{opacity:1}}.animate-fade-in-fast{animation:fade-in-fast .2s ease-out forwards}@keyframes fade-in-down{from{opacity:0;transform:translateY(-10px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}.animate-fade-in-down{animation:fade-in-down .2s ease-out forwards}`}</style>
        </>
    );
}

export default ProfessionalDetail;