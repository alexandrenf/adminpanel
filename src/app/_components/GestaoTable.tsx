import React from 'react';
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../components/ui/table";
import { Trash2 } from "lucide-react";

interface GestaoTableProps {
    gestoes: Array<{ id: number; yearStart: number; yearEnd: number }>;
    onDelete: (id: number) => void;
}

const GestaoTable: React.FC<GestaoTableProps> = ({ gestoes, onDelete }) => {
    return (
        <Card className="mt-6">
            <CardContent className="p-0">
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="font-semibold">Ano de Início</TableHead>
                                <TableHead className="font-semibold">Ano de Fim</TableHead>
                                <TableHead className="font-semibold text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {gestoes.map((gestao) => (
                                <TableRow key={gestao.id} className="hover:bg-gray-50/50 transition-colors">
                                    <TableCell className="font-medium">{gestao.yearStart}</TableCell>
                                    <TableCell className="font-medium">{gestao.yearEnd}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onDelete(gestao.id)}
                                            className="hover:bg-red-50 hover:border-red-200 text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Deletar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

export default GestaoTable;
