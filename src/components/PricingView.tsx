import React, { useState, useEffect, useMemo, useContext } from 'react';
import { db } from '../firebase';
import { Service, PricingTier } from '../types';
import { ToastContext } from '../App';
import { ArrowLeftIcon, PlusIcon, XMarkIcon, PencilIcon, TrashIcon, CurrencyDollarIcon } from './Icons';
import { sanitizeFirestore } from '../utils/sanitizeFirestore';

const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow disabled:bg-zinc-200";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";

// --- Form Modal Component ---
interface AddServiceFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (serviceData: Omit<Service, 'id'>, serviceToEdit: Service | null) => void;
    serviceToEdit: Service | null;
}
const AddServiceForm: React.FC<AddServiceFormProps> = ({ isOpen, onClose, onSave, serviceToEdit }) => {
    const { showToast } = useContext(ToastContext);
    const isEditing = !!serviceToEdit;

    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [discountPercentage, setDiscountPercentage] = useState<number | ''>('');
    const [pricingTiers, setPricingTiers] = useState<Array<{ quantity: number | '', pricePerUnit: number | '' }>>([{ quantity: 1, pricePerUnit: '' }]);

    useEffect(() => {
        if (serviceToEdit) {
            setName(serviceToEdit.name);
            setCategory(serviceToEdit.category);
            setDiscountPercentage(serviceToEdit.discountPercentage || '');
            setPricingTiers(serviceToEdit.pricingTiers.length > 0 ? serviceToEdit.pricingTiers : [{ quantity: 1, pricePerUnit: '' }]);
        } else {
            setName('');
            setCategory('');
            setDiscountPercentage('');
            setPricingTiers([{ quantity: 1, pricePerUnit: '' }]);
        }
    }, [serviceToEdit, isOpen]);
    
    const handleTierChange = (index: number, field: 'quantity' | 'pricePerUnit', value: string) => {
        const newTiers = [...pricingTiers];
        const numValue = value === '' ? '' : Number(value);
        if (field === 'quantity' && numValue !== '' && numValue < 1) return;
        newTiers[index][field] = numValue;
        setPricingTiers(newTiers);
    };

    const addTier = () => setPricingTiers([...pricingTiers, { quantity: '', pricePerUnit: '' }]);
    const removeTier = (index: number) => {
        if (index === 0) return; // Cannot remove the base unit (index 0 is always quantity 1)
        setPricingTiers(pricingTiers.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const validTiers = pricingTiers
            .filter(t => t.quantity !== '' && t.pricePerUnit !== '' && Number(t.quantity) > 0 && Number(t.pricePerUnit) > 0)
            .map(t => ({ quantity: Number(t.quantity), pricePerUnit: Number(t.pricePerUnit) }));
        
        if (!validTiers.some(t => t.quantity === 1)) {
            showToast('É obrigatório definir um preço para la quantidade 1 (preço unitário).', 'error');
            return;
        }

        const serviceData: Omit<Service, 'id'> = {
            name,
            category,
            discountPercentage: Number(discountPercentage) || undefined,
            pricingTiers: validTiers.sort((a, b) => a.quantity - b.quantity),
        };
        onSave(serviceData, serviceToEdit);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <form className="bg-white rounded-xl shadow-xl w-full max-w-lg m-4" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-zinc-800">{isEditing ? 'Editar Serviço' : 'Novo Serviço'}</h2>
                    <button type="button" onClick={onClose} className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100"><XMarkIcon /></button>
                </header>
                <main className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label htmlFor="serviceName" className={labelStyle}>Nome do Serviço <span className="text-red-500">*</span></label>
                        <input id="serviceName" type="text" value={name} onChange={e => setName(e.target.value)} className={inputStyle} required />
                    </div>
                     <div>
                        <label htmlFor="serviceCategory" className={labelStyle}>Categoria <span className="text-red-500">*</span></label>
                        <input id="serviceCategory" type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex: Aulas Particulares, Cursos" className={inputStyle} required />
                    </div>
                    <div>
                        <label htmlFor="discountPercentage" className={labelStyle}>Desconto Padrão (Pix/Dinheiro) (%)</label>
                        <input id="discountPercentage" type="number" value={discountPercentage} onChange={e => setDiscountPercentage(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ex: 5" className={inputStyle} />
                    </div>

                    <div>
                        <label className={labelStyle}>Tabela de Preços (Pacotes)</label>
                        <div className="space-y-2 p-3 bg-zinc-50 border rounded-lg">
                            {pricingTiers.map((tier, index) => (
                                <div key={index} className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <label htmlFor={`tier-qty-${index}`} className="text-xs text-zinc-500">Quantidade</label>
                                        <input id={`tier-qty-${index}`} type="number" value={tier.quantity} onChange={e => handleTierChange(index, 'quantity', e.target.value)} className={inputStyle} min="1" disabled={index === 0} />
                                    </div>
                                     <div className="flex-1">
                                        <label htmlFor={`tier-price-${index}`} className="text-xs text-zinc-500">Preço por Unidade (R$)</label>
                                        <input id={`tier-price-${index}`} type="number" step="0.01" value={tier.pricePerUnit} onChange={e => handleTierChange(index, 'pricePerUnit', e.target.value)} className={inputStyle} />
                                    </div>
                                    <button type="button" onClick={() => removeTier(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-md disabled:opacity-50" disabled={index === 0}>
                                        <TrashIcon />
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={addTier} className="text-sm font-semibold text-secondary hover:underline mt-2">
                                + Adicionar Pacote
                            </button>
                        </div>
                    </div>
                </main>
                <footer className="flex justify-end items-center gap-4 p-4 border-t">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Cancelar</button>
                    <button type="submit" className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark">{isEditing ? 'Salvar Alterações' : 'Salvar Serviço'}</button>
                </footer>
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
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    const [desiredQuantity, setDesiredQuantity] = useState<number | ''>('');
    const [paymentMethod, setPaymentMethod] = useState<'cartao' | 'pix' | 'dinheiro'>('cartao');
    
    useEffect(() => {
        const unsub = db.collection('services').orderBy('category').onSnapshot(snap => {
            const fetchedServices = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Service[];
            setServices(fetchedServices);
            const categories = [...new Set(fetchedServices.map(s => s.category))];
            if (!selectedCategory && categories.length > 0) {
                setSelectedCategory(categories[0]);
            }
            setLoading(false);
        }, err => {
            console.error(err);
            showToast("Erro ao carregar serviços.", "error");
            setLoading(false);
        });
        return () => unsub();
    }, [showToast, selectedCategory]);

    const categories = useMemo(() => [...new Set(services.map(s => s.category))], [services]);
    const servicesForCategory = useMemo(() => services.filter(s => s.category === selectedCategory), [services, selectedCategory]);

    useEffect(() => {
        if (servicesForCategory.length > 0) {
            if (!servicesForCategory.find(s => s.id === selectedServiceId)) {
                setSelectedServiceId(servicesForCategory[0].id);
            }
        } else {
            setSelectedServiceId('');
        }
    }, [servicesForCategory, selectedServiceId]);
    
    const calculationResult = useMemo(() => {
        const service = services.find(s => s.id === selectedServiceId);
        const quantity = Number(desiredQuantity);

        if (!service || !quantity || quantity <= 0) {
            return { combination: [], basePrice: 0, finalPrice: 0, discountedAmount: 0, pricePerUnit: 0 };
        }

        const sortedTiers = [...(service.pricingTiers || [])].sort((a, b) => b.quantity - a.quantity);
        let remainingQuantity = quantity;
        let totalCost = 0;
        const combination: string[] = [];

        for (const tier of sortedTiers) {
            if (remainingQuantity >= tier.quantity) {
                const numPackages = Math.floor(remainingQuantity / tier.quantity);
                totalCost += numPackages * tier.quantity * tier.pricePerUnit;
                const unitText = tier.quantity > 1 ? `pacote de ${tier.quantity}` : (service.category.includes('Aula') ? 'aula avulsa' : 'unidade');
                combination.push(`${numPackages}x ${unitText}`);
                remainingQuantity %= tier.quantity;
            }
        }

        let discountedAmount = 0;
        if ((paymentMethod === 'pix' || paymentMethod === 'dinheiro') && service.discountPercentage) {
            discountedAmount = totalCost * (service.discountPercentage / 100);
        }

        const finalPrice = totalCost - discountedAmount;
        const pricePerUnit = quantity > 0 ? finalPrice / quantity : 0;

        return {
            combination,
            basePrice: totalCost,
            discountedAmount,
            finalPrice,
            pricePerUnit,
        };

    }, [selectedServiceId, desiredQuantity, services, paymentMethod]);
    
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
    
    const groupedServices = useMemo(() => {
        const groups = services.reduce((acc, service) => {
            (acc[service.category] = acc[service.category] || []).push(service);
            return acc;
        }, {} as Record<string, Service[]>);
    
        // Sort services within each category alphabetically by name
        for (const category in groups) {
            // FIX: Replaced incorrect `map` with `sort` to correctly order services alphabetically.
            groups[category].sort((a, b) => a.name.localeCompare(b.name));
        }

        return groups;
    }, [services]);

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
                        <div className="space-y-4">
                            {Object.entries(groupedServices).map(([category, servicesInCategory]) => (
                                <details key={category} open className="bg-zinc-50 border rounded-lg">
                                    <summary className="p-3 font-bold text-zinc-800 cursor-pointer">{category}</summary>
                                    <div className="p-3 border-t space-y-3">
                                        {servicesInCategory.map(service => (
                                            <div key={service.id} className="bg-white border rounded-lg p-3">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className="font-bold text-zinc-800">{service.name}</p>
                                                        <div className="text-sm text-zinc-600 mt-1 space-y-1">
                                                            {Array.isArray(service.pricingTiers) && service.pricingTiers.map(tier => (
                                                                <p key={tier.quantity}>
                                                                    {tier.quantity > 1 ? `${tier.quantity} un.` : '1 un.'}: {formatPrice(tier.pricePerUnit)} / un.
                                                                </p>
                                                            ))}
                                                        </div>
                                                        {service.discountPercentage && <p className="text-xs text-green-700 font-semibold mt-1">{service.discountPercentage}% de desconto para Pix/Dinheiro</p>}
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        <button onClick={() => handleOpenModal(service)} className="p-2 text-zinc-500 hover:text-secondary hover:bg-zinc-200 rounded-full"><PencilIcon /></button>
                                                        <button onClick={() => handleDeleteService(service.id, service.name)} className="p-2 text-zinc-500 hover:text-red-600 hover:bg-zinc-200 rounded-full"><TrashIcon /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            ))}
                        </div>
                    )}
                </div>
                <div className="space-y-4">
                     <div className="p-4 bg-secondary/5 border border-secondary/20 rounded-lg space-y-4 sticky top-0">
                        <h3 className="text-xl font-semibold text-zinc-700 flex items-center gap-2">
                            <CurrencyDollarIcon className="h-6 w-6 text-secondary"/>
                            Simulador Inteligente
                        </h3>
                        <div>
                            <label htmlFor="calc-category" className={labelStyle}>Categoria</label>
                            <select id="calc-category" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className={inputStyle}>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="calc-service" className={labelStyle}>Serviço</label>
                            <select id="calc-service" value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} className={inputStyle}>
                                {servicesForCategory.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                             <label htmlFor="calc-quantity" className={labelStyle}>Quantidade Desejada</label>
                            <input id="calc-quantity" type="number" value={desiredQuantity} onChange={e => setDesiredQuantity(e.target.value === '' ? '' : Number(e.target.value))} className={inputStyle} min="1"/>
                        </div>
                        <div>
                            <label className={labelStyle}>Forma de Pagamento</label>
                             <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className={inputStyle}>
                                <option value="cartao">Cartão</option>
                                <option value="pix">Pix</option>
                                <option value="dinheiro">Dinheiro</option>
                            </select>
                        </div>
                        <div className="border-t border-secondary/20 pt-4 mt-4">
                            {desiredQuantity && calculationResult.combination.length > 0 && (
                                <div className="mb-3">
                                    <p className="text-sm font-medium text-zinc-600">Combinação Sugerida:</p>
                                    <p className="font-semibold text-secondary-dark">{calculationResult.combination.join(' + ')}</p>
                                </div>
                            )}
                            <div className="space-y-1 mb-3">
                                <div className="flex justify-between text-sm"><span className="text-zinc-600">Valor Base:</span><span className="font-medium">{formatPrice(calculationResult.basePrice)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-zinc-600">Desconto:</span><span className="font-medium text-red-600">- {formatPrice(calculationResult.discountedAmount)}</span></div>
                            </div>
                            <div className="bg-secondary/10 p-3 rounded-lg mt-2 text-center">
                                <p className="text-sm font-medium text-secondary-dark">VALOR FINAL</p>
                                <p className="text-3xl font-bold text-secondary-dark">{formatPrice(calculationResult.finalPrice)}</p>
                                {calculationResult.finalPrice > 0 && calculationResult.pricePerUnit > 0 && (
                                    <p className="text-sm font-medium text-zinc-600 mt-1">({formatPrice(calculationResult.pricePerUnit)} por unidade)</p>
                                )}
                            </div>
                        </div>
                     </div>
                </div>
            </main>
        </div>
    );
};

export default PricingView;
