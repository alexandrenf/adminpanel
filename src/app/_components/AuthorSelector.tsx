"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { 
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../../components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { 
    UserPlus, 
    Users, 
    Search, 
    X, 
    Upload, 
    ChevronLeft, 
    ChevronRight,
    Loader2,
    Plus,
    Edit2
} from "lucide-react";
import { api } from "~/trpc/react";

// Author interface for extended author information
interface ExtendedAuthor {
    id: number;
    name: string;
    bio?: string | null;
    photoLink?: string | null;
}

interface AuthorSelectorProps {
    selectedAuthors: ExtendedAuthor[];
    onAuthorsChange: (authors: ExtendedAuthor[]) => void;
    disabled?: boolean;
}

const readFile = (file: File): Promise<string> =>
    new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
    });

const resizeAuthorPhoto = (imageSrc: string): Promise<string> =>
    new Promise((resolve) => {
        const image = new Image();
        image.src = imageSrc;
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 150;
            canvas.height = 150;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                // Calculate dimensions to maintain aspect ratio while filling 150x150
                const size = Math.min(image.width, image.height);
                const startX = (image.width - size) / 2;
                const startY = (image.height - size) / 2;
                
                ctx.drawImage(
                    image,
                    startX,
                    startY,
                    size,
                    size,
                    0,
                    0,
                    150,
                    150
                );
                resolve(canvas.toDataURL("image/png"));
            }
        };
    });

