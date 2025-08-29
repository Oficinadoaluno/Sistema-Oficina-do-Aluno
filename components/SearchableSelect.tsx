import React, { useState, useMemo, useEffect, useRef } from 'react';

const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";

const SearchableSelect: React.FC<{
    options: { value: string | number; label: string }[];
    value: string | number;
    onChange: (value: string) => void;
    placeholder: string;
}> = ({ options, value, onChange, placeholder }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedLabel = useMemo(() => options.find(o => o.value === value)?.label || '', [options, value]);

    const filteredOptions = useMemo(() => 
        options.filter(o => o.label.toLowerCase().includes(searchTerm.toLowerCase())), 
    [options, searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <input
                type="text"
                className={inputStyle}
                value={isOpen ? searchTerm : selectedLabel}
                onChange={e => setSearchTerm(e.target.value)}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                autoComplete="off"
            />
            {isOpen && (
                <ul className="absolute z-20 w-full bg-white border border-zinc-300 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                    {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                        <li
                            key={opt.value}
                            className="px-3 py-2 cursor-pointer hover:bg-zinc-100"
                            onMouseDown={() => {
                                onChange(String(opt.value));
                                setIsOpen(false);
                                setSearchTerm('');
                            }}
                        >
                            {opt.label}
                        </li>
                    )) : <li className="px-3 py-2 text-zinc-500">Nenhum resultado</li>}
                </ul>
            )}
        </div>
    );
};

export default SearchableSelect;
