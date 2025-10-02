import React from 'react';
import { PackageWithUsage } from './PackagesView';
import { Student, ScheduledClass } from '../types';
import { ArrowLeftIcon, PencilIcon, TrashIcon } from './Icons';
import InfoItem from './InfoItem';

interface PackageDetailProps {
    package: PackageWithUsage;
    student?: Student;
    classesForPackage: ScheduledClass[];
    onBack: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const PackageDetail: React.FC<PackageDetailProps> = ({ package: pkg, student, classesForPackage, onBack, onEdit, onDelete }) => {
    
    const statusInfo = {
        paid: { text: 'Pago', style: 'bg-green-100 text-green-800' },
        partial: { text: 'Parcial', style: 'bg-amber-100 text-amber-800' },
        pending: { text: 'Pendente', style: 'bg-red-100 text-red-800' }
    }[pkg.paymentStatus] || { text: 'N/A', style: 'bg-zinc-100 text-zinc-800' };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
            {/* Header */}
            <header className="flex items-start justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 transition-colors p-2 rounded-full hover:bg-zinc-100">
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-800">Detalhes do Pacote</h2>
                        <p className="text-zinc-600 font-semibold" title={student?.name}>{student?.name || 'Aluno não encontrado'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onEdit} className="flex items-center gap-2 text-sm bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold py-2 px-3 rounded-lg">
                        <PencilIcon />
                        <span>Editar</span>
                    </button>
                    <button onClick={onDelete} className="flex items-center gap-2 text-sm bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-2 px-3 rounded-lg">
                        <TrashIcon />
                        <span>Excluir</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow overflow-y-auto space-y-6 pr-2 -mr-2">
                <section className="bg-zinc-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <InfoItem label="Horas Contratadas" value={`${pkg.totalHours}h`} />
                        <InfoItem label="Horas Utilizadas" value={`${pkg.usedHours.toFixed(1)}h`} />
                        <InfoItem label="Horas Restantes" value={<span className="font-bold text-lg text-secondary">{pkg.remainingHours.toFixed(1)}h</span>} />
                        <InfoItem label="Data da Compra" value={new Date(pkg.purchaseDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} />
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-zinc-500 mb-1">Progresso</label>
                        <div className="w-full bg-zinc-200 rounded-full h-4">
                            <div 
                                className={`h-4 rounded-full ${pkg.remainingHours <= 3 ? 'bg-red-500' : 'bg-secondary'}`} 
                                style={{ width: `${(pkg.usedHours / pkg.totalHours) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                         <InfoItem label="Valor Total" value={pkg.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                         <InfoItem label="Valor Pago" value={pkg.amountPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                         <InfoItem label="Status Pagamento" value={<span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusInfo.style}`}>{statusInfo.text}</span>} />
                    </div>
                    {pkg.observations && <InfoItem label="Observações" value={pkg.observations} className="mt-4" />}
                </section>
                
                <section>
                    <h3 className="text-lg font-semibold text-zinc-700 mb-2">Aulas Debitadas do Pacote</h3>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-zinc-200">
                             <thead className="bg-zinc-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Data</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Disciplina</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500 uppercase">Crédito Utilizado</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-zinc-200">
                                {classesForPackage.length > 0 ? classesForPackage.map(cls => (
                                    <tr key={cls.id}>
                                        <td className="px-4 py-3 text-sm">{new Date(cls.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                        <td className="px-4 py-3 font-medium text-sm">{cls.discipline}</td>
                                        <td className="px-4 py-3 text-right text-sm font-semibold text-zinc-700">{(cls.duration / 60).toFixed(2).replace('.', ',')}h</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-6 text-center text-zinc-500">Nenhuma aula foi debitada deste pacote ainda.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default PackageDetail;
