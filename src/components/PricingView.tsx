import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import { db } from '../firebase';
import { Service } from '../types';
import { ToastContext } from '../App';
import { ArrowLeftIcon, PlusIcon, XMarkIcon, PencilIcon, TrashIcon, CurrencyDollarIcon } from './Icons';
import { sanitizeFirestore } from '../utils/sanitizeFirestore';

const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow disabled:bg-zinc-200";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";
const radioLabelStyle = "flex items-center gap-2 text-sm text-zinc-700 cursor-pointer p-2 rounded-md border-2 border-transparent peer-checked:border-secondary peer-checked:bg-secondary/10";
const radioInputStyle = "sr-only peer";

// --- Form Modal Component ---
interface AddServiceFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (serviceData: Omit<Service, 'id'>, serviceToEdit: Service | null) => void;
    serviceToEdit: Service | null;
}
const AddServiceForm: React.FC<AddServiceFormProps> = ({ isOpen, onClose, onSave, serviceToEdit }) => {
    const isEditing = !!serviceToEdit;

    const [name, setName] = useState('');
    const [type, setType] = useState<'hourly' | 'package' | 'daily'>('hourly');
    const [totalHours, setTotalHours] = useState<number | ''>('');
    const [pricePerHour, setPricePerHour] = useState<number | ''>('');
    const [totalPrice, setTotalPrice] = useState<number | ''>('');
    const lastEditedField = useRef<'perHour' | 'total' | null>(null);

    useEffect(() => {
        if (serviceToEdit) {
            setName(serviceToEdit.name);
            setType(serviceToEdit.type);
            setTotalHours(serviceToEdit.totalHours || '');
            setPricePerHour(serviceToEdit.pricePerHour || '');
            setTotalPrice(serviceToEdit.totalPrice || '');
        } else {
            setName('');
            setType('hourly');
            setTotalHours('');
            setPricePerHour('');
            setTotalPrice('');
        }
    }, [serviceToEdit, isOpen]);
    
    useEffect(() => {
        if (type !== 'package' || !totalHours || totalHours <= 0) return;

        if (lastEditedField.current === 'perHour' && pricePerHour !== '') {
            const newTotal = Number(pricePerHour) * Number(totalHours);
            setTotalPrice(Math.round(newTotal * 100) / 100);
        } else if (lastEditedField.current === 'total' && totalPrice !== '') {
            const newPerHour = Number(totalPrice) / Number(totalHours);
            setPricePerHour(Math.round(newPerHour * 100) / 100);
        }
    }, [pricePerHour, totalPrice, totalHours, type]);

    useEffect(() => {
        if (type !== 'package' || !totalHours || totalHours <= 0) return;
        if (pricePerHour !== '') {
            setTotalPrice(Number(pricePerHour) * Number(totalHours));
            lastEditedField.current = 'perHour';
        }
    }, [totalHours, type]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const serviceData: Omit<Service, 'id'> = {
            name, type,
            totalHours: type === 'package' ? Number(totalHours) : undefined,
            pricePerHour: type === 'hourly' || type === 'package' ? Number(pricePerHour) : undefined,
            totalPrice: type === 'package' || type === 'daily' ? Number(totalPrice) : undefined,
        };
        onSave(serviceData, serviceToEdit);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <form className="bg-white rounded-xl shadow-xl w-full max-w-lg m-4" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-zinc-800">{isEditing ? 'Editar Serviço' : 'Novo Serviço'}</h2>
                    <button type="button" onClick={onClose} className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100"><XMarkIcon /></button>
                </header>
                <main className="p-6 space-y-4">
                    <div>
                        <label htmlFor="serviceName" className={labelStyle}>Nome do Serviço <span className="text-red-500">*</span></label>
                        <input id="serviceName" type="text" value={name} onChange={e => setName(e.target.value)} className={inputStyle} required />
                    </div>
                    <div>
                        <label className={labelStyle}>Tipo de Serviço</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['hourly', 'package', 'daily'] as const).map(t => (
                                <label key={t} className={radioLabelStyle}><input type="radio" name="serviceType" value={t} checked={type === t} onChange={() => setType(t)} className={radioInputStyle} />{ {hourly: 'Hora/Aula', package: 'Pacote', daily: 'Diária'}[t] }</label>
                            ))}
                        </div>
                    </div>

                    {type === 'package' && (
                        <div className="p-3 bg-zinc-50 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in-fast">
                            <div>
                                <label htmlFor="totalHours" className={labelStyle}>Nº de Horas</label>
                                <input id="totalHours" type="number" value={totalHours} onChange={e => setTotalHours(e.target.value === '' ? '' : Number(e.target.value))} className={inputStyle} />
                            </div>
                            <div>
                                <label htmlFor="pricePerHour" className={labelStyle}>Preço/Hora (R$)</label>
                                <input id="pricePerHour" type="number" step="0.01" value={pricePerHour} onChange={e => { setPricePerHour(e.target.value === '' ? '' : Number(e.target.value)); lastEditedField.current = 'perHour'; }} className={inputStyle} />
                            </div>
                             <div>
                                <label htmlFor="totalPricePkg" className={labelStyle}>Preço Total (R$)</label>
                                <input id="totalPricePkg" type="number" step="0.01" value={totalPrice} onChange={e => { setTotalPrice(e.target.value === '' ? '' : Number(e.target.value)); lastEditedField.current = 'total'; }} className={inputStyle} />
                            </div>
                        </div>
                    )}
                    {type === 'hourly' && (
                         <div className="animate-fade-in-fast">
                            <label htmlFor="pricePerHourSingle" className={labelStyle}>Preço por Hora (R$)</label>
                            <input id="pricePerHourSingle" type="number" step="0.01" value={pricePerHour} onChange={e => setPricePerHour(e.target.value === '' ? '' : Number(e.target.value))} className={inputStyle} />
                        </div>
                    )}
                    {type === 'daily' && (
                         <div className="animate-fade-in-fast">
                            <label htmlFor="totalPriceDaily" className={labelStyle}>Preço por Dia (R$)</label>
                            <input id="totalPriceDaily" type="number" step="0.01" value={totalPrice} onChange={e => setTotalPrice(e.target.value === '' ? '' : Number(e.target.value))} className={inputStyle} />
                        </div>
                    )}
                </main>
                <footer className="flex justify-end items-center gap-4 p-4 border-t">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Cancelar</button>
                    <button type="submit" className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark">{isEditing ? 'Salvar Alterações' : 'Salvar Serviço'}</button>
                </footer>
                <style>{`.animate-fade-in-fast { animation: fadeIn 0.2s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
            </form>
        </div>
    );
};

// --- Main View Component ---
interface PricingViewProps { onBack: () => void; }
const PricingView: React.FC<PricingViewProps> = ({ onBack }) => {
    const { showToast } = useContext(ToastContext);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);

    // Calculator state
    const [selectedCalcServiceId, setSelectedCalcServiceId] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'cartao' | 'pix' | 'dinheiro'>('cartao');
    const [discount, setDiscount] = useState<number | ''>('');
    
    useEffect(() => {
        const unsub = db.collection('services').orderBy('name').onSnapshot(snap => {
            setServices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Service[]);
            setLoading(false);
        }, err => {
            console.error(err);
            showToast("Erro ao carregar serviços.", "error");
            setLoading(false);
        });
        return () => unsub();
    }, [showToast]);

    const { basePrice, discountedAmount, finalPrice } = useMemo(() => {
        const service = services.find(s => s.id === selectedCalcServiceId);
        if (!service) return { basePrice: 0, discountedAmount: 0, finalPrice: 0 };
        const base = service.totalPrice ?? service.pricePerHour ?? 0;
        let final = base;
        let discounted = 0;
        if ((paymentMethod === 'pix' || paymentMethod === 'dinheiro') && discount) {
            discounted = base * (Number(discount) / 100);
            final = base - discounted;
        }
        return { basePrice: base, discountedAmount: discounted, finalPrice: final };
    }, [selectedCalcServiceId, services, paymentMethod, discount]);
    
    const handleOpenModal = (service: Service | null = null) => {
        setServiceToEdit(service);
        setIsModalOpen(true);
    };

    const handleSaveService = async (serviceData: Omit<Service, 'id'>, serviceToEdit: Service | null) => {
        try {
            const sanitizedData = sanitizeFirestore(serviceData as any);
            if (serviceToEdit) {
                await db.collection('services').doc(serviceToEdit.id).update(sanitizedData);
                showToast('Serviço atualizado!', 'success');
            } else {
                await db.collection('services').add(sanitizedData);
                showToast('Serviço criado!', 'success');
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            showToast('Erro ao salvar o serviço.', 'error');
        }
    };

    const handleDeleteService = async (serviceId: string, serviceName: string) => {
        if (window.confirm(`Tem certeza que deseja excluir o serviço "${serviceName}"?`)) {
            try {
                await db.collection('services').doc(serviceId).delete();
                showToast('Serviço excluído!', 'success');
            } catch (error) {
                console.error(error);
                showToast('Erro ao excluir serviço.', 'error');
            }
        }
    };
    
    const formatPrice = (value: number | undefined) => value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'N/A';

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
            <AddServiceForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveService} serviceToEdit={serviceToEdit} />
            <header className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800"><ArrowLeftIcon /></button>
                    <h2 className="text-2xl font-bold text-zinc-800">Valores e Serviços</h2>
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-secondary text-white font-semibold py-2 px-4 rounded-lg hover:bg-secondary-dark"><PlusIcon /><span>Adicionar Serviço</span></button>
            </header>

            <main className="flex-grow overflow-y-auto pr-2 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xl font-semibold text-zinc-700">Serviços Cadastrados</h3>
                    {loading ? <p>Carregando...</p> : (
                        <div className="space-y-3">
                            {services.map(service => (
                                <div key={service.id} className="bg-zinc-50 border rounded-lg p-3 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="font-bold text-zinc-800">{service.name}</p>
                                        <p className="text-sm text-zinc-600">
                                            {service.type === 'hourly' && `${formatPrice(service.pricePerHour)} / hora`}
                                            {service.type === 'package' && `${service.totalHours} horas - ${formatPrice(service.totalPrice)} (${formatPrice(service.pricePerHour)}/h)`}
                                            {service.type === 'daily' && `${formatPrice(service.totalPrice)} / dia`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleOpenModal(service)} className="p-2 text-zinc-500 hover:text-secondary hover:bg-zinc-200 rounded-full"><PencilIcon /></button>
                                        <button onClick={() => handleDeleteService(service.id, service.name)} className="p-2 text-zinc-500 hover:text-red-600 hover:bg-zinc-200 rounded-full"><TrashIcon /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="space-y-4">
                     <h3 className="text-xl font-semibold text-zinc-700">Simulador de Preços</h3>
                     <div className="p-4 bg-zinc-50 border rounded-lg space-y-4">
                        <div>
                            <label htmlFor="calc-service" className={labelStyle}>Serviço</label>
                            <select id="calc-service" value={selectedCalcServiceId} onChange={e => setSelectedCalcServiceId(e.target.value)} className={inputStyle}>
                                <option value="" disabled>Selecione um serviço...</option>
                                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelStyle}>Forma de Pagamento</label>
                             <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className={inputStyle}>
                                <option value="cartao">Cartão</option>
                                <option value="pix">Pix</option>
                                <option value="dinheiro">Dinheiro</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="calc-discount" className={labelStyle}>Desconto (%)</label>
                            <input id="calc-discount" type="number" value={discount} onChange={e => setDiscount(e.target.value === '' ? '' : Number(e.target.value))} className={inputStyle} disabled={paymentMethod === 'cartao'} placeholder={paymentMethod === 'cartao' ? 'N/A' : 'Ex: 5'}/>
                        </div>
                        <div className="border-t pt-4 space-y-2">
                            <div className="flex justify-between text-sm"><span className="text-zinc-600">Valor Base:</span><span className="font-medium">{formatPrice(basePrice)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-zinc-600">Desconto:</span><span className="font-medium text-red-600">- {formatPrice(discountedAmount)}</span></div>
                            <div className="flex justify-between text-lg"><span className="text-zinc-800 font-bold">Valor Final:</span><span className="font-bold text-secondary">{formatPrice(finalPrice)}</span></div>
                        </div>
                     </div>
                </div>
            </main>
        </div>
    );
};

export default PricingView;