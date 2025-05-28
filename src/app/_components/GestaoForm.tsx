import React, { useState } from 'react';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Plus } from "lucide-react";

interface GestaoFormProps {
    onSave: (data: { yearStart: number; yearEnd: number }) => void;
}

const GestaoForm: React.FC<GestaoFormProps> = ({ onSave }) => {
    const [yearStart, setYearStart] = useState('');
    const [yearEnd, setYearEnd] = useState('');

    const handleSave = () => {
        if (!yearStart || !yearEnd) {
            alert('Por favor, preencha todos os campos');
            return;
        }
        onSave({ yearStart: parseInt(yearStart), yearEnd: parseInt(yearEnd) });
        setYearStart('');
        setYearEnd('');
    };

    return (
        <div className="flex flex-col space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                    <Label htmlFor="yearStart">Ano de Início</Label>
                    <Input
                        id="yearStart"
                        type="number"
                        value={yearStart}
                        onChange={(e) => setYearStart(e.target.value)}
                        placeholder="Ex: 2023"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="yearEnd">Ano de Fim</Label>
                    <Input
                        id="yearEnd"
                        type="number"
                        value={yearEnd}
                        onChange={(e) => setYearEnd(e.target.value)}
                        placeholder="Ex: 2024"
                    />
                </div>
                <Button 
                    onClick={handleSave} 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Gestão
                </Button>
            </div>
        </div>
    );
};

export default GestaoForm;
