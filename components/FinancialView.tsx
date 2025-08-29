
import React, { useState, useMemo, useEffect } from 'react';
// FIX: Remove mock data import and add firebase imports
import { db } from '../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Transaction, DayOfWeek, Student, Professional, Collaborator, ScheduledClass, ClassGroup } from '../types';
import AddTransactionModal from './AddTransactionModal';
import ManageCategoriesModal from './ManageCategoriesModal';
import { 
    ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, EyeIcon, EyeSlashIcon, ArrowUpIcon, ArrowDownIcon 
} from './Icons';

// --- Helper Functions ---
const getDayOfWeekCount = (year: number, month: number, dayOfWeek: number): number => {
    let count = 0;
    const date = new Date(year, month, 1);
    while (date.getMonth() === month) {
        if (date.getDay() === dayOfWeek) {
            count++;
        }
        date.setDate(date.getDate() + 1);
    }
    return count;
};
const dayNameToIndex: Record<DayOfWeek, number> = {
    domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6
};

// --- Child Components ---

const LineChart: React.FC<{ data: any[], lines: { key: string, name: string, color: string }[], showValues: boolean }> = ({ data, lines, showValues }) => {
    const [tooltip, setTooltip] = useState<{ x: number, y: number, monthData: any } | null>(null);
    const svgRef = React.useRef<SVGSVGElement>(null);

    const { points, maxValue, minValue, gridLines } = useMemo(() => {
        const width = 500;
        const height = 150;
        const padding = { top: 20, right: 20, bottom: 30, left: 50 };

        const allValues = data.flatMap(d => lines.map(line => d[line.key] || 0));
        const max = Math.max(...allValues, 0);
        const min = Math.min(...allValues, 0);
        
        const yRange = max - min;
        const maxValue = yRange === 0 ? max + 1 : max + yRange * 0.1;
        const minValue = yRange === 0 ? min - 1 : min - yRange * 0.1;

        const points = lines.map(line => {
            const pathPoints = data.map((d, i) => {
                const x = padding.left + i * ((width - padding.left - padding.right) / (data.length - 1));
                const y = padding.top + (height - padding.top - padding.bottom) * (1 - ((d[line.key] || 0) - minValue) / (maxValue - minValue));
                return { x, y, monthData: d };
            });
            const pathD = pathPoints.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x} ${p.y}`).join(' ');
            return { ...line, pathD, points: pathPoints };
        });
        
        const gridLineCount = 5;
        const gridLines = Array.from({ length: gridLineCount + 1 }).map((_, i) => {
            const value = minValue + (i / gridLineCount) * (maxValue - minValue);
            const y = padding.top + (height - padding.top - padding.bottom) * (1 - (i / gridLineCount));
            return { y, value };
        });

        return { points, maxValue, minValue, gridLines };
    }, [data, lines]);

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!svgRef.current) return;
        const svgRect = svgRef.current.getBoundingClientRect();
        const mouseX = e.clientX - svgRect.left;

        let closestPoint = null;
        let minDistance = Infinity;

        points[0].points.forEach(p => {
            const distance = Math.abs(mouseX - p.x);
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = p;
            }
        });

        if (closestPoint && minDistance < 20) {
            setTooltip({ x: closestPoint.x, y: e.clientY - svgRect.top, monthData: closestPoint.monthData });
        } else {
            setTooltip(null);
        }
    };
    
    const formatCurrency = (value: number) => showValues ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ ••••,••';

    return (
        <div className="p-4 border rounded-lg relative">
            <h4 className="font-bold text-zinc-700 mb-2">Saúde Financeira (Últimos 12 Meses)</h4>
            <svg ref={svgRef} viewBox="0 0 500 150" className="w-full" onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
                {gridLines.map(gl => (
                    <g key={gl.y}>
                        <line x1="50" y1={gl.y} x2="480" y2={gl.y} stroke="#e4e4e7" strokeWidth="1" />
                        <text x="45" y={gl.y + 3} textAnchor="end" fontSize="10" fill="#71717a">{showValues ? Math.round(gl.value / 1000) + 'k' : '•••'}</text>
                    </g>
                ))}
                
                {data.map((d, i) => (
                    <text key={d.monthName} x={50 + i * (430 / (data.length - 1))} y="140" textAnchor="middle" fontSize="10" fill="#71717a">{d.monthName.substring(0, 3)}</text>
                ))}

                {points.map(line => <path key={line.key} d={line.pathD} fill="none" stroke={line.color} strokeWidth="2.5" />)}

                {tooltip && (
                    <line x1={tooltip.x} y1="20" x2={tooltip.x} y2="120" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="4" />
                )}
            </svg>
            <div className="flex items-center justify-center gap-4 mt-2">
                {lines.map(line => (
                    <div key={line.key} className="flex items-center gap-2 text-sm">
                        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: line.color }}></div>{line.name}
                    </div>
                ))}
            </div>
             {tooltip && (
                <div className="absolute p-2 bg-zinc-800 text-white text-xs rounded-md shadow-lg pointer-events-none transition-opacity" style={{ top: `${tooltip.y + 10}px`, left: `${tooltip.x + 10}px` }}>
                    <p className="font-bold mb-1">{tooltip.monthData.monthName}</p>
                    {lines.map(line => (
                        <p key={line.key}><span className="font-semibold" style={{ color: line.color }}>● {line.name}:</span> {formatCurrency(tooltip.monthData[line.key] || 0)}</p>
                    ))}
                </div>
            )}
        </div>
    );
};

const StackedBarChart: React.FC<{ data: any[], categories: string[], title: string, showValues: boolean, colors: { [key: string]: string } }> = ({ data, categories, title, showValues, colors }) => {
    const maxValue = useMemo(() => {
        const totals = data.map(d => Object.values(d.values as Record<string, number>).reduce((sum, v) => sum + v, 0));
        return Math.max(...totals, 0) * 1.1 || 1;
    }, [data]);
    
    return (
        <div className="p-4 border rounded-lg">
            <h4 className="font-bold text-zinc-700 mb-4">{title}</h4>
            <div className="flex justify-between items-end h-64 gap-2 border-l border-b px-2">
                {data.map((monthData) => (
                    <div key={monthData.monthName} className="flex-1 flex flex-col items-center gap-1 group relative h-full">
                        <div className="w-8 h-full flex flex-col-reverse">
                            {categories.map(cat => {
                                const value = monthData.values[cat] || 0;
                                const height = (value / maxValue) * 100;
                                return (
                                    <div
                                        key={cat}
                                        style={{ height: `${height}%`, backgroundColor: colors[cat] || '#ccc' }}
                                        className="w-full group-hover:opacity-80 transition-opacity"
                                        title={showValues ? `${cat}: ${value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : cat}
                                    />
                                );
                            })}
                        </div>
                        <span className="text-xs font-medium text-zinc-500">{monthData.monthName.substring(0, 3)}</span>
                    </div>
                ))}
            </div>
             <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1 mt-4">
                {categories.map(cat => (
                     <div key={cat} className="flex items-center gap-2 text-xs"><div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colors[cat] || '#ccc' }}></div>{cat}</div>
                ))}
            </div>
        </div>
    );
};

