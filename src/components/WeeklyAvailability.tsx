import React, { useState } from 'react';
import { DayOfWeek, WeeklyAvailability } from '../types';

const days: { key: DayOfWeek; label: string }[] = [
    { key: 'segunda', label: 'Seg' },
    { key: 'terca', label: 'Ter' },
    { key: 'quarta', label: 'Qua' },
    { key: 'quinta', label: 'Qui' },
    { key: 'sexta', label: 'Sex' },
    { key: 'sabado', label: 'Sáb' },
    { key: 'domingo', label: 'Dom' },
];

// 08:00 to 22:00
const timeSlots = Array.from({ length: 15 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`); 

interface WeeklyAvailabilityProps {
    initialAvailability: WeeklyAvailability;
    onSave: (newAvailability: WeeklyAvailability) => void;
}

const WeeklyAvailabilityComponent: React.FC<WeeklyAvailabilityProps> = ({ initialAvailability, onSave }) => {
    const [availability, setAvailability] = useState<WeeklyAvailability>(initialAvailability || {});
    const [isDirty, setIsDirty] = useState(false);

    const handleSlotClick = (day: DayOfWeek, time: string) => {
        const dayAvailability = availability[day] || [];
        const isAvailable = dayAvailability.includes(time);
        
        let newDayAvailability: string[];
        if (isAvailable) {
            newDayAvailability = dayAvailability.filter(t => t !== time);
        } else {
            newDayAvailability = [...dayAvailability, time].sort();
        }

        setAvailability(prev => ({
            ...prev,
            [day]: newDayAvailability,
        }));
        setIsDirty(true);
    };

    const handleSaveClick = () => {
        onSave(availability);
        setIsDirty(false);
    };

    return (
        <div className="bg-zinc-50 p-4 rounded-lg">
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="p-2 border-b-2 text-sm font-semibold text-zinc-600 text-left w-24">Horário</th>
                            {days.map(day => (
                                <th key={day.key} className="p-2 border-b-2 text-sm font-semibold text-zinc-600 text-center">{day.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {timeSlots.map(time => (
                            <tr key={time}>
                                <td className="p-2 border-b text-sm font-medium text-zinc-500 text-center">{time}</td>
                                {days.map(day => {
                                    const isAvailable = availability[day.key]?.includes(time) || false;
                                    return (
                                        <td key={day.key} className="border">
                                            <button
                                                onClick={() => handleSlotClick(day.key, time)}
                                                className={`w-full h-6 transition-colors duration-150 ${isAvailable ? 'bg-secondary/80 hover:bg-secondary' : 'bg-white hover:bg-zinc-100'}`}
                                                aria-label={`Marcar ${day.label} às ${time} como ${isAvailable ? 'indisponível' : 'disponível'}`}
                                            >
                                                &nbsp;
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isDirty && (
                <div className="mt-4 flex justify-end">
                    <button 
                        onClick={handleSaveClick}
                        className="py-2 px-6 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors transform hover:scale-105"
                    >
                        Salvar Disponibilidade
                    </button>
                </div>
            )}
        </div>
    );
};

export default WeeklyAvailabilityComponent;