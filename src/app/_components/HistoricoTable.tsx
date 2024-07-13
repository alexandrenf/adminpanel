"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, ChangeEvent } from "react";
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
    Box,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Typography,
    SelectChangeEvent
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
        padding: '8px',
        margin: '4px 0',
        border: '1px solid #ccc',
        borderRadius: '4px',
        backgroundColor: '#fff',
        cursor: 'pointer',
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {children}
        </div>
    );
}

export default function HistoricoTable() {
    const router = useRouter();
    const [selectedGestao, setSelectedGestao] = useState("");
    const [selectedTipoCargo, setSelectedTipoCargo] = useState("");
    const [gestaoModalOpen, setGestaoModalOpen] = useState(false);
    const [open, setOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
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
            setOpen(true);
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

    const handleGestaoChange = (event: SelectChangeEvent) => {
        setSelectedGestao(event.target.value as string);
    };

    const handleTipoCargoChange = (event: SelectChangeEvent) => {
        setSelectedTipoCargo(event.target.value as string);
    };

    const handleSaveGestao = async (data: { yearStart: number; yearEnd: number }) => {
        await createMutation.mutateAsync(data);
    };

    const handleDeleteGestao = async (id: number) => {
        await deleteMutation.mutateAsync({ id });
    };

    const handleDeleteArquivado = async (id: string) => {
        await deleteArquivadoMutation.mutateAsync({ id: parseInt(id, 10) });
    };

    const handleDeleteAnyway = async (id: string) => {
        await deleteAnywayMutation.mutateAsync({ id: parseInt(id, 10) });
    };

    const handleOpenDialog = (id: string) => {
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
            await handleDeleteArquivado(deleteId);
        }
        handleCloseDialog();
    };

    const confirmDeleteAnyway = async () => {
        if (deleteId !== null) {
            await handleDeleteAnyway(deleteId);
        }
        handleCloseDialog();
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

    return (
        <div>
            <Box display="flex" alignItems="center" mb={2}>
                <FormControl variant="filled" sx={{ m: 1, minWidth: 200 }}>
                    <InputLabel>Gestão</InputLabel>
                    <Select value={selectedGestao} onChange={handleGestaoChange}>
                        {gestoes?.map((gestao) => (
                            <MenuItem key={gestao.id} value={gestao.id}>
                                {`${gestao.yearStart}-${gestao.yearEnd}`}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl variant="filled" sx={{ m: 1, minWidth: 200 }}>
                    <InputLabel>Tipo de Cargo</InputLabel>
                    <Select value={selectedTipoCargo} onChange={handleTipoCargoChange}>
                        <MenuItem value="EB">EB</MenuItem>
                        <MenuItem value="CR">CR</MenuItem>
                    </Select>
                </FormControl>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleOpenGestaoModal}
                >
                    Gerenciar Gestões
                </Button>
            </Box>
            <Box display="flex" alignItems="center" mb={2}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => router.push(`/historico/create?type=${selectedTipoCargo}&gestaoId=${selectedGestao}`)}
                    disabled={!selectedGestao || !selectedTipoCargo}
                >
                    Adicionar novo Arquivado
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={openOrderModal}
                    disabled={!selectedGestao || !selectedTipoCargo}
                >
                    Mudar ordem
                </Button>
            </Box>

            <ModalComponent
                open={gestaoModalOpen}
                onClose={handleCloseGestaoModal}
                title="Gerenciar Gestões" onSave={function (): void {
                    throw new Error("Function not implemented.");
                }}            >
                <GestaoForm onSave={handleSaveGestao} />
                <GestaoTable gestoes={gestoes || []} onDelete={handleDeleteGestao} />
            </ModalComponent>

            <>
                {isLoadingArquivados ? (
                    <Typography variant="h6" style={{ marginTop: "20px" }} color="black">
                        Carregando arquivados...
                    </Typography>
                ) : arquivados.length === 0 ? (
                    <Typography variant="h6" style={{ marginTop: "20px" }} color="black">
                        Não há dados arquivados para a gestão e o tipo de cargo selecionados. Crie novos dados para visualizá-los aqui.
                    </Typography>
                ) : (
                    <Paper style={{ marginTop: "20px", overflowX: "auto" }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Tipo</TableCell>
                                    <TableCell>Cargo</TableCell>
                                    <TableCell>Sigla</TableCell>
                                    <TableCell>Nome</TableCell>
                                    <TableCell>Imagem</TableCell>
                                    <TableCell>Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {arquivados.map((row: Arquivado) => (
                                    <TableRow key={row.id}>
                                        <TableCell>{row.type}</TableCell>
                                        <TableCell>{row.role}</TableCell>
                                        <TableCell>{row.acronym}</TableCell>
                                        <TableCell>{row.name}</TableCell>
                                        <TableCell>
                                            <img src={row.imageLink ?? ''} alt={row.name} width="100" loading="lazy" />
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={() => router.push(`/historico/create?id=${row.id}&type=${row.type}&gestaoId=${selectedGestao}`)}
                                            >
                                                Editar
                                            </Button>
                                            <Button
                                                variant="contained"
                                                color="secondary"
                                                onClick={() => handleOpenDialog(row.id)}
                                            >
                                                Deletar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                )}
            </>
            <Dialog
                open={open}
                onClose={handleCloseDialog}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">Confirma deletar?</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        {deleteError ? deleteError : "Are you sure you want to delete this Arquivado?"}
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
                            items={arquivadosOrder.map(item => item.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {arquivadosOrder.map(item => (
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
