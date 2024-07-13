"use client"

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Paper,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from "@mui/material";
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
    acronym: string;
    name: string;
    email: string;
    imageLink: string | null;
    order: number;
};

export default function EbTable() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
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
            setOpen(true);
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
        await deleteMutation.mutateAsync({ id });
    };

    const handleDeleteAnyway = async (id: number) => {
        await deleteAnywayMutation.mutateAsync({ id });
    };

    const handleOpenDialog = (id: number) => {
        setDeleteId(id);
        setOpen(true);
    };

    const handleCloseDialog = () => {
        setOpen(false);
        setDeleteId(null);
        setDeleteError(null);
    };

    const confirmDelete = async () => {
        if (deleteId !== null) {
            await handleDelete(deleteId);
        }
        handleCloseDialog();
    };

    const confirmDeleteAnyway = async () => {
        if (deleteId !== null) {
            await handleDeleteAnyway(deleteId);
        }
        handleCloseDialog();
    };

    const handleEdit = (id: number) => {
        router.push(`/eb/create?id=${id}`);
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
        <div>
            <div className="flex space-x-[10px]">
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => router.push("/eb/create")}
                >
                    Adicionar novo EB
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={openOrderModal}
                >
                    Mudar ordem
                </Button>
            </div>
            <Paper style={{ marginTop: "20px", overflowX: "auto" }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Cargo</TableCell>
                            <TableCell>Sigla</TableCell>
                            <TableCell>Nome</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Imagem</TableCell>
                            <TableCell>Ordem</TableCell>
                            <TableCell>Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {eb?.map((row: Eb) => (
                            <TableRow key={row.id}>
                                <TableCell>{row.role}</TableCell>
                                <TableCell>{row.acronym}</TableCell>
                                <TableCell>{row.name}</TableCell>
                                <TableCell>{row.email}</TableCell>
                                <TableCell>
                                    <img src={row.imageLink ?? ''} alt={row.name} width="100" loading="lazy" />
                                </TableCell>
                                <TableCell>{row.order}</TableCell>
                                <TableCell>
                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        onClick={() => handleOpenDialog(row.id)}
                                    >
                                        Deletar
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="warning"
                                        onClick={() => handleEdit(row.id)}
                                        style={{ marginLeft: "10px" }}
                                    >
                                        Editar
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
            <Dialog
                open={open}
                onClose={handleCloseDialog}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">Confirma deletar?</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        {deleteError ? deleteError : "Are you sure you want to delete this EB?"}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} color="primary">
                        Cancelar
                    </Button>
                    {deleteError ? (
                        <Button onClick={confirmDeleteAnyway} color="secondary" autoFocus>
                            Confirmar
                        </Button>
                    ) : (
                        <Button onClick={confirmDelete} color="secondary" autoFocus>
                            Deletar
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
            <Dialog
                open={orderModalOpen}
                onClose={closeOrderModal}
                aria-labelledby="reorder-dialog-title"
            >
                <DialogTitle id="reorder-dialog-title">Mudar Ordem</DialogTitle>
                <DialogContent>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={ebOrder}
                            strategy={verticalListSortingStrategy}
                        >
                            {ebOrder.map(item => (
                                <SortableItem key={item.id} id={item.id}>
                                    {item.role}
                                </SortableItem>
                            ))}
                        </SortableContext>
                    </DndContext>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeOrderModal} color="primary">
                        Cancelar
                    </Button>
                    <Button onClick={handleUpdateOrder} color="primary">
                        Confirmar
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
