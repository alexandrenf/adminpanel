"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "../../components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { 
    Users, 
    Plus, 
    Edit, 
    Trash2, 
    Image as ImageIcon,
    UserPlus
} from "lucide-react";
import { api } from "~/trpc/react";

type TimeRegional = {
    id: number;
    name: string;
    type: string;
};

type MembroTime = {
    id: number;
    name: string;
    role: string;
    timeID: number;
    imageLink: string | null;
};

type TimesTableProps = {
    type: string;
    label: string;
};

export default function TimesTable({ type, label }: TimesTableProps) {
    const router = useRouter();
    const [time, setTime] = useState<TimeRegional[]>([]);
    const [membros, setMembros] = useState<MembroTime[]>([]);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const { data: timeData, error: timeError, refetch: refetchTime } = api.times.getByType.useQuery({ type });

    useEffect(() => {
        if (timeData) {
            setTime(timeData);
            if (timeData.length > 0) {
                const firstTime = timeData[0];
                if (firstTime && firstTime.membros) {
                    setMembros(firstTime.membros);
                }
            }
        }
    }, [timeData]);

    const deleteMutation = api.times.delete.useMutation({
        onSuccess: () => {
            refetchTime();
        },
        onError: (error) => {
            setDeleteError(error.message);
        },
    });

    const handleDelete = async (id: number) => {
        await deleteMutation.mutateAsync({ id });
    };

    const handleEdit = (id: number) => {
        router.push(`/times/${type}/create?id=${id}&edit=true`);
    };

    const handleAdd = () => {
        router.push(`/times/${type}/create`);
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    if (timeError) {
        return (
            <Card className="w-full">
                <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar dados</h3>
                        <p className="text-gray-600">Não foi possível carregar os dados do time.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                        <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                            {label}
                        </h2>
                        <p className="text-gray-600">Gerencie os membros do time</p>
                    </div>
                </div>
                <Button 
                    onClick={handleAdd}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Adicionar Membro
                </Button>
            </div>

            {/* Members Table */}
            <Card className="shadow-lg border-0">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        <span>Membros do Time</span>
                        <Badge variant="secondary" className="ml-2">
                            {membros.length} {membros.length === 1 ? 'membro' : 'membros'}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {membros.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum membro encontrado</h3>
                            <p className="text-gray-600 mb-4">Este time ainda não possui membros cadastrados.</p>
                            <Button onClick={handleAdd} variant="outline">
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar primeiro membro
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-lg border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead className="font-semibold">Membro</TableHead>
                                        <TableHead className="font-semibold">Cargo</TableHead>
                                        <TableHead className="font-semibold">Foto</TableHead>
                                        <TableHead className="font-semibold text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {membros.map((membro) => (
                                        <TableRow key={membro.id} className="hover:bg-gray-50/50 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center space-x-3">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={membro.imageLink || ""} alt={membro.name} />
                                                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                                                            {getInitials(membro.name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{membro.name}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-medium">
                                                    {membro.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {!membro.imageLink && (
                                                    <div className="flex items-center space-x-2">
                                                        <ImageIcon className="w-4 h-4 text-gray-400" />
                                                        <span className="text-sm text-gray-500">Não disponível</span>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(membro.id)}
                                                        className="hover:bg-blue-50 hover:border-blue-200"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="hover:bg-red-50 hover:border-red-200 text-red-600 hover:text-red-700"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    {deleteError ? (
                                                                        <span className="text-red-600">{deleteError}</span>
                                                                    ) : (
                                                                        <>
                                                                            Tem certeza que deseja excluir <strong>{membro.name}</strong>? 
                                                                            Esta ação não pode ser desfeita.
                                                                        </>
                                                                    )}
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleDelete(membro.id)}
                                                                    className="bg-red-600 hover:bg-red-700"
                                                                >
                                                                    Excluir
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
