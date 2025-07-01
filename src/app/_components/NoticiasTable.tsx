"use client"

import { useRouter } from "next/navigation";
import { useState } from "react";
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
    Newspaper, 
    Plus, 
    Edit, 
    Trash2, 
    Image as ImageIcon,
    Calendar,
    User,
    FileText,
    Search,
    RefreshCw,
    CheckCircle,
    XCircle,
    Info
} from "lucide-react";
import { api } from "~/trpc/react";
import { useToast } from "../../components/ui/use-toast";

export default function NoticiasTable() {
    const router = useRouter();
    const { toast } = useToast();
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const { data: noticiasData, refetch } = api.noticias.getAll.useQuery();
    const { data: algoliaStats, refetch: refetchAlgoliaStats } = api.noticias.getAlgoliaStats.useQuery();

    // Sort noticias by date (newest first)
    const noticias = noticiasData?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const deleteMutation = api.noticias.delete.useMutation({
        onSuccess: () => {
            refetch();
        },
        onError: (error) => {
            setDeleteError(error.message);
        }
    });

    const deleteAnywayMutation = api.noticias.deleteAnyway.useMutation({
        onSuccess: () => {
            refetch();
        }
    });

    const syncToAlgoliaMutation = api.noticias.syncToAlgolia.useMutation({
        onSuccess: (result) => {
            toast({
                title: "Sync Successful",
                description: result.message,
                variant: "default",
            });
            refetchAlgoliaStats();
        },
        onError: (error) => {
            toast({
                title: "Sync Failed",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    const handleDelete = async (id: number) => {
        setDeleteError(null);
        await deleteMutation.mutateAsync({ id });
    };

    const handleDeleteAnyway = async (id: number) => {
        await deleteAnywayMutation.mutateAsync({ id });
    };

    const handleEdit = (id: number) => {
        router.push(`/noticias/create?id=${id}`);
    };

    const handleAdd = () => {
        router.push("/noticias/create");
    };

    const handleSyncToAlgolia = () => {
        syncToAlgoliaMutation.mutate();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                        <Newspaper className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                            Notícias
                        </h2>
                        <p className="text-gray-600">Gerencie as notícias do sistema</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <Button 
                        onClick={handleSyncToAlgolia}
                        disabled={syncToAlgoliaMutation.isPending}
                        variant="outline"
                        className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200 hover:border-green-300"
                    >
                        {syncToAlgoliaMutation.isPending ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Search className="w-4 h-4 mr-2" />
                        )}
                        Sincronizar Algolia
                    </Button>
                    <Button 
                        onClick={handleAdd}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Notícia
                    </Button>
                </div>
            </div>

            {/* Algolia Status Card */}
            <Card className="shadow-sm border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-lg">
                        <Search className="w-5 h-5 text-blue-600" />
                        <span>Status da Busca Algolia</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-2">
                                {algoliaStats?.indexExists ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-red-600" />
                                )}
                                <span className="text-sm font-medium">
                                    Index: {algoliaStats?.indexName || 'noticias_index'}
                                </span>
                            </div>
                            <Badge variant={algoliaStats?.indexExists ? "default" : "destructive"}>
                                {algoliaStats?.indexExists ? "Ativo" : "Não Configurado"}
                            </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Info className="w-4 h-4 text-blue-600" />
                            <span className="text-sm">
                                Total de notícias: <strong>{noticias?.length || 0}</strong>
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-purple-600" />
                            <span className="text-sm">
                                URL Pattern: <code className="bg-gray-100 px-1 rounded text-xs">
                                    {algoliaStats?.urlPattern}
                                </code>
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Search className="w-4 h-4 text-green-600" />
                            <span className="text-sm">
                                <Badge variant="secondary" className="text-xs">
                                    Conteúdo Completo
                                </Badge>
                            </span>
                        </div>
                    </div>
                    
                    {algoliaStats?.message && (
                        <div className="text-sm text-gray-600 bg-yellow-50 p-2 rounded border-l-2 border-yellow-400">
                            <Info className="w-4 h-4 inline mr-1" />
                            {algoliaStats.message}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* News Table */}
            <Card className="shadow-lg border-0">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span>Lista de Notícias</span>
                        <Badge variant="secondary" className="ml-2">
                            {noticias?.length || 0} {(noticias?.length || 0) === 1 ? 'notícia' : 'notícias'}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!noticias || noticias.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Newspaper className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma notícia encontrada</h3>
                            <p className="text-gray-600 mb-4">Ainda não há notícias cadastradas no sistema.</p>
                            <Button onClick={handleAdd} variant="outline">
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar primeira notícia
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-lg border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead className="font-semibold">Data</TableHead>
                                        <TableHead className="font-semibold">Autor</TableHead>
                                        <TableHead className="font-semibold">Título</TableHead>
                                        <TableHead className="font-semibold">Resumo</TableHead>
                                        <TableHead className="font-semibold">Status</TableHead>
                                        <TableHead className="font-semibold">Imagem</TableHead>
                                        <TableHead className="font-semibold text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {noticias?.map((row: any) => (
                                        <TableRow key={row.id} className="hover:bg-gray-50/50 transition-colors">
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
                                                <div className="max-w-xs">
                                                    <p className="font-medium text-gray-900 truncate" title={row.title}>
                                                        {row.title}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-sm">
                                                    <p className="text-sm text-gray-600 line-clamp-2" title={row.summary}>
                                                        {row.summary}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge 
                                                    variant={row.rascunho ? "secondary" : "default"}
                                                    className={row.rascunho ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : "bg-green-100 text-green-700 hover:bg-green-200"}
                                                >
                                                    {row.rascunho ? "Rascunho" : "Publicado"}
                                                </Badge>
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
                                                                            <p>Deseja forçar a exclusão mesmo assim?</p>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            Tem certeza que deseja excluir a notícia <strong>&ldquo;{row.title}&rdquo;</strong>? 
                                                                             Esta ação não pode ser desfeita.
                                                                        </>
                                                                    )}
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel onClick={() => setDeleteError(null)}>
                                                                    Cancelar
                                                                </AlertDialogCancel>
                                                                {deleteError ? (
                                                                    <AlertDialogAction
                                                                        onClick={() => handleDeleteAnyway(row.id)}
                                                                        className="bg-red-600 hover:bg-red-700"
                                                                    >
                                                                        Forçar Exclusão
                                                                    </AlertDialogAction>
                                                                ) : (
                                                                    <AlertDialogAction
                                                                        onClick={() => handleDelete(row.id)}
                                                                        className="bg-red-600 hover:bg-red-700"
                                                                    >
                                                                        Excluir
                                                                    </AlertDialogAction>
                                                                )}
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