export default function AuthorSelector({ selectedAuthors, onAuthorsChange, disabled = false }: AuthorSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [editingAuthor, setEditingAuthor] = useState<ExtendedAuthor | null>(null);
    
    // New author form state
    const [newAuthorName, setNewAuthorName] = useState("");
    const [newAuthorBio, setNewAuthorBio] = useState("");
    const [newAuthorPhoto, setNewAuthorPhoto] = useState<string | null>(null);
    const [newAuthorPhotoSrc, setNewAuthorPhotoSrc] = useState<string | null>(null);
    
    // Edit author form state
    const [editAuthorName, setEditAuthorName] = useState("");
    const [editAuthorBio, setEditAuthorBio] = useState("");
    const [editAuthorPhoto, setEditAuthorPhoto] = useState<string | null>(null);
    const [editAuthorPhotoSrc, setEditAuthorPhotoSrc] = useState<string | null>(null);
    
    const authorPhotoInputRef = useRef<HTMLInputElement>(null);
    const editAuthorPhotoInputRef = useRef<HTMLInputElement>(null);

    // Search functionality
    const { data: searchResults, isLoading: isSearching, error: searchError } = api.authors.search.useQuery(
        {
            query: searchQuery,
            page: currentPage,
            pageSize: 8,
        },
        {
            enabled: searchQuery.length >= 3,
        }
    );

    // Create author mutation
    const createAuthor = api.authors.create.useMutation({
        onSuccess: (newAuthor) => {
            onAuthorsChange([...selectedAuthors, newAuthor]);
            setShowCreateForm(false);
            setNewAuthorName("");
            setNewAuthorBio("");
            setNewAuthorPhoto(null);
            setNewAuthorPhotoSrc(null);
        },
    });

    // Update author mutation
    const updateAuthor = api.authors.update.useMutation({
        onSuccess: (updatedAuthor) => {
            // Update the selected authors if this author is selected
            const updatedSelectedAuthors = selectedAuthors.map(author => 
                author.id === updatedAuthor.id ? updatedAuthor : author
            );
            onAuthorsChange(updatedSelectedAuthors);
            
            setShowEditForm(false);
            setEditingAuthor(null);
            setEditAuthorName("");
            setEditAuthorBio("");
            setEditAuthorPhoto(null);
            setEditAuthorPhotoSrc(null);
        },
    });

    const handleRemoveAuthor = (authorId: number) => {
        onAuthorsChange(selectedAuthors.filter(a => a.id !== authorId));
    };

    const handleAddAuthor = (author: ExtendedAuthor) => {
        if (!selectedAuthors.find(a => a.id === author.id)) {
            onAuthorsChange([...selectedAuthors, author]);
        }
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setCurrentPage(1);
    };

    const handleAuthorPhotoChange = async (file: File) => {
        const imageDataUrl = await readFile(file);
        const resizedImageDataUrl = await resizeAuthorPhoto(imageDataUrl);
        setNewAuthorPhotoSrc(resizedImageDataUrl);
        setNewAuthorPhoto(resizedImageDataUrl?.split(",")[1] ?? null);
    };

    const handleAuthorPhotoInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file !== undefined) {
                await handleAuthorPhotoChange(file);
            }
        }
    };

    const handleCreateNewAuthor = async () => {
        if (!newAuthorName.trim()) return;
        
        try {
            await createAuthor.mutateAsync({
                name: newAuthorName.trim(),
                bio: newAuthorBio.trim() || undefined,
                photoLink: newAuthorPhoto || undefined,
            });
        } catch (error) {
            console.error("Error creating author:", error);
            alert("Failed to create author. Please try again.");
        }
    };

    const handleEditAuthor = (author: ExtendedAuthor) => {
        setEditingAuthor(author);
        setEditAuthorName(author.name);
        setEditAuthorBio(author.bio || "");
        setEditAuthorPhotoSrc(author.photoLink || null);
        setEditAuthorPhoto(null); // Only set if user uploads a new photo
        setShowEditForm(true);
        setShowCreateForm(false);
    };

    const handleUpdateAuthor = async () => {
        if (!editingAuthor || !editAuthorName.trim()) return;
        
        try {
            await updateAuthor.mutateAsync({
                id: editingAuthor.id,
                name: editAuthorName.trim(),
                bio: editAuthorBio.trim() || undefined,
                photoLink: editAuthorPhoto || editingAuthor.photoLink || undefined,
            });
        } catch (error) {
            console.error("Error updating author:", error);
            alert("Failed to update author. Please try again.");
        }
    };

    const handleEditAuthorPhotoChange = async (file: File) => {
        const imageDataUrl = await readFile(file);
        const resizedImageDataUrl = await resizeAuthorPhoto(imageDataUrl);
        setEditAuthorPhotoSrc(resizedImageDataUrl);
        setEditAuthorPhoto(resizedImageDataUrl?.split(",")[1] ?? null);
    };

    const handleEditAuthorPhotoInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file !== undefined) {
                await handleEditAuthorPhotoChange(file);
            }
        }
    };

    const resetCreateForm = () => {
        setShowCreateForm(false);
        setNewAuthorName("");
        setNewAuthorBio("");
        setNewAuthorPhoto(null);
        setNewAuthorPhotoSrc(null);
    };

    const resetEditForm = () => {
        setShowEditForm(false);
        setEditingAuthor(null);
        setEditAuthorName("");
        setEditAuthorBio("");
        setEditAuthorPhoto(null);
        setEditAuthorPhotoSrc(null);
    };

    const resetModal = () => {
        setSearchQuery("");
        setCurrentPage(1);
        resetCreateForm();
        resetEditForm();
    };

    // Reset search when modal closes
    useEffect(() => {
        if (!isOpen) {
            resetModal();
        }
    }, [isOpen]);

    return (
        <div className="space-y-4">
            <Label>Autores</Label>
            
            {/* Selected authors display */}
            {selectedAuthors.length > 0 && (
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Autores selecionados:</Label>
                    <div className="flex flex-wrap gap-2">
                        {selectedAuthors.map((author) => (
                            <Badge 
                                key={author.id} 
                                variant="secondary" 
                                className="flex items-center gap-2 py-2 px-3 text-sm"
                            >
                                <Avatar className="w-6 h-6">
                                    <AvatarImage src={author.photoLink ?? undefined} />
                                    <AvatarFallback className="text-xs">{author.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>{author.name}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 hover:bg-red-100"
                                    onClick={() => handleRemoveAuthor(author.id)}
                                    disabled={disabled}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {/* Add authors button */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full"
                        disabled={disabled}
                    >
                        <Users className="w-4 h-4 mr-2" />
                        {selectedAuthors.length === 0 ? "Adicionar Autores" : "Gerenciar Autores"}
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Gerenciar Autores
                        </DialogTitle>
                        <DialogDescription>
                            Pesquise por autores existentes ou crie um novo autor
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden">
                        {(() => {
                            if (showCreateForm) {
                                return (
                                    /* Create new author form */
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold">Criar Novo Autor</h3>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={resetCreateForm}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <Label htmlFor="newAuthorName">Nome *</Label>
                                                <Input
                                                    id="newAuthorName"
                                                    value={newAuthorName}
                                                    onChange={(e) => setNewAuthorName(e.target.value)}
                                                    placeholder="Nome do autor"
                                                />
                                            </div>
                                            
                                            <div>
                                                <Label htmlFor="newAuthorBio">Bio</Label>
                                                <Textarea
                                                    id="newAuthorBio"
                                                    value={newAuthorBio}
                                                    onChange={(e) => setNewAuthorBio(e.target.value)}
                                                    placeholder="Breve biografia (50-150 caracteres)"
                                                    maxLength={150}
                                                    className="resize-none"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">{newAuthorBio.length}/150 caracteres</p>
                                            </div>
                                            
                                            <div>
                                                <Label>Foto do Autor</Label>
                                                <div className="flex items-center space-x-4 mt-2">
                                                    {newAuthorPhotoSrc && (
                                                        <Avatar className="w-16 h-16">
                                                            <AvatarImage src={newAuthorPhotoSrc} />
                                                            <AvatarFallback>{newAuthorName.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                    )}
                                                    <div className="flex-1">
                                                        <input
                                                            type="file"
                                                            onChange={handleAuthorPhotoInputChange}
                                                            className="hidden"
                                                            ref={authorPhotoInputRef}
                                                            accept="image/*"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => authorPhotoInputRef.current?.click()}
                                                            className="w-full"
                                                        >
                                                            <Upload className="w-4 h-4 mr-2" />
                                                            {newAuthorPhotoSrc ? "Alterar Foto" : "Adicionar Foto"}
                                                        </Button>
                                                        <p className="text-xs text-gray-500 mt-1 text-center">
                                                            Será redimensionada para 150x150px
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            if (showEditForm && editingAuthor) {
                                return (
                                    /* Edit author form */
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold">Editar Autor</h3>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={resetEditForm}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <Label htmlFor="editAuthorName">Nome *</Label>
                                                <Input
                                                    id="editAuthorName"
                                                    value={editAuthorName}
                                                    onChange={(e) => setEditAuthorName(e.target.value)}
                                                    placeholder="Nome do autor"
                                                />
                                            </div>
                                            
                                            <div>
                                                <Label htmlFor="editAuthorBio">Bio</Label>
                                                <Textarea
                                                    id="editAuthorBio"
                                                    value={editAuthorBio}
                                                    onChange={(e) => setEditAuthorBio(e.target.value)}
                                                    placeholder="Breve biografia (50-150 caracteres)"
                                                    maxLength={150}
                                                    className="resize-none"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">{editAuthorBio.length}/150 caracteres</p>
                                            </div>
                                            
                                            <div>
                                                <Label>Foto do Autor</Label>
                                                <div className="flex items-center space-x-4 mt-2">
                                                    {editAuthorPhotoSrc && (
                                                        <Avatar className="w-16 h-16">
                                                            <AvatarImage src={editAuthorPhotoSrc} />
                                                            <AvatarFallback>{editAuthorName.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                    )}
                                                    <div className="flex-1">
                                                        <input
                                                            type="file"
                                                            onChange={handleEditAuthorPhotoInputChange}
                                                            className="hidden"
                                                            ref={editAuthorPhotoInputRef}
                                                            accept="image/*"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => editAuthorPhotoInputRef.current?.click()}
                                                            className="w-full"
                                                        >
                                                            <Upload className="w-4 h-4 mr-2" />
                                                            {editAuthorPhotoSrc ? "Alterar Foto" : "Adicionar Foto"}
                                                        </Button>
                                                        <p className="text-xs text-gray-500 mt-1 text-center">
                                                            Será redimensionada para 150x150px
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                /* Search and results view */
                                <div className="space-y-4 h-full flex flex-col">
                                    {/* Search input */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input
                                            placeholder="Digite pelo menos 3 caracteres para pesquisar..."
                                            value={searchQuery}
                                            onChange={(e) => handleSearchChange(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>

                                    {/* Search results */}
                                    <div className="flex-1 overflow-y-auto">
                                        {searchQuery.length < 3 ? (
                                            <div className="text-center py-12 text-gray-500">
                                                <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                                <p className="text-lg font-medium">Pesquisar Autores</p>
                                                <p className="text-sm">Digite pelo menos 3 caracteres para começar a pesquisar</p>
                                            </div>
                                        ) : isSearching ? (
                                            <div className="text-center py-12">
                                                <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-500" />
                                                <p className="text-gray-500">Pesquisando autores...</p>
                                            </div>
                                        ) : searchError ? (
                                            <div className="text-center py-12 text-red-500">
                                                <p>Erro ao pesquisar autores</p>
                                                <p className="text-sm text-gray-500">{searchError.message}</p>
                                            </div>
                                        ) : searchResults?.authors.length === 0 ? (
                                            <div className="text-center py-12 text-gray-500">
                                                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                                <p className="text-lg font-medium">Nenhum autor encontrado</p>
                                                <p className="text-sm">Não encontramos autores com o termo &quot;{searchQuery}&quot;</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {searchResults?.authors
                                                    .filter(author => !selectedAuthors.find(sa => sa.id === author.id))
                                                    .map((author) => (
                                                    <div 
                                                        key={author.id} 
                                                        className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-transparent hover:border-gray-200 transition-all"
                                                        onClick={() => handleAddAuthor(author)}
                                                    >
                                                        <Avatar className="w-10 h-10">
                                                            <AvatarImage src={author.photoLink || undefined} />
                                                            <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm truncate">{author.name}</p>
                                                            {author.bio && (
                                                                <p className="text-xs text-gray-600 truncate">{author.bio}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2 shrink-0">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEditAuthor(author);
                                                                }}
                                                                className="hover:bg-blue-50"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleAddAuthor(author);
                                                                }}
                                                                className="hover:bg-green-50"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Pagination */}
                                    {searchResults && searchResults.pagination.totalPages > 1 && (
                                        <div className="flex items-center justify-between border-t pt-4">
                                            <div className="text-sm text-gray-500">
                                                Página {searchResults.pagination.page} de {searchResults.pagination.totalPages} 
                                                ({searchResults.pagination.totalCount} autores)
                                            </div>
                                            <div className="flex space-x-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                    disabled={!searchResults.pagination.hasPrev}
                                                >
                                                    <ChevronLeft className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                                    disabled={!searchResults.pagination.hasNext}
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    <DialogFooter className="border-t pt-4">
                        {!showCreateForm && !showEditForm ? (
                            <>
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                    Fechar
                                </Button>
                                <Button 
                                    type="button" 
                                    onClick={() => setShowCreateForm(true)}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Criar Novo Autor
                                </Button>
                            </>
                        ) : showCreateForm ? (
                            <>
                                <Button type="button" variant="outline" onClick={resetCreateForm}>
                                    Cancelar
                                </Button>
                                <Button 
                                    type="button" 
                                    onClick={handleCreateNewAuthor} 
                                    disabled={!newAuthorName.trim() || createAuthor.isPending}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {createAuthor.isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Criando...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="w-4 h-4 mr-2" />
                                            Criar Autor
                                        </>
                                    )}
                                </Button>
                            </>
                        ) : showEditForm ? (
                            <>
                                <Button type="button" variant="outline" onClick={resetEditForm}>
                                    Cancelar
                                </Button>
                                <Button 
                                    type="button" 
                                    onClick={handleUpdateAuthor} 
                                    disabled={!editAuthorName.trim() || updateAuthor.isPending}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {updateAuthor.isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Atualizando...
                                        </>
                                    ) : (
                                        <>
                                            <Edit2 className="w-4 h-4 mr-2" />
                                            Atualizar Autor
                                        </>
                                    )}
                                </Button>
                            </>
                        ) : null}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
} 