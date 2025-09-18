"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
    Handshake,
    Plus,
    Edit,
    Trash2,
    Image as ImageIcon,
    Globe,
    ArrowUpDown,
    Users,
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
import type { LucideIcon } from "lucide-react";

type PatrocinadorType = "marca" | "colaborador";

type Patrocinador = {
    id: number;
    name: string;
    description: string | null;
    website: string | null;
    imageLink: string | null;
    order: number;
    type: PatrocinadorType;
};

type SectionMeta = {
    title: string;
    description: string;
    icon: LucideIcon;
    iconBg: string;
    buttonClass: string;
    reorderHoverClass: string;
    emptyTitle: string;
    emptySubtitle: string;
    newLabel: string;
    accentTextClass: string;
};

const SECTION_META: Record<PatrocinadorType, SectionMeta> = {
    marca: {
        title: "Apoiadores à Marca",
        description: "Gerencie os apoiadores oficiais da marca",
        icon: Handshake,
        iconBg: "bg-gradient-to-br from-amber-500 to-orange-600",
        buttonClass: "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700",
        reorderHoverClass: "hover:bg-amber-50 hover:border-amber-200",
        emptyTitle: "Nenhum apoiador encontrado",
        emptySubtitle: "Ainda não há apoiadores da marca cadastrados no sistema.",
        newLabel: "Novo apoiador",
        accentTextClass: "text-amber-600 hover:text-amber-700",
    },
    colaborador: {
        title: "Colaboradores",
        description: "Gerencie colaboradores e parceiros institucionais",
        icon: Users,
        iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
        buttonClass: "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700",
        reorderHoverClass: "hover:bg-emerald-50 hover:border-emerald-200",
        emptyTitle: "Nenhum colaborador encontrado",
        emptySubtitle: "Ainda não há colaboradores cadastrados no sistema.",
        newLabel: "Novo colaborador",
        accentTextClass: "text-emerald-600 hover:text-emerald-700",
    },
};

