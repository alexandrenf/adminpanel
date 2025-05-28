import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";

interface ModalComponentProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    onSave: () => void;
}

const ModalComponent: React.FC<ModalComponentProps> = ({ open, onClose, title, children, onSave }) => {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    {children}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ModalComponent;
