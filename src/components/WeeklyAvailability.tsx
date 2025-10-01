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

// 08:00 to 21:30 in 30-minute increments
const timeSlots = Array.from({ length: (22 - 8) * 2 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

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
                                        <td key={day.key} className="p-0 border align-middle text-center">
                                            <label className="w-full h-full flex items-center justify-center p-1.5 cursor-pointer hover:bg-zinc-200/50 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={isAvailable}
                                                    onChange={() => handleSlotClick(day.key, time)}
                                                    className="h-4 w-4 rounded text-secondary focus:ring-secondary cursor-pointer"
                                                    aria-label={`Disponibilidade para ${day.label} às ${time}`}
                                                />
                                            </label>
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
