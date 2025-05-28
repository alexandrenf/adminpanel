"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, ChangeEvent } from "react";
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
    DialogTrigger,
} from "../../components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { Label } from "../../components/ui/label";
import { 
    History, 
    Plus, 
    Edit, 
    Trash2, 
    Image as ImageIcon,
    Calendar,
    User,
    FileText,
    Settings,
    ArrowUpDown,
    Loader2,
    Archive
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
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from "~/trpc/react";
import ModalComponent from './ModalComponent';
import GestaoForm from './GestaoForm';
import GestaoTable from './GestaoTable';

interface Arquivado {
    id: string;
    type: string;
    role: string;
    acronym: string;
    name: string;
    imageLink: string | null;
    order: number;
}

type SortableItemProps = {
    id: string;
    children: React.ReactNode;
};

export function SortableItem({ id, children }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            {...attributes} 
            {...listeners}
            className="p-3 m-1 border border-gray-200 rounded-lg bg-white cursor-pointer hover:bg-gray-50 transition-colors"
        >
            {children}
        </div>
    );
}

export default function HistoricoTable() {
    const router = useRouter();
    const [selectedGestao, setSelectedGestao] = useState("");
    const [selectedTipoCargo, setSelectedTipoCargo] = useState("");
    const [gestaoModalOpen, setGestaoModalOpen] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [orderModalOpen, setOrderModalOpen] = useState(false);
    const [arquivadosOrder, setArquivadosOrder] = useState<Arquivado[]>([]);
    const { data: gestoes, refetch: refetchGestoes, isLoading: isLoadingGestoes } = api.gestao.getAll.useQuery();
    const [arquivados, setArquivados] = useState<Arquivado[]>([]);
    const { data: arquivadosData, refetch: refetchArquivados, isLoading: isLoadingArquivados } = api.gestao.getAllArquivados.useQuery(
        { id: parseInt(selectedGestao), tipoCargo: selectedTipoCargo },
        { enabled: !!selectedGestao && !!selectedTipoCargo }
    );

    const createMutation = api.gestao.create.useMutation({
        onSuccess: () => {
            refetchGestoes();
        }
    });

    const deleteMutation = api.gestao.delete.useMutation({
        onSuccess: () => {
            refetchGestoes();
        }
    });

    const deleteArquivadoMutation = api.arquivado.delete.useMutation({
        onSuccess: () => {
            refetchArquivados();
        },
        onError: (error) => {
            setDeleteError(error.message);
        }
    });

    const deleteAnywayMutation = api.arquivado.delete.useMutation({
        onSuccess: () => {
            refetchArquivados();
        }
    });

    const updateOrderMutation = api.arquivado.updateOrder.useMutation({
        onSuccess: () => {
            refetchArquivados();
        },
        onError: (error) => {
            console.error(error);
        }
    });

    const handleGestaoChange = (value: string) => {
        setSelectedGestao(value);
    };

    const handleTipoCargoChange = (value: string) => {
        setSelectedTipoCargo(value);
    };

    const handleSaveGestao = async (data: { yearStart: number; yearEnd: number }) => {
        await createMutation.mutateAsync(data);
    };

    const handleDeleteGestao = async (id: number) => {
        await deleteMutation.mutateAsync({ id });
    };

    const handleDeleteArquivado = async (id: string) => {
        setDeleteError(null);
        await deleteArquivadoMutation.mutateAsync({ id: parseInt(id, 10) });
    };

    const handleDeleteAnyway = async (id: string) => {
        await deleteAnywayMutation.mutateAsync({ id: parseInt(id, 10) });
    };

    const openOrderModal = () => {
        if (arquivados) {
            setArquivadosOrder(arquivados);
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
            setArquivadosOrder((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);

                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleUpdateOrder = async () => {
        const newOrder = arquivadosOrder.map((item, index) => ({ id: parseInt(item.id, 10), order: index + 1 }));
        await updateOrderMutation.mutateAsync(newOrder);
        closeOrderModal();
    };

    useEffect(() => {
        if (selectedGestao && selectedTipoCargo) {
            refetchArquivados();
        }
    }, [selectedGestao, selectedTipoCargo]);

    useEffect(() => {
        if (arquivadosData) {
            const formattedArquivadosData = arquivadosData.map((item) => ({
                ...item,
                id: item.id.toString(),
            }));
            setArquivados(formattedArquivadosData);
        }
    }, [arquivadosData]);

    const handleOpenGestaoModal = () => {
        setGestaoModalOpen(true);
    };

    const handleCloseGestaoModal = () => {
        setGestaoModalOpen(false);
    };

    const handleAdd = () => {
        router.push(`/historico/create?type=${selectedTipoCargo}&gestaoId=${selectedGestao}`);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <History className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                        Histórico
                    </h2>
                    <p className="text-gray-600">Gerencie o histórico de gestões e arquivados</p>
                </div>
            </div>

            {/* Filters */}
            <Card className="shadow-lg border-0">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Settings className="w-5 h-5 text-blue-600" />
                        <span>Filtros e Configurações</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="gestao">Gestão</Label>
                            <Select value={selectedGestao} onValueChange={handleGestaoChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma gestão" />
                                </SelectTrigger>
                                <SelectContent>
                                    {gestoes?.map((gestao) => (
                                        <SelectItem key={gestao.id} value={gestao.id.toString()}>
                                            {`${gestao.yearStart}-${gestao.yearEnd}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tipoCargo">Tipo de Cargo</Label>
                            <Select value={selectedTipoCargo} onValueChange={handleTipoCargoChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EB">EB</SelectItem>
                                    <SelectItem value="CR">CR</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Ações</Label>
                            <Button
                                onClick={handleOpenGestaoModal}
                                variant="outline"
                                className="w-full"
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Gerenciar Gestões
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <Button 
                        onClick={handleAdd}
                        disabled={!selectedGestao || !selectedTipoCargo}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Arquivado
                    </Button>
                    <Button
                        onClick={openOrderModal}
                        disabled={!selectedGestao || !selectedTipoCargo || arquivados.length === 0}
                        variant="outline"
                        className="hover:bg-blue-50 hover:border-blue-200"
                    >
                        <ArrowUpDown className="w-4 h-4 mr-2" />
                        Reordenar
                    </Button>
                </div>
                {selectedGestao && selectedTipoCargo && (
                    <Badge variant="secondary">
                        {arquivados.length} {arquivados.length === 1 ? 'item' : 'itens'}
                    </Badge>
                )}
            </div>

            {/* Archived Table */}
            <Card className="shadow-lg border-0">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Archive className="w-5 h-5 text-blue-600" />
                        <span>Dados Arquivados</span>
                        {selectedGestao && selectedTipoCargo && (
                            <Badge variant="outline" className="ml-2">
                                {selectedTipoCargo} - {gestoes?.find(g => g.id.toString() === selectedGestao)?.yearStart}-{gestoes?.find(g => g.id.toString() === selectedGestao)?.yearEnd}
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingArquivados ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="flex items-center space-x-3">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                <span className="text-lg font-medium text-gray-700">Carregando arquivados...</span>
                            </div>
                        </div>
                    ) : !selectedGestao || !selectedTipoCargo ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Archive className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Selecione os filtros</h3>
                            <p className="text-gray-600">Escolha uma gestão e tipo de cargo para visualizar os dados arquivados.</p>
                        </div>
                    ) : arquivados.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Archive className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum dado encontrado</h3>
                            <p className="text-gray-600 mb-4">Não há dados arquivados para a gestão e tipo de cargo selecionados.</p>
                            <Button onClick={handleAdd} variant="outline">
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar primeiro item
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-lg border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead className="font-semibold">Tipo</TableHead>
                                        <TableHead className="font-semibold">Cargo</TableHead>
                                        <TableHead className="font-semibold">Sigla</TableHead>
                                        <TableHead className="font-semibold">Nome</TableHead>
                                        <TableHead className="font-semibold">Imagem</TableHead>
                                        <TableHead className="font-semibold text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {arquivados.map((row: Arquivado) => (
                                        <TableRow key={row.id} className="hover:bg-gray-50/50 transition-colors">
                                            <TableCell>
                                                <Badge variant="outline">{row.type}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-medium">{row.role}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                                    {row.acronym}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-xs">
                                                    <p className="font-medium text-gray-900 truncate" title={row.name}>
                                                        {row.name}
                                                    </p>
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
                                                        onClick={() => router.push(`/historico/create?id=${row.id}&type=${row.type}&gestaoId=${selectedGestao}`)}
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
                                                                            Tem certeza que deseja excluir o item <strong>&ldquo;{row.name}&rdquo;</strong>? 
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
                                                                        onClick={() => handleDeleteArquivado(row.id)}
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

            {/* Gestao Management Modal */}
            <ModalComponent
                open={gestaoModalOpen}
                onClose={handleCloseGestaoModal}
                title="Gerenciar Gestões"
                onSave={() => {}}
            >
                <GestaoForm onSave={handleSaveGestao} />
                <GestaoTable gestoes={gestoes || []} onDelete={handleDeleteGestao} />
            </ModalComponent>

            {/* Reorder Modal */}
            <Dialog open={orderModalOpen} onOpenChange={setOrderModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <ArrowUpDown className="w-5 h-5" />
                            <span>Reordenar Itens</span>
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
                                items={arquivadosOrder.map(item => item.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {arquivadosOrder.map(item => (
                                        <SortableItem key={item.id} id={item.id}>
                                            <div className="flex items-center space-x-3">
                                                <Badge variant="outline">{item.type}</Badge>
                                                <span className="font-medium">{item.role}</span>
                                                <span className="text-sm text-gray-500">({item.acronym})</span>
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
