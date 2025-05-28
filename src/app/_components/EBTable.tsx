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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { 
    Users, 
    Plus, 
    Edit, 
    Trash2, 
    Image as ImageIcon,
    Mail,
    ArrowUpDown,
    Loader2
} from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from '~/app/_components/SortableItem';
import { api } from "~/trpc/react";

type Eb = {
    id: number;
    role: string;
    acronym: string | null;
    name: string;
    email: string;
    imageLink: string | null;
    order: number;
};

export default function EbTable() {
    const router = useRouter();
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [orderModalOpen, setOrderModalOpen] = useState(false);
    const [ebOrder, setEbOrder] = useState<Eb[]>([]);
    const { data: eb, refetch } = api.eb.getAll.useQuery();

    const deleteMutation = api.eb.delete.useMutation({
        onSuccess: () => {
            refetch();
        },
        onError: (error) => {
            setDeleteError(error.message);
        }
    });

    const updateOrderMutation = api.eb.updateOrder.useMutation({
        onSuccess: () => {
            refetch();
        },
        onError: (error) => {
            console.error(error);
        }
    });

    const deleteAnywayMutation = api.eb.deleteAnyway.useMutation({
        onSuccess: () => {
            refetch();
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
        router.push(`/eb/create?id=${id}`);
    };

    const handleAdd = () => {
        router.push("/eb/create");
    };

    const openOrderModal = () => {
        if (eb) {
            setEbOrder(eb.map(item => ({ id: item.id, name: item.name, role: item.role, order: item.order, acronym: item.acronym, email: item.email, imageLink: item.imageLink })));
            setOrderModalOpen(true);
        }
    };

    const closeOrderModal = () => {
        setOrderModalOpen(false);
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: any) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setEbOrder((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);

                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleUpdateOrder = async () => {
        const newOrder = ebOrder.map((item, index) => ({ id: item.id, order: index + 1 }));
        await updateOrderMutation.mutateAsync(newOrder);
        closeOrderModal();
    };

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
                            Executiva Brasileira
                        </h2>
                        <p className="text-gray-600">Gerencie os membros da executiva brasileira</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <Button 
                        onClick={handleAdd}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Novo EB
                    </Button>
                    <Button
                        onClick={openOrderModal}
                        disabled={!eb || eb.length === 0}
                        variant="outline"
                        className="hover:bg-blue-50 hover:border-blue-200"
                    >
                        <ArrowUpDown className="w-4 h-4 mr-2" />
                        Reordenar
                    </Button>
                </div>
            </div>

            {/* EB Table */}
            <Card className="shadow-lg border-0">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        <span>Lista da Executiva Brasileira</span>
                        <Badge variant="secondary" className="ml-2">
                            {eb?.length || 0} {(eb?.length || 0) === 1 ? 'membro' : 'membros'}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!eb || eb.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum membro encontrado</h3>
                            <p className="text-gray-600 mb-4">Ainda não há membros da executiva brasileira cadastrados no sistema.</p>
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
                                        <TableHead className="font-semibold">Cargo</TableHead>
                                        <TableHead className="font-semibold">Sigla</TableHead>
                                        <TableHead className="font-semibold">Nome</TableHead>
                                        <TableHead className="font-semibold">Email</TableHead>
                                        <TableHead className="font-semibold">Imagem</TableHead>
                                        <TableHead className="font-semibold">Ordem</TableHead>
                                        <TableHead className="font-semibold text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {eb?.map((row: Eb) => (
                                        <TableRow key={row.id} className="hover:bg-gray-50/50 transition-colors">
                                            <TableCell>
                                                <span className="font-medium">{row.role}</span>
                                            </TableCell>
                                            <TableCell>
                                                {row.acronym ? (
                                                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                                        {row.acronym}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-500 text-sm">Sem sigla</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-xs">
                                                    <p className="font-medium text-gray-900 truncate" title={row.name}>
                                                        {row.name}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    <Mail className="w-4 h-4 text-gray-400" />
                                                    <a 
                                                        href={`mailto:${row.email}`}
                                                        className="text-blue-600 hover:text-blue-800 text-sm truncate max-w-xs"
                                                        title={row.email}
                                                    >
                                                        {row.email}
                                                    </a>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {row.imageLink ? (
                                                    <div className="flex items-center space-x-2">
                                                        <img 
                                                            src={row.imageLink} 
                                                            alt={row.name} 
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
                                                <Badge variant="outline">{row.order}</Badge>
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
                                                                            Tem certeza que deseja excluir o membro <strong>&ldquo;{row.name}&rdquo;</strong>? 
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

            {/* Reorder Modal */}
            <Dialog open={orderModalOpen} onOpenChange={setOrderModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <ArrowUpDown className="w-5 h-5" />
                            <span>Reordenar Membros</span>
                        </DialogTitle>
                        <DialogDescription>
                            Arraste os itens para reordená-los. A nova ordem será salva automaticamente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={ebOrder}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {ebOrder.map(item => (
                                        <SortableItem key={item.id} id={item.id}>
                                            <div className="flex items-center space-x-3">
                                                <Badge variant="outline">{item.order}</Badge>
                                                <span className="font-medium">{item.role}</span>
                                                {item.acronym && (
                                                    <span className="text-sm text-gray-500">({item.acronym})</span>
                                                )}
                                            </div>
                                        </SortableItem>
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeOrderModal}>
                            Cancelar
                        </Button>
                        <Button onClick={handleUpdateOrder}>
                            Confirmar Ordem
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
