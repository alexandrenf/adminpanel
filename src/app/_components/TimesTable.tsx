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
    const [open, setOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const { data: timeData, error: timeError, refetch: refetchTime } = api.times.getByType.useQuery({ type });

    const [membroQueryId, setMembroQueryId] = useState<number | null>(null);

    const { data: membrosData, error: membrosError, refetch: refetchMembros } = api.times.getMembros.useQuery(
        { id: membroQueryId ?? 0 },
        { enabled: membroQueryId !== null }
    );

    useEffect(() => {
        if (timeData) {
            setTime(timeData);
            if (timeData.length > 0) {
                const firstTime = timeData[0];
                if (firstTime) {
                    setMembroQueryId(firstTime.id);
                }
            }
        }
    }, [timeData]);

    useEffect(() => {
        if (membrosData) {
            setMembros(membrosData);
        }
    }, [membrosData]);

    const deleteMutation = api.times.delete.useMutation({
        onSuccess: () => {
            refetchTime();
            refetchMembros();
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
        router.push(`/times/${type}/create?id=${id}&edit=true`);
    };

    const handleAdd = () => {
        router.push(`/times/${type}/create`);
    };

    if (timeError || membrosError) {
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
                Adicionar membro {type.toUpperCase()}
            </Button>
            <Paper style={{ marginTop: "20px", overflowX: "auto" }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Nome</TableCell>
                            <TableCell>Cargo</TableCell>
                            <TableCell>Imagem</TableCell>
                            <TableCell>Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {membros.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>{row.name}</TableCell>
                                <TableCell>{row.role}</TableCell>
                                <TableCell>
                                    {row.imageLink ? <img src={row.imageLink} alt={row.name} width="100" loading="lazy" /> : "N/A"}
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
                        {deleteError ? deleteError : "Are you sure you want to delete this member?"}
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