export default function PatrocinadoresTable() {
    const router = useRouter();
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [orderModalType, setOrderModalType] = useState<PatrocinadorType | null>(null);
    const [patrocinadoresOrder, setPatrocinadoresOrder] = useState<Patrocinador[]>([]);
    const { data: patrocinadores, refetch } = api.patrocinador.getAll.useQuery();

    const deleteMutation = api.patrocinador.delete.useMutation({
        onSuccess: () => {
            refetch();
        },
        onError: (error) => {
            setDeleteError(error.message);
        }
    });

    const updateOrderMutation = api.patrocinador.updateOrder.useMutation({
        onSuccess: () => {
            refetch();
        },
        onError: (error) => {
            console.error(error);
        }
    });

    const deleteAnywayMutation = api.patrocinador.deleteAnyway.useMutation({
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
        router.push(`/patrocinadores/create?id=${id}`);
    };

    const handleAdd = (type?: PatrocinadorType) => {
        if (type) {
            router.push(`/patrocinadores/create?type=${type}`);
        } else {
            router.push("/patrocinadores/create");
        }
    };

    const patrocinadoresList = (patrocinadores ?? []) as Patrocinador[];

    const patrocinadoresByType = useMemo(() => ({
        marca: patrocinadoresList.filter((item) => item.type === "marca"),
        colaborador: patrocinadoresList.filter((item) => item.type === "colaborador"),
    }), [patrocinadoresList]);

    const openOrderModal = (type: PatrocinadorType) => {
        const items = patrocinadoresByType[type]
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((item, index) => ({ ...item, order: index + 1 }));
        setPatrocinadoresOrder(items);
        setOrderModalType(type);
    };

    const closeOrderModal = () => {
        setOrderModalType(null);
        setPatrocinadoresOrder([]);
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: any) => {
        const { active, over } = event;

        if (!over) return;

        if (active.id !== over.id) {
            setPatrocinadoresOrder((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                if (oldIndex === -1 || newIndex === -1) {
                    return items;
                }
                const updated = arrayMove(items, oldIndex, newIndex);
                return updated.map((item, index) => ({ ...item, order: index + 1 }));
            });
        }
    };

    const handleUpdateOrder = async () => {
        if (!orderModalType) return;
        const newOrder = patrocinadoresOrder.map((item) => ({ id: item.id, order: item.order }));
        await updateOrderMutation.mutateAsync({ type: orderModalType, items: newOrder });
        closeOrderModal();
    };

    const totalPatrocinadores = patrocinadores?.length ?? 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
                        <Handshake className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-amber-700 bg-clip-text text-transparent">
                            Patrocinadores
                        </h2>
                        <p className="text-gray-600">Gerencie apoiadores à marca e colaboradores do ecossistema IFMSA Brazil</p>
                    </div>
                </div>
                <Button
                    onClick={() => handleAdd()}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo patrocinador
                </Button>
            </div>

            <Badge variant="secondary" className="px-3 py-1">
                {totalPatrocinadores} {totalPatrocinadores === 1 ? 'registro' : 'registros'}
            </Badge>

            {(Object.keys(SECTION_META) as PatrocinadorType[]).map((type) => {
                const meta = SECTION_META[type];
                const data = patrocinadoresByType[type];
                const Icon = meta.icon;

                return (
                    <Card key={type} className="shadow-lg border-0">
                        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center space-x-4">
                                <div className={`p-3 rounded-xl shadow-lg ${meta.iconBg}`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-semibold flex items-center space-x-2">
                                        <span>{meta.title}</span>
                                        <Badge variant="outline">{data.length}</Badge>
                                    </CardTitle>
                                    <p className="text-gray-600 text-sm">{meta.description}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Button
                                    onClick={() => handleAdd(type)}
                                    className={`${meta.buttonClass} shadow-lg hover:shadow-xl transition-all duration-300`}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    {meta.newLabel}
                                </Button>
                                <Button
                                    onClick={() => openOrderModal(type)}
                                    disabled={!data || data.length === 0}
                                    variant="outline"
                                    className={meta.reorderHoverClass}
                                >
                                    <ArrowUpDown className="w-4 h-4 mr-2" />
                                    Reordenar
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {!data || data.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Icon className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{meta.emptyTitle}</h3>
                                    <p className="text-gray-600 mb-4">{meta.emptySubtitle}</p>
                                    <Button onClick={() => handleAdd(type)} variant="outline">
                                        <Plus className="w-4 h-4 mr-2" />
                                        {meta.newLabel}
                                    </Button>
                                </div>
                            ) : (
                                <div className="rounded-lg border overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-gray-50/50">
                                                <TableHead className="font-semibold">Nome</TableHead>
                                                <TableHead className="font-semibold">Descrição</TableHead>
                                                <TableHead className="font-semibold">Website</TableHead>
                                                <TableHead className="font-semibold">Imagem</TableHead>
                                                <TableHead className="font-semibold">Ordem</TableHead>
                                                <TableHead className="font-semibold text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.map((row) => (
                                                <TableRow key={row.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <TableCell>
                                                        <p className="font-medium text-gray-900 truncate max-w-xs" title={row.name}>
                                                            {row.name || 'Sem nome'}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.description ? (
                                                            <p className="text-gray-700 text-sm max-w-md" title={row.description}>
                                                                {row.description}
                                                            </p>
                                                        ) : (
                                                            <span className="text-gray-500 text-sm">Sem descrição</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.website ? (
                                                            <div className="flex items-center space-x-2">
                                                                <Globe className="w-4 h-4 text-gray-400" />
                                                                <a
                                                                    href={row.website}
                                                                    className={`${meta.accentTextClass} text-sm truncate max-w-xs`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    {row.website}
                                                                </a>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-500 text-sm">Sem website</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.imageLink ? (
                                                            <div className="flex items-center space-x-2">
                                                                <img
                                                                    src={row.imageLink}
                                                                    alt={row.name || 'Patrocinador'}
                                                                    className="w-12 h-12 object-cover rounded-lg border"
                                                                />
                                                                <a
                                                                    href={row.imageLink}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className={`${meta.accentTextClass} text-sm`}
                                                                >
                                                                    Ver imagem
                                                                </a>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center space-x-2 text-gray-500 text-sm">
                                                                <ImageIcon className="w-4 h-4" />
                                                                <span>Sem imagem</span>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="font-mono">
                                                            {row.order}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end space-x-2">
                                                            <Button variant="outline" size="icon" onClick={() => handleEdit(row.id)}>
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="outline" size="icon" className="text-red-500 border-red-200 hover:bg-red-50">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Excluir patrocinador</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Tem certeza de que deseja excluir "{row.name || 'Patrocinador'}"? Esta ação não pode ser desfeita.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                        {deleteError ? (
                                                                            <AlertDialogAction
                                                                                onClick={() => handleDeleteAnyway(row.id)}
                                                                                className="bg-red-600 hover:bg-red-700"
                                                                            >
                                                                                Forçar exclusão
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
                );
            })}

            <Dialog
                open={orderModalType !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        closeOrderModal();
                    }
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <ArrowUpDown className="w-5 h-5" />
                            <span>
                                Reordenar {orderModalType ? SECTION_META[orderModalType].title.toLowerCase() : 'patrocinadores'}
                            </span>
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
                                items={patrocinadoresOrder}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {patrocinadoresOrder.map((item) => (
                                        <SortableItem key={item.id} id={item.id}>
                                            <div className="flex items-center space-x-3">
                                                <Badge variant="outline">{item.order}</Badge>
                                                <span className="font-medium">{item.name || 'Sem nome'}</span>
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
                            Confirmar ordem
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
