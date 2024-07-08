"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
    const [open, setOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
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
            setOpen(true);
        },
    });

    const handleDelete = async (id: number) => {
        await deleteMutation.mutateAsync({ id });
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

    const handleEdit = (id: number) => {
        router.push(`/arquivos/${type}/create?id=${id}&edit=true`);
    };

    const handleAdd = () => {
        router.push(`/arquivos/${type}/create`);
    };

    if (error) {
        return <p>Error loading data...</p>;
    }

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">{label}</h2>
            <Button
                variant="contained"
                color="primary"
                onClick={handleAdd}
                className="mb-6"
            >
                Adicionar {label}
            </Button>
            <Paper style={{ marginTop: "20px", overflowX: "auto" }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Título</TableCell>
                            <TableCell>Data</TableCell>
                            <TableCell>Autor</TableCell>
                            <TableCell>Imagem</TableCell>
                            <TableCell>Arquivo</TableCell>
                            <TableCell>Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {arquivos.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>{row.title}</TableCell>
                                <TableCell>{new Date(row.date).toLocaleDateString('en-GB', { timeZone: 'UTC' })}</TableCell>
                                <TableCell>{row.author}</TableCell>
                                <TableCell>
                                    {row.imageLink ? <img src={row.imageLink} alt={row.title} width="100" loading="lazy" /> : "N/A"}
                                </TableCell>
                                <TableCell>
                                    {row.fileLink ? <a href={row.fileLink} target="_blank" rel="noopener noreferrer">Download</a> : "N/A"}
                                </TableCell>
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
                        {deleteError ? deleteError : "Are you sure you want to delete this file?"}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} color="primary">
                        Cancelar
                    </Button>
                    <Button onClick={confirmDelete} color="secondary" autoFocus>
                        Deletar
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
