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
import { api } from "~/trpc/react";

export default function NoticiasTable() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const { data: noticias, refetch } = api.noticias.getAll.useQuery();

    const deleteMutation = api.noticias.delete.useMutation({
        onSuccess: () => {
            refetch();
        },
        onError: (error) => {
            setDeleteError(error.message);
            setOpen(true);
        }
    });

    const deleteAnywayMutation = api.noticias.deleteAnyway.useMutation({
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
        router.push(`/noticias/create?id=${id}`);
    };

    return (
        <div>
            <Button
                variant="contained"
                color="primary"
                onClick={() => router.push("/noticias/create")}
            >
                Adicionar nova Notícia
            </Button>
            <Paper style={{ marginTop: "20px", overflowX: "auto" }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Data</TableCell>
                            <TableCell>Autor</TableCell>
                            <TableCell>Título</TableCell>
                            <TableCell>Resumo</TableCell>
                            <TableCell>Imagem</TableCell>
                            <TableCell>Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {noticias?.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                                <TableCell>{row.author}</TableCell>
                                <TableCell>{row.title}</TableCell>
                                <TableCell>{row.summary}</TableCell>
                                <TableCell>
                                    <img src={row.imageLink ?? ''} alt={row.title} width="100" loading="lazy" />
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        onClick={() => handleOpenDialog(row.id)}
                                    >
                                        Delete
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="warning"
                                        onClick={() => handleEdit(row.id)}
                                        style={{ marginLeft: "10px" }}
                                    >
                                        Edit
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
                <DialogTitle id="alert-dialog-title">Confirm Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        {deleteError ? deleteError : "Are you sure you want to delete this noticia?"}
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
                            Delete
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </div>
    );
}
