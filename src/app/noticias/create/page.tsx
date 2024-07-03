"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import "react-datepicker/dist/react-datepicker.css";
import DatePicker from "react-datepicker";
import { api } from "~/trpc/react";
import { getSession } from "next-auth/react";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

const authorOptions: string[] = [
    "Presidente Nacional",
    "Vice Presidente para Assuntos Externos",
    "Vice Presidente para Assuntos Internos",
    "Secretário(a) Geral",
    "Diretor Financeiro Interno",
    "Diretor Financeiro Externo",
    "Diretor Nacional de Comunicação e Marketing",
    "Diretor Nacional de Capacity Building",
    "Diretor Nacional de Educação Médica",
    "Diretor Nacional de Saúde Pública",
    "Diretor Nacional de Direitos Humanos e Paz",
    "Diretor Nacional de Direitos Sexuais e Reprodutivos",
    "Diretor Nacional de Intercâmbio Nacional para Assuntos Internos",
    "Diretor Nacional de Intercâmbio Nacional para Assuntos Externos",
    "Diretor Nacional de Intercâmbio Internacional Clínico-Cirúrgico para Incomings",
    "Diretor Nacional de Intercâmbio Internacional Clínico-Cirúrgico para Outgoings",
    "Diretor Nacional de Intercâmbio Internacional de Pesquisa para Incomings",
    "Diretor Nacional de Intercâmbio Internacional de Pesquisa para Outgoings",
    "Diretor Nacional de Programas e Atividades",
    "Diretor Nacional de Publicação, Pesquisa e Extensão",
    "Diretor Nacional de Alumni",
    "Yellow Team",
    "Divisão de Relações Públicas",
    "Red Light Team",
    "Green Lamp Team",
    "White Team",
    "Coordenadores Nacionais de Programas",
    "Scientific Team",
    "Capacity Building Team",
    "Comissão de Reforma e Elaboração de Documentos",
    "National Exchange Team",
    "Time de Intercâmbios Nacionais",
    "NSSB",
    "Outros",
];

export default function CreateNoticia() {
    const [title, setTitle] = useState("");
    const [date, setDate] = useState<Date | null>(null);
    const [markdown, setMarkdown] = useState("");
    const [resumo, setResumo] = useState("");
    const [author, setAuthor] = useState(authorOptions[0]);
    const [otherAuthor, setOtherAuthor] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [forcarPaginaInicial, setForcarPaginaInicial] = useState(false);
    const router = useRouter();

    const latestBlogId = api.noticias.latestBlogId.useQuery();
    const uploadFile = api.file.uploadFile.useMutation();
    const createNoticia = api.noticias.create.useMutation({
        onSuccess: () => {
            router.push("/noticias");
        },
    });

    useEffect(() => {
        if (image) {
            setImagePreview(image);
        } else {
            setImagePreview(null);
        }
    }, [image]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setImage(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (latestBlogId.isLoading || !latestBlogId.data) {
            alert("Loading latest blog ID, please wait.");
            return;
        }

        const nextId = latestBlogId.data + 1;
        const session = await getSession();

        try {
            // Upload the files to GitHub
            const uploadResult = await uploadFile.mutateAsync({
                id: nextId.toString(),
                markdown,
                image: image ? image.split(",")[1] : null, // Remove the base64 header
            });

            // Create the noticia in the database
            createNoticia.mutate({
                date: date ? new Date(date) : new Date(),
                author: author === "Outros" ? otherAuthor : author,
                title,
                summary: resumo,
                link: uploadResult.markdownUrl,
                imageLink: uploadResult.imageUrl,
                forceHomePage: forcarPaginaInicial,
                userId: session?.user.id ?? "", // Replace with actual user ID
            });
        } catch (error) {
            console.error("Error creating noticia:", error);
            alert("Failed to create noticia. Please try again.");
        }
    };

    return (
        <div className="container mx-auto p-6">
            <div className="bg-white shadow-md rounded-lg p-8 mt-8">
                <h1 className="text-3xl font-bold text-center text-blue-900 mb-8">
                    Criar nova notícia
                </h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Autor</label>
                        <select
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        >
                            {authorOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                        {author === "Outros" && (
                            <input
                                type="text"
                                value={otherAuthor}
                                onChange={(e) => setOtherAuthor(e.target.value)}
                                placeholder="Especifique o Autor"
                                className="mt-2 block w-full p-2 border border-gray-300 rounded-md"
                            />
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Data</label>
                        <DatePicker
                            selected={date}
                            onChange={(newDate) => setDate(newDate)}
                            dateFormat="dd/MM/yyyy"
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                            placeholderText="Selecione uma data"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Resumo</label>
                        <textarea
                            value={resumo}
                            onChange={(e) => setResumo(e.target.value)}
                            maxLength={150}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Conteúdo</label>
                        <div data-color-mode="light" className="mt-2">
                            <MDEditor value={markdown || ""} onChange={(value) => setMarkdown(value || "")} height={400} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Upload de Imagem</label>
                        <input
                            type="file"
                            onChange={handleImageChange}
                            className="mt-1 block w-full text-gray-900"
                        />
                        {imagePreview && (
                            <img
                                src={imagePreview}
                                alt="Image Preview"
                                className="mt-4 w-full max-w-xs mx-auto rounded-lg shadow-md"
                            />
                        )}
                    </div>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            checked={forcarPaginaInicial}
                            onChange={(e) => setForcarPaginaInicial(e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-900">Forçar Página Inicial</label>
                    </div>
                    <div>
                        <button
                            type="submit"
                            className="w-full bg-blue-900 text-white p-3 rounded-md hover:bg-blue-700"
                            disabled={createNoticia.isPending || uploadFile.isPending}
                        >
                            {createNoticia.isPending || uploadFile.isPending ? "Criando..." : "Criar Notícia"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