const GrowthIndicator: React.FC<{ value: number, showValues: boolean }> = ({ value, showValues }) => {
    if (!isFinite(value) || isNaN(value)) {
        return <span className="text-zinc-500">-</span>;
    }
    const isGrowth = value > 0;
    const isDecline = value < 0;
    const color = isGrowth ? 'text-green-600' : isDecline ? 'text-red-600' : 'text-zinc-500';
    const Icon = isGrowth ? ArrowUpIcon : ArrowDownIcon;

    return (
        <div className={`flex items-center gap-1 text-xs font-bold ${color}`}>
            {isGrowth || isDecline ? <Icon className="h-3 w-3" /> : null}
            <span>{showValues ? `${value.toFixed(2)}%` : '••,••%'}</span>
        </div>
    );
};


// --- Main View Component ---
interface FinancialViewProps {
    onBack: () => void;
}

const FinancialView: React.FC<FinancialViewProps> = ({ onBack }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeTab, setActiveTab] = useState<'recebimentos' | 'pagamentos' | 'fluxoDeCaixa' | 'relatorios'>('recebimentos');
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    
    // FIX: Add states for firestore data
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
    const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);

    const [manualTransactions, setManualTransactions] = useState<any[]>([]);
    const [showValues, setShowValues] = useState(true);
    const [expenseCategories, setExpenseCategories] = useState<string[]>([
        'Aluguel', 'Luz', 'Água', 'Impostos', 'Marketing', 'Material de Escritório', 'Salário', 'Comissão', 'Repasse'
    ]);
     const [incomeCategories, setIncomeCategories] = useState<string[]>([
        'Créditos', 'Mensalidade', 'Venda de Material'
    ]);

    // FIX: Fetch data from firestore
    useEffect(() => {
        const unsubTransactions = onSnapshot(query(collection(db, "transactions")), snap => setTransactions(snap.docs.map(d => ({id: d.id, ...d.data()})) as Transaction[]));
        const unsubCollaborators = onSnapshot(query(collection(db, "collaborators")), snap => setCollaborators(snap.docs.map(d => ({id: d.id, ...d.data()})) as Collaborator[]));
        const unsubProfessionals = onSnapshot(query(collection(db, "professionals")), snap => setProfessionals(snap.docs.map(d => ({id: d.id, ...d.data()})) as Professional[]));
        const unsubStudents = onSnapshot(query(collection(db, "students")), snap => setStudents(snap.docs.map(d => ({id: d.id, ...d.data()})) as Student[]));
        const unsubClasses = onSnapshot(query(collection(db, "scheduledClasses")), snap => setScheduledClasses(snap.docs.map(d => ({id: d.id, ...d.data()})) as ScheduledClass[]));
        const unsubGroups = onSnapshot(query(collection(db, "classGroups")), snap => setClassGroups(snap.docs.map(d => ({id: d.id, ...d.data()})) as ClassGroup[]));
        return () => { unsubTransactions(); unsubCollaborators(); unsubProfessionals(); unsubStudents(); unsubClasses(); unsubGroups(); };
    }, []);

    const handleDateChange = (months: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + months);
            return newDate;
        });
    };
    
    const last12MonthsFinancialData = useMemo(() => {
        const allMonthsData = [];
        const baseDate = new Date(currentDate);

        for (let i = 11; i >= 0; i--) {
            const date = new Date(baseDate);
            date.setMonth(baseDate.getMonth() - i);
            const year = date.getFullYear();
            const month = date.getMonth();

            const automatedIncome = transactions
                .filter(t => { const d = new Date(t.date); return t.studentId && d.getFullYear() === year && d.getMonth() === month; })
                .map(t => ({
                    id: `income-${t.id}`, dueDate: t.date, paidDate: t.date, sourceDest: students.find(s => s.id === t.studentId)?.name || 'Aluno',
                    description: t.type === 'credit' ? `Compra de ${t.credits} créditos` : `Mensalidade - ${t.month}`, type: t.type === 'credit' ? t.paymentMethod : 'mensalidade',
                    category: t.type === 'credit' ? 'Créditos' : 'Mensalidade', installments: t.cardDetails?.installments, amount: t.amount, status: 'paid' as const
                }));

            const manualIncomesForMonth = manualTransactions.filter(t => {
                const d = new Date(t.dueDate); return t.transactionType === 'recebimento' && d.getFullYear() === year && d.getMonth() === month;
            });
            const incomeEntries = [...automatedIncome, ...manualIncomesForMonth];
            
            let autoExpenseEntries: any[] = [];
            collaborators.forEach(c => {
                if (c.remunerationType === 'fixed' && c.fixedSalary) {
                    autoExpenseEntries.push({ id: `expense-collab-${c.id}-${month}`, dueDate: new Date(year, month + 1, 5).toISOString().split('T')[0], paidDate: null, sourceDest: c.name, description: `Salário Fixo - ${c.role}`, type: 'pix', category: 'Salário', amount: c.fixedSalary, status: 'pending' as const });
                } else if (c.remunerationType === 'commission' && c.commissionPercentage) {
                    const totalRegistered = automatedIncome.filter(t => transactions.find(mt => `income-${mt.id}` === t.id)?.registeredById === c.id).reduce((sum, t) => sum + t.amount, 0);
                    const commission = (totalRegistered * c.commissionPercentage) / 100;
                    if (commission > 0) autoExpenseEntries.push({ id: `expense-collab-${c.id}-${month}`, dueDate: new Date(year, month + 1, 5).toISOString().split('T')[0], paidDate: null, sourceDest: c.name, description: `Comissão (${c.commissionPercentage}%)`, type: 'pix', category: 'Comissão', amount: commission, status: 'pending' as const });
                }
            });
            professionals.filter(p=>p.status === 'ativo').forEach(p => {
                const individualHours = scheduledClasses.filter(c => { const d = new Date(c.date); return c.professionalId === p.id && d.getMonth() === month && d.getFullYear() === year; }).reduce((total, c) => total + (c.duration / 60), 0);
                const groupHours = classGroups.filter(g => g.professionalId === p.id && g.status === 'active').reduce((total, g) => { let h = 0; const dur = g.creditsToDeduct; if (g.schedule.type === 'recurring' && g.schedule.days) { for (const day of Object.keys(g.schedule.days)) { const dayIndex = dayNameToIndex[day as DayOfWeek]; if (dayIndex !== undefined) { h += getDayOfWeekCount(year, month, dayIndex) * dur; } } } return total + h; }, 0);
                const earnings = (individualHours * (p.hourlyRateIndividual || 0)) + (groupHours * (p.hourlyRateGroup || 0));
                if (earnings > 0) autoExpenseEntries.push({ id: `expense-prof-${p.id}-${month}`, dueDate: new Date(year, month + 1, 5).toISOString().split('T')[0], paidDate: null, sourceDest: p.name, description: 'Pagamento Aulas', type: 'pix', category: 'Repasse', amount: earnings, status: 'pending' as const });
            });
            const manualExpensesForMonth = manualTransactions.filter(e => { const d = new Date(e.dueDate); return e.transactionType === 'pagamento' && d.getFullYear() === year && d.getMonth() === month; });
            const expenseEntries = [...autoExpenseEntries, ...manualExpensesForMonth];

            const incomeByCategory = incomeEntries.reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {} as Record<string,number>);
            const expensesByCategory = expenseEntries.reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {} as Record<string,number>);
            const totalIncome = incomeEntries.filter(t=>t.status==='paid').reduce((sum, t) => sum + t.amount, 0);
            const totalExpenses = expenseEntries.filter(t=>t.status==='paid').reduce((sum, t) => sum + t.amount, 0);

            allMonthsData.push({ month, year, monthName: new Date(year, month).toLocaleString('pt-BR', { month: 'long'}), incomeEntries, expenseEntries, incomeByCategory, expensesByCategory, totalIncome, totalExpenses });
        }
        
        let accumulatedBalance = 0; // Assume starts at 0 for the 12-month period
        return allMonthsData.map(data => {
            const operationalBalance = data.totalIncome - data.totalExpenses;
            const startingBalance = accumulatedBalance;
            accumulatedBalance += operationalBalance;
            return { ...data, startingBalance, operationalBalance, accumulatedBalance };
        });

    }, [currentDate, manualTransactions, transactions, students, collaborators, professionals, scheduledClasses, classGroups]);

    const { income, expenses, totalPaidIncome, totalPaidExpenses, balance } = useMemo(() => {
        const monthData = last12MonthsFinancialData.find(d => d.month === currentDate.getMonth() && d.year === currentDate.getFullYear()) || last12MonthsFinancialData[11];
        return {
            income: monthData.incomeEntries,
            expenses: monthData.expenseEntries,
            totalPaidIncome: monthData.totalIncome,
            totalPaidExpenses: monthData.totalExpenses,
            balance: monthData.operationalBalance
        };
    }, [currentDate, last12MonthsFinancialData]);

    const formatCurrency = (value: number | undefined) => {
        if (value === undefined) return '-';
        if (!showValues) return 'R$ ••••,••';
        const isNegative = value < 0;
        const formatted = Math.abs(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        return isNegative ? `(${formatted})` : formatted;
    };
    
    const formatNumber = (value: number | undefined) => {
        if (value === undefined) return '-';
        if (!showValues) return '••••,••';
        const isNegative = value < 0;
        const formatted = Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return isNegative ? `(${formatted})` : formatted;
    };
    
    const annualTotals = useMemo(() => {
        const totals = { totalIncome: 0, totalExpenses: 0, incomeByCategory: {} as Record<string, number>, expensesByCategory: {} as Record<string, number>, remuneration: 0 };
        for(const monthData of last12MonthsFinancialData) {
            totals.totalIncome += monthData.totalIncome;
            totals.totalExpenses += monthData.totalExpenses;
            for(const cat of incomeCategories) totals.incomeByCategory[cat] = (totals.incomeByCategory[cat] || 0) + (monthData.incomeByCategory[cat] || 0);
            for(const cat of expenseCategories) totals.expensesByCategory[cat] = (totals.expensesByCategory[cat] || 0) + (monthData.expensesByCategory[cat] || 0);
        }
        const remunerationCategories = ['Salário', 'Comissão', 'Repasse'];
        totals.remuneration = remunerationCategories.reduce((sum, cat) => sum + (totals.expensesByCategory[cat] || 0), 0);
        return totals;
    }, [last12MonthsFinancialData, incomeCategories, expenseCategories]);


    const handleAddTransaction = (data: any) => {
        const newTransaction = {
            id: `manual-${Date.now()}`,
            transactionType: data.transactionType,
            dueDate: data.dueDate,
            paidDate: data.paidDate,
            sourceDest: data.sourceDest,
            description: data.description,
            type: data.paymentMethod,
            category: data.category,
            installments: data.installments,
            fees: data.fees,
            amount: data.amount,
            status: data.paidDate ? 'paid' as const : 'pending' as const,
        };
        setManualTransactions(prev => [...prev, newTransaction]);

        const categoryList = data.transactionType === 'recebimento' ? incomeCategories : expenseCategories;
        const setCategoryList = data.transactionType === 'recebimento' ? setIncomeCategories : setExpenseCategories;
        if (!categoryList.includes(data.category)) {
            setCategoryList(prev => [...prev, data.category]);
        }
        setIsTransactionModalOpen(false);
    };

    const handleUpdateCategory = (type: 'income' | 'expenses', oldName: string, newName: string) => {
        const setCategories = type === 'income' ? setIncomeCategories : setExpenseCategories;
        const categories = type === 'income' ? incomeCategories : expenseCategories;
        if (!newName || newName === oldName || categories.includes(newName)) return;
        setCategories(prev => prev.map(c => (c === oldName ? newName : c)));
        const transactionTypeToUpdate = type === 'income' ? 'recebimento' : 'pagamento';
        setManualTransactions(prev => prev.map(t => (t.transactionType === transactionTypeToUpdate && t.category === oldName) ? { ...t, category: newName } : t));
    };

    const handleDeleteCategory = (type: 'income' | 'expenses', name: string) => {
        const transactionTypeToUpdate = type === 'income' ? 'recebimento' : 'pagamento';
        const isInUse = manualTransactions.some(t => t.transactionType === transactionTypeToUpdate && t.category === name);
        if (isInUse) {
            alert(`A categoria "${name}" está em uso e não pode ser excluída. Por favor, reatribua as transações desta categoria antes de excluí-la.`);
            return;
        }
        const setCategories = type === 'income' ? setIncomeCategories : setExpenseCategories;
        setCategories(prev => prev.filter(c => c !== name));
    };

    const handleCreateCategory = (type: 'income' | 'expenses', name: string) => {
        const setCategories = type === 'income' ? setIncomeCategories : setExpenseCategories;
        const categories = type === 'income' ? incomeCategories : expenseCategories;
        if (categories.some(cat => cat.toLowerCase() === name.toLowerCase())) {
            alert('Esta categoria já existe.');
            return;
        }
        setCategories(prev => [...prev, name].sort());
    };

    const renderTable = (data: typeof income | typeof expenses) => (
        <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-zinc-50">
                    <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Vencimento</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Realizado em</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Origem/Destino</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Descrição</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Tipo</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Categoria</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Parcelado</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500 uppercase">Valor</th>
                        <th className="relative px-4 py-2"><span className="sr-only">Ações</span></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-zinc-200">
                    {data.map(item => (
                        <tr key={item.id} className={`hover:bg-zinc-50 ${item.status === 'pending' ? 'bg-amber-50' : ''}`}>
                            <td className="px-4 py-3 text-sm text-zinc-600">{new Date(item.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                            <td className="px-4 py-3 text-sm text-zinc-600">
                                {item.paidDate ? new Date(item.paidDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : <span className="text-amber-600 font-semibold">Pendente</span>}
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-zinc-800">{item.sourceDest}</td>
                            <td className="px-4 py-3 text-sm text-zinc-600">{item.description}</td>
                            <td className="px-4 py-3 text-sm text-zinc-600 capitalize">{item.type}</td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${item.category === 'Mensalidade' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                    {item.category}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-600">{item.installments ? `${item.installments}x` : '-'}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-zinc-800">{formatCurrency(item.amount)}</td>
                            <td className="px-4 py-3 text-right">
                                <button className="text-secondary hover:text-secondary-dark font-semibold text-sm">Editar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
                 <tfoot className="bg-zinc-100">
                    <tr>
                        <td colSpan={7} className="px-4 py-3 text-sm text-right font-bold text-zinc-700">TOTAL</td>
                        <td colSpan={2} className="px-4 py-3 text-sm text-right font-bold text-zinc-900">{formatCurrency(data.reduce((sum, item) => sum + item.amount, 0))}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );

    const paymentMethodData = useMemo(() => {
        const methods = { 'Pix': [], 'Dinheiro': [], 'Cartão à vista': [], 'Cartão parcelado': [], 'Outro': [] };
        last12MonthsFinancialData.forEach(monthData => {
            const monthlyTotals = { 'Pix': 0, 'Dinheiro': 0, 'Cartão à vista': 0, 'Cartão parcelado': 0, 'Outro': 0 };
            monthData.incomeEntries.forEach(item => {
                if (item.type === 'pix') monthlyTotals['Pix'] += item.amount;
                else if (item.type === 'dinheiro') monthlyTotals['Dinheiro'] += item.amount;
                else if (item.type === 'cartao') {
                    if (item.installments && item.installments > 1) monthlyTotals['Cartão parcelado'] += item.amount;
                    else monthlyTotals['Cartão à vista'] += item.amount;
                } else if(item.type !== 'mensalidade') {
                    monthlyTotals['Outro'] += item.amount;
                }
            });
            for(const key of Object.keys(methods) as (keyof typeof methods)[]) {
                methods[key].push(monthlyTotals[key]);
            }
        });
        return methods;
    }, [last12MonthsFinancialData]);

    const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? Infinity : 0;
        return ((current - previous) / previous) * 100;
    };
    
    const growthTableData = useMemo(() => {
        const metrics = ['totalIncome', 'totalExpenses', 'operationalBalance', 'accumulatedBalance'];
        const labels: Record<string, string> = { totalIncome: 'Entradas', totalExpenses: 'Saídas', operationalBalance: 'Saldo Operacional', accumulatedBalance: 'Saldo Acumulado' };
        
        return metrics.map(metric => {
            const values = last12MonthsFinancialData.map((monthData, i) => {
                const previousMonthData = i > 0 ? last12MonthsFinancialData[i - 1] : null;
                const currentValue = (monthData as any)[metric];
                const previousValue = previousMonthData ? (previousMonthData as any)[metric] : 0;
                const growth = calculateGrowth(currentValue, previousValue);
                return { value: currentValue, growth };
            });
            return { label: labels[metric], values };
        });
    }, [last12MonthsFinancialData]);
    
    const categoryColors = useMemo(() => {
        const colors = ['#34d399', '#60a5fa', '#f87171', '#fbbf24', '#a78bfa', '#84cc16', '#2dd4bf', '#f472b6'];
        const allCategories = [...incomeCategories, ...expenseCategories];
        return allCategories.reduce((acc, cat, i) => {
            acc[cat] = colors[i % colors.length];
            return acc;
        }, {} as Record<string, string>);
    }, [incomeCategories, expenseCategories]);


    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view space-y-6">
            <header className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 transition-colors">
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <h2 className="text-2xl font-bold text-zinc-800">Painel Financeiro</h2>
                </div>
                 <div className="flex items-center gap-2">
                     <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-lg">
                        <button onClick={() => handleDateChange(-1)} className="p-2 rounded-md hover:bg-zinc-200"><ChevronLeftIcon /></button>
                        <span className="font-semibold text-lg text-zinc-800 w-48 text-center">{currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                        <button onClick={() => handleDateChange(1)} className="p-2 rounded-md hover:bg-zinc-200"><ChevronRightIcon /></button>
                    </div>
                     <button onClick={() => setIsCategoryModalOpen(true)} className="flex items-center justify-center gap-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-semibold py-2 px-4 rounded-lg transition-colors">
                        <span>Gerenciar Categorias</span>
                    </button>
                    <button onClick={() => setIsTransactionModalOpen(true)} className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105">
                        <PlusIcon />
                        <span>Registrar</span>
                    </button>
                 </div>
            </header>
            
            <main className="flex-grow overflow-y-auto space-y-8 pr-2">
                {(activeTab === 'recebimentos' || activeTab === 'pagamentos') && (
                    <section className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div className="bg-green-50/50 border-l-4 border-green-400 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-green-800">Total de Recebimentos</h3>
                            <p className="text-2xl font-bold text-green-700">{formatCurrency(totalPaidIncome)}</p>
                        </div>
                        <div className="bg-red-50/50 border-l-4 border-red-400 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-red-800">Total de Pagamentos</h3>
                            <p className="text-2xl font-bold text-red-700">{formatCurrency(totalPaidExpenses)}</p>
                        </div>
                        <div className={`${balance >= 0 ? 'bg-blue-50/50 border-blue-400' : 'bg-orange-50/50 border-orange-400'} border-l-4 p-4 rounded-lg`}>
                            <h3 className={`text-sm font-medium ${balance >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>Balanço do Mês</h3>
                            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{formatCurrency(balance)}</p>
                        </div>
                        <div className="flex justify-end">
                            <button onClick={() => setShowValues(!showValues)} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-secondary font-semibold p-2 rounded-lg hover:bg-zinc-100 transition-colors" title={showValues ? "Ocultar valores" : "Mostrar valores"}>
                                {showValues ? <EyeSlashIcon /> : <EyeIcon />}
                                <span>{showValues ? "Ocultar" : "Mostrar"} Valores</span>
                            </button>
                        </div>
                    </section>
                )}
                
                 {/* Tabs & Tables */}
                <section>
                    <div className="border-b mb-4">
                        <nav className="-mb-px flex space-x-6">
                             <button onClick={() => setActiveTab('recebimentos')} className={`py-2 px-1 border-b-2 font-semibold text-sm ${activeTab === 'recebimentos' ? 'border-secondary text-secondary' : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'}`}>Recebimentos</button>
                            <button onClick={() => setActiveTab('pagamentos')} className={`py-2 px-1 border-b-2 font-semibold text-sm ${activeTab === 'pagamentos' ? 'border-secondary text-secondary' : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'}`}>Pagamentos</button>
                            <button onClick={() => setActiveTab('fluxoDeCaixa')} className={`py-2 px-1 border-b-2 font-semibold text-sm ${activeTab === 'fluxoDeCaixa' ? 'border-secondary text-secondary' : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'}`}>Fluxo de Caixa</button>
                            <button onClick={() => setActiveTab('relatorios')} className={`py-2 px-1 border-b-2 font-semibold text-sm ${activeTab === 'relatorios' ? 'border-secondary text-secondary' : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'}`}>Relatórios</button>
                        </nav>
                    </div>

                    {activeTab === 'recebimentos' && renderTable(income)}
                    {activeTab === 'pagamentos' && renderTable(expenses)}
                    {activeTab === 'fluxoDeCaixa' && (
                         <div className="overflow-x-auto border rounded-lg">
                            <table className="min-w-full text-sm">
                                <thead className="bg-zinc-100">
                                    <tr>
                                        <th className="p-2 text-left font-semibold text-zinc-700 sticky left-0 bg-zinc-100 z-10 w-48">Descrição</th>
                                        {last12MonthsFinancialData.map(d => <th key={d.monthName + d.year} className="p-2 text-right font-semibold text-zinc-600 w-32">{d.monthName.substring(0,3)}</th>)}
                                        <th className="p-2 text-right font-bold text-zinc-800 bg-zinc-200 w-36">Total Anual</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200">
                                    <tr className="bg-zinc-50"><td className="p-2 font-semibold text-zinc-600 sticky left-0 bg-zinc-50 z-10">Saldo Inicial</td>
                                        {last12MonthsFinancialData.map((d,i) => <td key={i} className="p-2 text-right font-semibold text-zinc-600">{formatNumber(d.startingBalance)}</td>)}
                                        <td className="p-2 text-right font-bold bg-zinc-200">{formatNumber(last12MonthsFinancialData[0].startingBalance)}</td></tr>
                                    <tr className="bg-green-50"><td className="p-2 font-bold text-green-800 sticky left-0 bg-green-50 z-10">Entradas</td>
                                        {last12MonthsFinancialData.map((d,i) => <td key={i} className="p-2 text-right font-bold text-green-800">{formatNumber(d.totalIncome)}</td>)}
                                        <td className="p-2 text-right font-extrabold bg-green-100 text-green-800">{formatNumber(annualTotals.totalIncome)}</td></tr>
                                    {incomeCategories.map(cat => (<tr key={cat}><td className="p-2 pl-6 text-zinc-700 sticky left-0 bg-white z-10">{cat}</td>
                                        {last12MonthsFinancialData.map((d,i) => <td key={i} className="p-2 text-right text-zinc-700">{formatNumber(d.incomeByCategory[cat])}</td>)}
                                        <td className="p-2 text-right font-semibold bg-zinc-50">{formatNumber(annualTotals.incomeByCategory[cat])}</td></tr>))}
                                     <tr className="bg-red-50"><td className="p-2 font-bold text-red-800 sticky left-0 bg-red-50 z-10">Saídas</td>
                                        {last12MonthsFinancialData.map((d,i) => <td key={i} className="p-2 text-right font-bold text-red-800">{formatNumber(d.totalExpenses)}</td>)}
                                        <td className="p-2 text-right font-extrabold bg-red-100 text-red-800">{formatNumber(annualTotals.totalExpenses)}</td></tr>
                                    <tr><td className="p-2 pl-6 text-zinc-700 sticky left-0 bg-white z-10">Remuneração</td>
                                        {last12MonthsFinancialData.map((d,i) => {const r = ['Salário', 'Comissão', 'Repasse'].reduce((s, c) => s + (d.expensesByCategory[c] || 0), 0); return <td key={i} className="p-2 text-right text-zinc-700">{formatNumber(r)}</td>; })}
                                        <td className="p-2 text-right font-semibold bg-zinc-50">{formatNumber(annualTotals.remuneration)}</td></tr>
                                    {expenseCategories.filter(c => !['Salário', 'Comissão', 'Repasse'].includes(c)).map(cat => (<tr key={cat}><td className="p-2 pl-6 text-zinc-700 sticky left-0 bg-white z-10">{cat}</td>
                                        {last12MonthsFinancialData.map((d,i) => <td key={i} className="p-2 text-right text-zinc-700">{formatNumber(d.expensesByCategory[cat])}</td>)}
                                        <td className="p-2 text-right font-semibold bg-zinc-50">{formatNumber(annualTotals.expensesByCategory[cat])}</td></tr>))}
                                     <tr className="bg-zinc-50"><td className="p-2 font-semibold text-zinc-600 sticky left-0 bg-zinc-50 z-10">Saldo Operacional</td>
                                        {last12MonthsFinancialData.map((d,i) => <td key={i} className={`p-2 text-right font-semibold ${d.operationalBalance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{formatNumber(d.operationalBalance)}</td>)}
                                        <td className="p-2 text-right font-bold bg-zinc-200">{formatNumber(annualTotals.totalIncome - annualTotals.totalExpenses)}</td></tr>
                                     <tr className="bg-zinc-100"><td className="p-2 font-bold text-zinc-800 sticky left-0 bg-zinc-100 z-10">Saldo Acumulado</td>
                                        {last12MonthsFinancialData.map((d,i) => <td key={i} className={`p-2 text-right font-bold ${d.accumulatedBalance >= 0 ? 'text-zinc-800' : 'text-orange-800'}`}>{formatNumber(d.accumulatedBalance)}</td>)}
                                        <td className="p-2 text-right font-extrabold bg-zinc-200">{formatNumber(last12MonthsFinancialData[11]?.accumulatedBalance)}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                    {activeTab === 'relatorios' && (
                        <div className="space-y-6">
                            <LineChart data={last12MonthsFinancialData} lines={[
                                { key: 'totalIncome', name: 'Entradas', color: '#34d399' },
                                { key: 'totalExpenses', name: 'Saídas', color: '#f87171' },
                                { key: 'operationalBalance', name: 'Saldo Operacional', color: '#60a5fa' },
                                { key: 'accumulatedBalance', name: 'Saldo Acumulado', color: '#a78bfa' },
                            ]} showValues={showValues} />
                            
                            <div className="p-4 border rounded-lg overflow-x-auto">
                                <h4 className="font-bold text-zinc-700 mb-4">Recebimentos por Forma de Pagamento</h4>
                                <table className="min-w-full text-sm">
                                    <thead className="bg-zinc-50">
                                        <tr>
                                            <th className="p-2 text-left font-semibold text-zinc-600 sticky left-0 bg-zinc-50">Forma de Pagamento</th>
                                            {last12MonthsFinancialData.map(d => <th key={d.monthName + d.year} className="p-2 text-right font-semibold text-zinc-600">{d.monthName.substring(0, 3)}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100">
                                        {Object.entries(paymentMethodData).map(([method, values]) => (
                                            <tr key={method}>
                                                <td className="p-2 font-semibold text-zinc-800 sticky left-0 bg-white">{method}</td>
                                                {values.map((val, i) => <td key={i} className="p-2 text-right text-zinc-700">{formatNumber(val)}</td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <StackedBarChart title="Variação de Receitas por Categoria" categories={incomeCategories} colors={categoryColors} showValues={showValues} data={last12MonthsFinancialData.map(d => ({ monthName: d.monthName, values: d.incomeByCategory }))} />
                                <StackedBarChart title="Variação de Despesas por Categoria" categories={expenseCategories} colors={categoryColors} showValues={showValues} data={last12MonthsFinancialData.map(d => ({ monthName: d.monthName, values: d.expensesByCategory }))} />
                             </div>

                             <div className="p-4 border rounded-lg overflow-x-auto">
                                <h4 className="font-bold text-zinc-700 mb-4">Tabela de Crescimento Mensal</h4>
                                <table className="min-w-full text-sm">
                                    <thead className="bg-zinc-50">
                                        <tr>
                                            <th className="p-2 text-left font-semibold text-zinc-600 sticky left-0 bg-zinc-50">Métrica</th>
                                            {last12MonthsFinancialData.map(d => <th key={d.monthName+d.year} className="p-2 text-center font-semibold text-zinc-600">{d.monthName.substring(0, 3)}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100">
                                        {growthTableData.map(row => (
                                            <tr key={row.label}>
                                                <td className="p-2 font-semibold text-zinc-800 sticky left-0 bg-white">{row.label}</td>
                                                {row.values.map((cell, i) => (
                                                    <td key={i} className="p-2 text-center">
                                                        <GrowthIndicator value={cell.growth} showValues={showValues} />
                                                        <span className="text-zinc-500">{formatNumber(cell.value)}</span>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                         </div>
                    )}

                </section>
            </main>
             <AddTransactionModal
                isOpen={isTransactionModalOpen} onClose={() => setIsTransactionModalOpen(false)} onSave={handleAddTransaction}
                incomeCategories={incomeCategories} expenseCategories={expenseCategories} students={students} professionals={professionals} collaborators={collaborators}
            />
            <ManageCategoriesModal
                isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} categories={{ income: incomeCategories, expenses: expenseCategories }}
                onUpdate={handleUpdateCategory} onDelete={handleDeleteCategory} onCreate={handleCreateCategory}
            />
        </div>
    );
};

export default FinancialView;
