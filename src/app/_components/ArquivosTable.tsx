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
import { Badge } from "../../components/ui/badge";
import { 
    FileText, 
    Plus, 
    Edit, 
    Trash2, 
    Image as ImageIcon,
    Calendar,
    User,
    Download,
    ExternalLink
} from "lucide-react";
import { api } from "~/trpc/react";

type Arquivo = {
    id: number;
    type: string;
    title: string;
    date: Date;
    author: string;
    imageLink: string | null;
    fileLink: string | null;
};

type ArquivosTableProps = {
    type: string;
    label: string;
};

export default function ArquivosTable({ type, label }: ArquivosTableProps) {
    const router = useRouter();
    const [arquivos, setArquivos] = useState<Arquivo[]>([]);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const { data, error, refetch } = api.arquivo.getByType.useQuery({ type }, { enabled: true });

    useEffect(() => {
        if (data) {
            setArquivos(data);
        }
    }, [data]);

    const deleteMutation = api.arquivo.delete.useMutation({
        onSuccess: () => {
            refetch();
        },
        onError: (error) => {
            setDeleteError(error.message);
        },
    });

    const handleDelete = async (id: number) => {
        setDeleteError(null);
        await deleteMutation.mutateAsync({ id });
    };

    const handleEdit = (id: number) => {
        router.push(`/documentos/${type}/create?id=${id}&edit=true`);
    };

    const handleAdd = () => {
        router.push(`/documentos/${type}/create`);
    };

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar dados</h3>
                <p className="text-red-600">Ocorreu um erro ao carregar os arquivos.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                        <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                            {label}
                        </h2>
                        <p className="text-gray-600">Gerencie os arquivos de {label.toLowerCase()}</p>
                    </div>
                </div>
                <Button 
                    onClick={handleAdd}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar {label}
                </Button>
            </div>

            {/* Files Table */}
            <Card className="shadow-lg border-0">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span>Lista de Arquivos</span>
                        <Badge variant="secondary" className="ml-2">
                            {arquivos?.length || 0} {(arquivos?.length || 0) === 1 ? 'arquivo' : 'arquivos'}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!arquivos || arquivos.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum arquivo encontrado</h3>
                            <p className="text-gray-600 mb-4">Ainda não há arquivos de {label.toLowerCase()} cadastrados no sistema.</p>
                            <Button onClick={handleAdd} variant="outline">
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar primeiro arquivo
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-lg border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead className="font-semibold">Título</TableHead>
                                        <TableHead className="font-semibold">Data</TableHead>
                                        <TableHead className="font-semibold">Autor</TableHead>
                                        <TableHead className="font-semibold">Imagem</TableHead>
                                        <TableHead className="font-semibold">Arquivo</TableHead>
                                        <TableHead className="font-semibold text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {arquivos.map((row) => (
                                        <TableRow key={row.id} className="hover:bg-gray-50/50 transition-colors">
                                            <TableCell>
                                                <div className="max-w-xs">
                                                    <p className="font-medium text-gray-900 truncate" title={row.title}>
                                                        {row.title}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm">
                                                        {new Date(row.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    <User className="w-4 h-4 text-gray-400" />
                                                    <span className="font-medium">{row.author}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {row.imageLink ? (
                                                    <div className="flex items-center space-x-2">
                                                        <img 
                                                            src={row.imageLink} 
                                                            alt={row.title} 
                                                            className="w-12 h-12 object-cover rounded-lg border"
                                                            loading="lazy" 
                                                        />
                                                        <div className="flex items-center space-x-1">
                                                            <ImageIcon className="w-4 h-4 text-green-600" />
                                                            <span className="text-xs text-green-600 font-medium">Disponível</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center space-x-2">
                                                        <div className="w-12 h-12 bg-gray-100 rounded-lg border flex items-center justify-center">
                                                            <ImageIcon className="w-6 h-6 text-gray-400" />
                                                        </div>
                                                        <span className="text-xs text-gray-500">Sem imagem</span>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {row.fileLink ? (
                                                    <a 
                                                        href={row.fileLink} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                        <span>Download</span>
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-gray-500">Sem arquivo</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(row.id)}
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
                                                                        <div className="space-y-2">
                                                                            <span className="text-red-600">{deleteError}</span>
                                                                            <p>Ocorreu um erro ao tentar excluir o arquivo.</p>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            Tem certeza que deseja excluir o arquivo <strong>&ldquo;{row.title}&rdquo;</strong>? 
                                                                            Esta ação não pode ser desfeita.
                                                                        </>
                                                                    )}
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel onClick={() => setDeleteError(null)}>
                                                                    Cancelar
                                                                </AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleDelete(row.id)}
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
