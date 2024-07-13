import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, Button, Paper } from '@mui/material';

interface GestaoTableProps {
    gestoes: Array<{ id: number; yearStart: number; yearEnd: number }>;
    onDelete: (id: number) => void;
}

const GestaoTable: React.FC<GestaoTableProps> = ({ gestoes, onDelete }) => {
    return (
        <Paper>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Ano de Início</TableCell>
                        <TableCell>Ano de Fim</TableCell>
                        <TableCell>Ações</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {gestoes.map((gestao) => (
                        <TableRow key={gestao.id}>
                            <TableCell>{gestao.yearStart}</TableCell>
                            <TableCell>{gestao.yearEnd}</TableCell>
                            <TableCell>
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    onClick={() => onDelete(gestao.id)}
                                >
                                    Deletar
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Paper>
    );
};

export default GestaoTable;
