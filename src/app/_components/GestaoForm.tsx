import React, { useState } from 'react';
import { TextField, Box, Button } from '@mui/material';

interface GestaoFormProps {
    onSave: (data: { yearStart: number; yearEnd: number }) => void;
}

const GestaoForm: React.FC<GestaoFormProps> = ({ onSave }) => {
    const [yearStart, setYearStart] = useState('');
    const [yearEnd, setYearEnd] = useState('');

    const handleSave = () => {
        onSave({ yearStart: parseInt(yearStart), yearEnd: parseInt(yearEnd) });
        setYearStart('');
        setYearEnd('');
    };

    return (
        <Box display="flex" alignItems="center" mb={2}>
            <TextField
                label="Ano de Início"
                value={yearStart}
                onChange={(e) => setYearStart(e.target.value)}
                type="number"
                sx={{ marginRight: 2 }}
            />
            <TextField
                label="Ano de Fim"
                value={yearEnd}
                onChange={(e) => setYearEnd(e.target.value)}
                type="number"
                sx={{ marginRight: 2 }}
            />
            <Button onClick={handleSave} color="primary" variant="contained">
                Criar Gestão
            </Button>
        </Box>
    );
};

export default GestaoForm;
