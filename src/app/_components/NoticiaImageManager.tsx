"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { 
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";
import { 
    Upload, 
    Loader2,
    Copy,
    Trash2,
    Edit3,
    CheckCircle,
    Image as ImageIcon,
    X
} from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "../../components/ui/use-toast";

interface NoticiaImage {
    id: number;
    originalName: string;
    randomString: string;
    url: string;
    filePath: string;
    fileSize?: number | null;
    mimeType?: string | null;
    createdAt: Date;
}

interface NoticiaImageManagerProps {
    isOpen: boolean;
    onClose: () => void;
    noticiaId: string; // Can be "new" for new noticias or the actual ID
}

const NoticiaImageManager = ({ isOpen, onClose, noticiaId }: NoticiaImageManagerProps) => {
    const [images, setImages] = useState<NoticiaImage[]>([]);
    const [uploading, setUploading] = useState(false);
    const [editingImage, setEditingImage] = useState<string | null>(null);
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // TRPC mutations and queries
    const { data: fetchedImages, refetch: refetchImages } = api.noticiaImages.getImages.useQuery(
        { noticiaId },
        { enabled: isOpen && noticiaId !== "new" }
    );

    const uploadImage = api.noticiaImages.uploadImage.useMutation({
        onSuccess: (result) => {
            setImages(prev => [...prev, {
                id: result.id,
                originalName: result.originalName,
                randomString: result.randomString,
                url: result.url,
                filePath: result.filePath,
                fileSize: null,
                mimeType: null,
                createdAt: new Date(),
            }]);
            toast({
                title: "Sucesso",
                description: "Imagem carregada com sucesso!",
            });
        },
        onError: (error) => {
            toast({
                title: "Erro",
                description: `Erro ao carregar imagem: ${error.message}`,
                variant: "destructive",
            });
        },
    });

    const deleteImage = api.noticiaImages.deleteImage.useMutation({
        onSuccess: () => {
            toast({
                title: "Sucesso",
                description: "Imagem removida com sucesso!",
            });
        },
        onError: (error) => {
            toast({
                title: "Erro",
                description: `Erro ao remover imagem: ${error.message}`,
                variant: "destructive",
            });
        },
    });

    const updateImage = api.noticiaImages.updateImage.useMutation({
        onSuccess: (result) => {
            setImages(prev => prev.map(img => 
                img.id.toString() === editingImage ? {
                    ...img,
                    originalName: result.originalName,
                    randomString: result.randomString,
                    url: result.url,
                    filePath: result.filePath,
                } : img
            ));
            setEditingImage(null);
            toast({
                title: "Sucesso",
                description: "Imagem atualizada com sucesso!",
            });
        },
        onError: (error) => {
            toast({
                title: "Erro",
                description: `Erro ao atualizar imagem: ${error.message}`,
                variant: "destructive",
            });
        },
    });

    useEffect(() => {
        if (fetchedImages) {
            setImages(fetchedImages);
        }
    }, [fetchedImages]);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setEditingImage(null);
            setCopiedUrl(null);
            setUploading(false);
        }
    }, [isOpen]);

    // Reset file input when editing is cancelled
    useEffect(() => {
        if (!editingImage && fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [editingImage]);

    const handleFileSelect = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        setUploading(true);
        
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                // Validate file
                if (!file) continue;
                
                if (!file.type.startsWith('image/')) {
                    toast({
                        title: "Erro",
                        description: `${file.name} não é uma imagem válida`,
                        variant: "destructive",
                    });
                    continue;
                }
                
                // Check file size (10MB limit)
                if (file.size > 10 * 1024 * 1024) {
                    toast({
                        title: "Erro",
                        description: `${file.name} é muito grande (máximo 10MB)`,
                        variant: "destructive",
                    });
                    continue;
                }
                
                try {
                    const base64 = await readFileAsBase64(file);
                    const base64Content = base64.split(',')[1]; // Remove data URL prefix
                    
                    if (!base64Content) {
                        throw new Error('Failed to process image data');
                    }
                    
                    if (editingImage) {
                        // Update existing image
                        await updateImage.mutateAsync({
                            imageId: parseInt(editingImage, 10),
                            newImage: base64Content,
                            newOriginalFilename: file.name,
                            fileSize: file.size,
                            mimeType: file.type,
                        });
                        break; // Only update one image in edit mode
                    } else {
                        // Upload new image
                        await uploadImage.mutateAsync({
                            noticiaId,
                            image: base64Content,
                            originalFilename: file.name,
                            fileSize: file.size,
                            mimeType: file.type,
                        });
                    }
                } catch (error) {
                    console.error('Error processing file:', error);
                    toast({
                        title: "Erro",
                        description: `Erro ao processar ${file.name}`,
                        variant: "destructive",
                    });
                }
            }
        } finally {
            setUploading(false);
            setEditingImage(null);
        }
    };

    const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        await handleFileSelect(e.target.files);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        await handleFileSelect(e.dataTransfer.files);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const copyToClipboard = async (url: string) => {
        try {
            // Check if clipboard API is available
            if (!navigator.clipboard) {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = url;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            } else {
                await navigator.clipboard.writeText(url);
            }
            
            setCopiedUrl(url);
            toast({
                title: "Copiado!",
                description: "URL copiada para a área de transferência",
            });
            setTimeout(() => setCopiedUrl(null), 2000);
        } catch (error) {
            console.error('Clipboard error:', error);
            toast({
                title: "Erro",
                description: "Não foi possível copiar a URL",
                variant: "destructive",
            });
        }
    };

    const handleDeleteImage = async (imageId: number) => {
        try {
            await deleteImage.mutateAsync({ imageId });
            setImages(prev => prev.filter(img => img.id !== imageId));
            
            // Clear editing state if we're deleting the image being edited
            if (editingImage === imageId.toString()) {
                setEditingImage(null);
            }
            
            // Clear copied URL if we're deleting the copied image
            const deletedImage = images.find(img => img.id === imageId);
            if (deletedImage && copiedUrl === deletedImage.url) {
                setCopiedUrl(null);
            }
        } catch (error) {
            console.error('Error deleting image:', error);
            // Error is already handled by the mutation's onError
        }
    };

    const handleEditImage = (imageId: number) => {
        setEditingImage(imageId.toString());
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const readFileAsBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                        <ImageIcon className="w-5 h-5 text-blue-600" />
                        <span>Gerenciar Imagens da Notícia</span>
                    </DialogTitle>
                    <DialogDescription>
                        Faça upload de imagens para usar no conteúdo da notícia. Você pode copiar as URLs das imagens para inserir no markdown.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col space-y-4">
                    {/* Upload Area */}
                    <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            onChange={handleFileInputChange}
                            className="hidden"
                            ref={fileInputRef}
                            accept="image/*"
                            multiple={!editingImage}
                        />
                        <div className="flex flex-col items-center space-y-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                {uploading ? (
                                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                                ) : (
                                    <Upload className="w-6 h-6 text-blue-600" />
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">
                                    {editingImage ? "Selecione uma nova imagem para substituir" : "Clique para selecionar ou arraste imagens"}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    PNG, JPG, GIF, WebP até 10MB
                                </p>
                                {editingImage && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingImage(null);
                                        }}
                                        className="mt-2"
                                    >
                                        <X className="w-4 h-4 mr-1" />
                                        Cancelar edição
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Images Grid */}
                    <div className="flex-1 overflow-y-auto">
                        <Label className="text-sm font-medium text-gray-700 mb-3 block">
                            Imagens Carregadas ({images.length})
                        </Label>
                        {images.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                <p>Nenhuma imagem carregada ainda</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {images.map((image) => (
                                    <div 
                                        key={image.id} 
                                        className={`border rounded-lg p-3 space-y-3 ${
                                            editingImage === image.id.toString() 
                                                ? 'border-blue-500 bg-blue-50' 
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        {/* Thumbnail */}
                                        <div className="aspect-square w-full bg-gray-100 rounded-md overflow-hidden">
                                            <img 
                                                src={image.url} 
                                                alt={image.originalName}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        
                                        {/* Filename */}
                                        <p className="text-xs text-gray-600 truncate" title={image.originalName}>
                                            {image.originalName}
                                        </p>
                                        
                                        {/* URL with copy button */}
                                        <div className="flex items-center space-x-2">
                                            <Input 
                                                value={image.url}
                                                readOnly
                                                className="text-xs flex-1 h-8"
                                            />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => copyToClipboard(image.url)}
                                                className="h-8 px-2"
                                            >
                                                {copiedUrl === image.url ? (
                                                    <CheckCircle className="w-3 h-3 text-green-600" />
                                                ) : (
                                                    <Copy className="w-3 h-3" />
                                                )}
                                            </Button>
                                        </div>
                                        
                                        {/* Action buttons */}
                                        <div className="flex space-x-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleEditImage(image.id)}
                                                disabled={uploading || updateImage.isPending}
                                                className="flex-1 h-8"
                                            >
                                                <Edit3 className="w-3 h-3 mr-1" />
                                                Editar
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleDeleteImage(image.id)}
                                                disabled={uploading || deleteImage.isPending}
                                                className="h-8 px-2"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NoticiaImageManager; 