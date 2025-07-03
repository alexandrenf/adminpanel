"use client";

import React, { useState, useEffect } from 'react';
import { api } from '~/trpc/react';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { useToast } from "../../hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../../components/ui/alert-dialog";
import dynamic from "next/dynamic";
import { 
  Calendar, 
  MapPin, 
  Download, 
  Users, 
  Palette,
  Save,
  Loader2,
  Plus,
  X,
  FileText,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  Lock
} from "lucide-react";

// Dynamic import for MDEditor
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface Sponsor {
  name: string;
  logo?: string;
  tier?: string;
  email?: string;
  acronym?: string;
  website?: string;
}

interface EventConfig {
  eventType: "alert" | "ag";
  eventActive: boolean;
  eventTitle: string;
  eventDescription: string;
  eventLogo?: string;
  eventDateStart?: Date;
  eventDateEnd?: Date;
  eventCity?: string;
  eventState?: string;
  eventVenue?: string;
  survivalKitUrl?: string;
  registrationUrl?: string;
  survivalKitStatus: "available" | "coming_soon" | "disabled";
  registrationStatus: "available" | "coming_soon" | "disabled";
  eventContent?: string;
  eventSponsors: Sponsor[];
  primaryColor: string;
  secondaryColor: string;
  showSponsors: boolean;
  showDownloads: boolean;
  eventStatus: "upcoming" | "ongoing" | "past";
  previewPassword?: string;
}

export default function EventConfigComponent() {
  const [config, setConfig] = useState<EventConfig>({
    eventType: "alert",
    eventActive: false,
    eventTitle: "",
    eventDescription: "",
    eventLogo: "https://placehold.co/1080x1080/e5e7eb/6b7280?text=Event+Logo",
    survivalKitStatus: "coming_soon",
    registrationStatus: "coming_soon",
    eventSponsors: [],
    primaryColor: "#00508c",
    secondaryColor: "#fac800",
    showSponsors: true,
    showDownloads: true,
    eventStatus: "upcoming",
    previewPassword: "",
  });
  
  const [activeTab, setActiveTab] = useState<"basic" | "content" | "sponsors" | "branding">("basic");
  const [isSaving, setIsSaving] = useState(false);
  const [configId, setConfigId] = useState<number>(1);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [sponsorToDelete, setSponsorToDelete] = useState<{ index: number; sponsor: Sponsor } | null>(null);
  
  // Track if data has been initially loaded to prevent overwriting user changes
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  
  const { toast } = useToast();

  const { data: initialConfig, isLoading } = api.config.getEventWithDetails.useQuery(undefined, {
    // Reduce automatic refetching while user is editing
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });
  const updateEventMutation = api.config.updateEvent.useMutation();
  const uploadLogoMutation = api.config.uploadEventLogo.useMutation();
  const uploadSponsorLogoMutation = api.config.uploadSponsorLogo.useMutation();
  const deleteFileFromGitHubMutation = api.config.deleteFileFromGitHub.useMutation();

  useEffect(() => {
    if (initialConfig && !hasLoadedInitialData) {
      // Only load data on initial fetch, not on subsequent refetches
      setConfigId(initialConfig.id || 1);
      setConfig({
        eventType: "ag", // Always AG for this component
        eventActive: initialConfig.eventActive || false,
        eventTitle: initialConfig.eventTitle || "",
        eventDescription: initialConfig.eventDescription || "",
        eventLogo: initialConfig.eventLogo || "https://placehold.co/1080x1080/e5e7eb/6b7280?text=Event+Logo",
        eventDateStart: initialConfig.eventDateStart || undefined,
        eventDateEnd: initialConfig.eventDateEnd || undefined,
        eventCity: initialConfig.eventCity || "",
        eventState: initialConfig.eventState || "",
        eventVenue: initialConfig.eventVenue || "",
        survivalKitUrl: initialConfig.survivalKitUrl || "",
        registrationUrl: initialConfig.registrationUrl || "",
        survivalKitStatus: (initialConfig.survivalKitStatus as "available" | "coming_soon" | "disabled") || "coming_soon",
        registrationStatus: (initialConfig.registrationStatus as "available" | "coming_soon" | "disabled") || "coming_soon",
        eventContent: initialConfig.eventContent || "",
        eventSponsors: Array.isArray(initialConfig.eventSponsors) ? initialConfig.eventSponsors : [],
        primaryColor: initialConfig.primaryColor || "#00508c",
        secondaryColor: initialConfig.secondaryColor || "#fac800",
        showSponsors: initialConfig.showSponsors || true,
        showDownloads: initialConfig.showDownloads || true,
        eventStatus: (initialConfig.eventStatus as "upcoming" | "ongoing" | "past") || "upcoming",
        previewPassword: initialConfig.previewPassword || "",
      });
      
      setHasLoadedInitialData(true);
    }
  }, [initialConfig, hasLoadedInitialData]);

  const handleInputChange = (field: keyof EventConfig, value: any) => {
    setConfig((prevConfig) => ({
      ...prevConfig,
      [field]: value
    }));
  };

  const handleSponsorChange = (index: number, field: keyof Sponsor, value: string) => {
    const newSponsors = [...config.eventSponsors];
    
    // Check if the sponsor at this index exists
    if (newSponsors[index]) {
      newSponsors[index] = { ...newSponsors[index], [field]: value };
    } else {
      // Initialize a new sponsor object if it doesn't exist
      newSponsors[index] = { name: "", tier: "Patrocinador", [field]: value };
    }
    
    setConfig((prevConfig) => ({
      ...prevConfig,
      eventSponsors: newSponsors
    }));
  };

  const addSponsor = () => {
    setConfig((prevConfig) => ({
      ...prevConfig,
      eventSponsors: [...prevConfig.eventSponsors, { name: "", tier: "Patrocinador" }]
    }));
  };

  const removeSponsor = (index: number) => {
    const sponsor = config.eventSponsors[index];
    if (sponsor) {
      setSponsorToDelete({ index, sponsor });
    }
  };

  const confirmRemoveSponsor = async () => {
    if (!sponsorToDelete) return;
    
    const { index, sponsor } = sponsorToDelete;
    
    // If sponsor has a GitHub-hosted logo, delete it first
    if (sponsor.logo && sponsor.logo.includes('cdn.jsdelivr.net/gh/')) {
      try {
        await deleteFileFromGitHubMutation.mutateAsync({
          fileUrl: sponsor.logo,
          fileType: "sponsor-logo",
        });
        
        toast({
          title: "Patrocinador removido",
          description: `Logo do patrocinador "${sponsor.name}" também foi removido do GitHub.`,
        });
      } catch (error) {
        console.error('Error deleting sponsor logo from GitHub:', error);
        toast({
          title: "Aviso",
          description: "Patrocinador removido, mas o logo pode ainda estar no GitHub.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Patrocinador removido",
        description: sponsor.name ? `"${sponsor.name}" foi removido.` : "Patrocinador removido.",
      });
    }
    
    const newSponsors = config.eventSponsors.filter((_, i) => i !== index);
    setConfig((prevConfig) => ({
      ...prevConfig,
      eventSponsors: newSponsors
    }));
    
    setSponsorToDelete(null);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro no arquivo",
        description: "Por favor, selecione apenas arquivos de imagem.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB for processing)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O logo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingLogo(true);

    try {
      // Process image: resize to 1080x1080 and convert to WebP
      const processedImage = await processImageToWebP(file, 1080, 1080);

      // Upload to GitHub
      const result = await uploadLogoMutation.mutateAsync({
        image: processedImage,
        eventType: config.eventType,
      });

      // Update config with new logo URL
      handleInputChange('eventLogo', result.imageUrl);

      toast({
        title: "Logo enviado!",
        description: "O logo do evento foi carregado com sucesso.",
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Erro no upload",
        description: "Ocorreu um erro ao enviar o logo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const processImageToWebP = (file: File, width: number, height: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Calculate scaling to maintain aspect ratio
        const scale = Math.min(width / img.width, height / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;

        // Center the image
        const x = (width - scaledWidth) / 2;
        const y = (height - scaledHeight) / 2;

        // Fill background with white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Draw the scaled image
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

        // Convert to WebP and get base64
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Could not create blob'));
            return;
          }

          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            const base64Parts = base64String.split(',');
            if (base64Parts.length < 2 || !base64Parts[1]) {
              reject(new Error('Could not extract base64 data'));
              return;
            }
            resolve(base64Parts[1]);
          };
          reader.onerror = () => reject(new Error('Could not read blob'));
          reader.readAsDataURL(blob);
        }, 'image/webp', 0.85); // 85% quality
      };

      img.onerror = () => reject(new Error('Could not load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleDeleteLogo = async () => {
    const currentLogo = config.eventLogo;
    
    // Check if it's a GitHub-hosted image (not placeholder)
    const isGitHubImage = currentLogo && currentLogo.includes('cdn.jsdelivr.net/gh/');
    
    if (isGitHubImage) {
      try {
        // Delete from GitHub first
        await deleteFileFromGitHubMutation.mutateAsync({
          fileUrl: currentLogo,
          fileType: "event-logo",
        });
        
        toast({
          title: "Logo removido",
          description: "Logo removido do GitHub e substituído por placeholder.",
        });
      } catch (error) {
        console.error('Error deleting logo from GitHub:', error);
        toast({
          title: "Aviso",
          description: "Logo removido localmente, mas pode ainda estar no GitHub.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Logo removido",
        description: "Logo substituído por imagem placeholder.",
      });
    }
    
    // Set to placeholder image
    const placeholderImage = "https://placehold.co/1080x1080/e5e7eb/6b7280?text=Event+Logo";
    handleInputChange('eventLogo', placeholderImage);
  };

  const handleSponsorLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>, sponsorIndex: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const sponsor = config.eventSponsors[sponsorIndex];
    if (!sponsor?.name) {
      toast({
        title: "Erro",
        description: "Por favor, adicione o nome do patrocinador antes de enviar o logo.",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro no arquivo",
        description: "Por favor, selecione apenas arquivos de imagem.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O logo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Process image: resize to 300x300 and convert to WebP
      const processedImage = await processImageToWebP(file, 300, 300);

      // Upload to GitHub
      const result = await uploadSponsorLogoMutation.mutateAsync({
        image: processedImage,
        sponsorName: sponsor.name,
        eventType: config.eventType,
      });

      // Update sponsor logo URL
      handleSponsorChange(sponsorIndex, 'logo', result.imageUrl);

      toast({
        title: "Logo enviado!",
        description: `Logo do patrocinador "${sponsor.name}" foi carregado com sucesso.`,
      });
    } catch (error) {
      console.error('Error uploading sponsor logo:', error);
      toast({
        title: "Erro no upload",
        description: "Ocorreu um erro ao enviar o logo. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSponsorLogo = async (sponsorIndex: number) => {
    const sponsor = config.eventSponsors[sponsorIndex];
    if (!sponsor?.logo) return;

    const isGitHubImage = sponsor.logo.includes('cdn.jsdelivr.net/gh/');
    
    if (isGitHubImage) {
      try {
        // Delete from GitHub first
        await deleteFileFromGitHubMutation.mutateAsync({
          fileUrl: sponsor.logo,
          fileType: "sponsor-logo",
        });
        
        toast({
          title: "Logo removido",
          description: `Logo do patrocinador "${sponsor.name}" removido do GitHub.`,
        });
      } catch (error) {
        console.error('Error deleting sponsor logo from GitHub:', error);
        toast({
          title: "Aviso",
          description: "Logo removido localmente, mas pode ainda estar no GitHub.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Logo removido",
        description: `Logo do patrocinador "${sponsor.name}" removido.`,
      });
    }
    
    // Remove logo URL from sponsor
    handleSponsorChange(sponsorIndex, 'logo', '');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateEventMutation.mutateAsync({
        id: configId,
        eventConfig: config,
      });
      
      toast({
        title: "Configuração salva!",
        description: `Configuração do evento ${config.eventType === "alert" ? "Alerta" : "AG"} foi atualizada com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
      console.error('Erro ao salvar configuração:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-lg font-medium text-gray-700">Carregando configurações...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
              Configuração de Eventos
            </h2>
            <p className="text-gray-600">Configure alertas ou eventos da Assembleia Geral</p>
          </div>
        </div>


      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {[
            { id: "basic", label: "Informações Básicas", icon: Calendar },
            { id: "content", label: "Conteúdo", icon: FileText },
            { id: "sponsors", label: "Patrocinadores", icon: Users },
            { id: "branding", label: "Visual", icon: Palette },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      <Card className="w-full max-w-6xl shadow-lg border-0">
        <CardContent className="p-6">
          {/* Basic Information Tab */}
          {activeTab === "basic" && (
            <div className="space-y-6">
              {/* Event Active Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-base font-semibold">Evento Ativo</Label>
                  <p className="text-sm text-gray-600">Ative para exibir o evento no site</p>
                </div>
                <Switch
                  checked={config.eventActive}
                  onCheckedChange={(checked) => handleInputChange('eventActive', checked)}
                />
              </div>

              {/* Preview Password (only when event is inactive) */}
              {!config.eventActive && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 bg-amber-100 rounded">
                        <Lock className="w-4 h-4 text-amber-600" />
                      </div>
                      <Label className="text-base font-semibold text-amber-800">Senha de Pré-visualização</Label>
                    </div>
                    <p className="text-sm text-amber-700">
                      Como o evento está inativo, defina uma senha para visualizar o site em modo de pré-visualização.
                    </p>
                    <div className="space-y-2">
                      <Input
                        placeholder="Digite uma senha simples para pré-visualização"
                        value={config.previewPassword || ""}
                        onChange={(e) => handleInputChange('previewPassword', e.target.value)}
                        className="bg-white border-amber-300 focus:border-amber-500"
                      />
                      <p className="text-xs text-amber-600">
                        Esta senha permitirá acesso ao site mesmo com o evento inativo. Não é criptografada - use apenas para testes.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Event Details */}
              {config.eventType === "ag" && (
                <div className="space-y-2">
                  <Label htmlFor="eventTitle">Título do Evento</Label>
                  <Input
                    id="eventTitle"
                    placeholder="Ex: 63ª Assembleia Geral"
                    value={config.eventTitle}
                    onChange={(e) => handleInputChange('eventTitle', e.target.value)}
                  />
                </div>
              )}

              {/* Event Description */}
              <div className="space-y-2">
                <Label htmlFor="eventDescription">Descrição do Evento</Label>
                <Textarea
                  id="eventDescription"
                  placeholder="Descrição promocional do evento..."
                  value={config.eventDescription}
                  onChange={(e) => handleInputChange('eventDescription', e.target.value)}
                  rows={4}
                />
              </div>

              {/* Dates and Location */}
              {config.eventType === "ag" && (
                <div className="space-y-4">
                  <h3 className="flex items-center space-x-2 text-lg font-semibold">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <span>Data e Local</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="eventDateStart">Data de Início</Label>
                      <Input
                        id="eventDateStart"
                        type="date"
                        value={config.eventDateStart ? new Date(config.eventDateStart).toISOString().split('T')[0] : ""}
                        onChange={(e) => handleInputChange('eventDateStart', e.target.value ? new Date(e.target.value) : undefined)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eventDateEnd">Data de Término</Label>
                      <Input
                        id="eventDateEnd"
                        type="date"
                        value={config.eventDateEnd ? new Date(config.eventDateEnd).toISOString().split('T')[0] : ""}
                        onChange={(e) => handleInputChange('eventDateEnd', e.target.value ? new Date(e.target.value) : undefined)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="eventCity">Cidade</Label>
                      <Input
                        id="eventCity"
                        placeholder="São Paulo"
                        value={config.eventCity || ""}
                        onChange={(e) => handleInputChange('eventCity', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eventState">Estado</Label>
                      <Input
                        id="eventState"
                        placeholder="SP"
                        value={config.eventState || ""}
                        onChange={(e) => handleInputChange('eventState', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eventVenue">Local do Evento</Label>
                    <Input
                      id="eventVenue"
                      placeholder="Hotel Grand Mercure"
                      value={config.eventVenue || ""}
                      onChange={(e) => handleInputChange('eventVenue', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Downloads Section */}
              {config.eventType === "ag" && (
                <div className="space-y-4">
                  <h3 className="flex items-center space-x-2 text-lg font-semibold">
                    <Download className="w-5 h-5 text-blue-600" />
                    <span>Downloads e Links</span>
                  </h3>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-base font-semibold">Mostrar Downloads</Label>
                      <p className="text-sm text-gray-600">Exibir seção de downloads no site</p>
                    </div>
                    <Switch
                      checked={config.showDownloads}
                      onCheckedChange={(checked) => handleInputChange('showDownloads', checked)}
                    />
                  </div>

                  {config.showDownloads && (
                    <div className="space-y-4 pl-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="survivalKitUrl">URL Kit de Sobrevivência</Label>
                          <Input
                            id="survivalKitUrl"
                            placeholder="/survival-kit-ag63.pdf"
                            value={config.survivalKitUrl || ""}
                            onChange={(e) => handleInputChange('survivalKitUrl', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="survivalKitStatus">Status Kit</Label>
                          <Select value={config.survivalKitStatus} onValueChange={(value) => handleInputChange('survivalKitStatus', value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="available">Disponível</SelectItem>
                              <SelectItem value="coming_soon">Em Breve</SelectItem>
                              <SelectItem value="disabled">Desabilitado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="registrationUrl">URL Registro</Label>
                          <Input
                            id="registrationUrl"
                            placeholder="/registro-ag63.pdf"
                            value={config.registrationUrl || ""}
                            onChange={(e) => handleInputChange('registrationUrl', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="registrationStatus">Status Registro</Label>
                          <Select value={config.registrationStatus} onValueChange={(value) => handleInputChange('registrationStatus', value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="available">Disponível</SelectItem>
                              <SelectItem value="coming_soon">Em Breve</SelectItem>
                              <SelectItem value="disabled">Desabilitado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Content Tab */}
          {activeTab === "content" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center space-x-2 text-lg font-semibold">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>Conteúdo do Evento</span>
                </h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventContent">Conteúdo Detalhado (Markdown)</Label>
                <div className="border rounded-md overflow-hidden">
                  <MDEditor 
                    value={config.eventContent || ""} 
                    onChange={(value) => handleInputChange('eventContent', value || "")} 
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Use Markdown para formatação. O editor oferece preview em tempo real.
                </p>
              </div>


            </div>
          )}

          {/* Sponsors Tab */}
          {activeTab === "sponsors" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center space-x-2 text-lg font-semibold">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>Patrocinadores</span>
                </h3>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={config.showSponsors}
                      onCheckedChange={(checked) => handleInputChange('showSponsors', checked)}
                    />
                    <Label className="text-sm">Mostrar Seção</Label>
                  </div>
                  
                  <Button onClick={addSponsor} size="sm" className="flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span>Adicionar</span>
                  </Button>
                </div>
              </div>

              {config.showSponsors && (
                <div className="space-y-4">
                  {config.eventSponsors.map((sponsor, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                          <div className="space-y-2">
                            <Label>Nome do Patrocinador</Label>
                            <Input
                              placeholder="Ministério da Saúde"
                              value={sponsor.name}
                              onChange={(e) => handleSponsorChange(index, 'name', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Sigla</Label>
                            <Input
                              placeholder="MS"
                              value={sponsor.acronym || ""}
                              onChange={(e) => handleSponsorChange(index, 'acronym', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Tier/Categoria</Label>
                            <Input
                              placeholder="Patrocinador Diamante"
                              value={sponsor.tier || ""}
                              onChange={(e) => handleSponsorChange(index, 'tier', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                              type="email"
                              placeholder="contato@saude.gov.br"
                              value={sponsor.email || ""}
                              onChange={(e) => handleSponsorChange(index, 'email', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Website</Label>
                            <Input
                              placeholder="https://www.saude.gov.br"
                              value={sponsor.website || ""}
                              onChange={(e) => handleSponsorChange(index, 'website', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Logo (URL ou Upload)</Label>
                            <div className="space-y-2">
                              <Input
                                placeholder="https://example.com/logo.png"
                                value={sponsor.logo || ""}
                                onChange={(e) => handleSponsorChange(index, 'logo', e.target.value)}
                              />
                              
                              {/* Logo Preview */}
                              {sponsor.logo && (
                                <div className="space-y-2">
                                  <p className="text-sm text-gray-600">Logo atual:</p>
                                  <div className="relative inline-block">
                                    <img
                                      src={sponsor.logo}
                                      alt={`Logo ${sponsor.name}`}
                                      className="max-w-24 max-h-24 object-contain border border-gray-200 rounded-lg shadow-sm"
                                      onError={(e) => {
                                        e.currentTarget.src = "https://placehold.co/100x100?text=Logo+Error";
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                              
                              {/* Upload/Delete Actions */}
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={uploadSponsorLogoMutation.isPending}
                                  onClick={() => document.getElementById(`sponsor-logo-upload-${index}`)?.click()}
                                >
                                  {uploadSponsorLogoMutation.isPending ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Enviando...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4 mr-2" />
                                      {sponsor.logo ? 'Alterar' : 'Upload'}
                                    </>
                                  )}
                                </Button>
                                
                                {sponsor.logo && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteSponsorLogo(index)}
                                    disabled={deleteFileFromGitHubMutation.isPending}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Remover
                                  </Button>
                                )}
                              </div>
                              
                              <input
                                id={`sponsor-logo-upload-${index}`}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleSponsorLogoUpload(e, index)}
                                className="hidden"
                              />
                              
                              <p className="text-xs text-gray-500">
                                Aceita imagens PNG, JPG, GIF. Máximo 10MB. Redimensionado para 300x300px.
                              </p>
                            </div>
                          </div>
                        </div>
                        
                                                <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSponsorToDelete({ index, sponsor })}
                              disabled={deleteFileFromGitHubMutation.isPending}
                              className="ml-4 text-red-600 hover:text-red-700"
                            >
                              {deleteFileFromGitHubMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar remoção do patrocinador</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover o patrocinador <strong>&quot;{sponsor.name || 'sem nome'}&quot;</strong>?
                                <br /><br />
                                {sponsor.logo && sponsor.logo.includes('cdn.jsdelivr.net/gh/') && (
                                  <span className="text-amber-600">
                                    ⚠️ O logo deste patrocinador também será removido permanentemente do GitHub.
                                  </span>
                                )}
                                {sponsor.logo && !sponsor.logo.includes('cdn.jsdelivr.net/gh/') && (
                                  <span className="text-gray-600">
                                    ℹ️ O logo externo não será afetado, apenas a referência será removida.
                                  </span>
                                )}
                                <br /><br />
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setSponsorToDelete(null)}>
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={confirmRemoveSponsor}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={deleteFileFromGitHubMutation.isPending}
                              >
                                {deleteFileFromGitHubMutation.isPending ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Removendo...
                                  </>
                                ) : (
                                  "Remover patrocinador"
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </Card>
                  ))}

                  {config.eventSponsors.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum patrocinador adicionado ainda.</p>
                      <p className="text-sm">Clique em &quot;Adicionar&quot; para começar.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Branding Tab */}
          {activeTab === "branding" && (
            <div className="space-y-6">
              <h3 className="flex items-center space-x-2 text-lg font-semibold">
                <Palette className="w-5 h-5 text-blue-600" />
                <span>Visual e Branding</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Cor Primária</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={config.primaryColor}
                      onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      placeholder="#00508c"
                      value={config.primaryColor}
                      onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Cor Secundária</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={config.secondaryColor}
                      onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      placeholder="#fac800"
                      value={config.secondaryColor}
                      onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Event Logo Upload Section */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Logo do Evento</Label>
                
                {/* Current Logo Preview */}
                {config.eventLogo && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Logo atual:</p>
                    <div className="relative inline-block">
                      <img
                        src={config.eventLogo}
                        alt="Logo do evento"
                        className="max-w-xs max-h-32 object-contain border border-gray-200 rounded-lg shadow-sm"
                        onError={(e) => {
                          e.currentTarget.src = "https://placehold.co/200x100?text=Logo+não+encontrado";
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Upload New Logo */}
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploadingLogo}
                      className="relative"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      {isUploadingLogo ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          {config.eventLogo ? 'Alterar Logo' : 'Enviar Logo'}
                        </>
                      )}
                    </Button>
                    
                    {config.eventLogo && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleDeleteLogo}
                        disabled={deleteFileFromGitHubMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        {deleteFileFromGitHubMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            Removendo...
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4 mr-1" />
                            Delete
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  
                  <p className="text-xs text-gray-500">
                    Aceita imagens PNG, JPG, GIF. Máximo 10MB. Será redimensionado para 1080x1080px e convertido para WebP.
                  </p>
                </div>
              </div>

              {/* Event Status Configuration */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold">Status e Configurações</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventStatus">Status do Evento</Label>
                    <Select value={config.eventStatus} onValueChange={(value) => handleInputChange('eventStatus', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upcoming">Próximo</SelectItem>
                        <SelectItem value="ongoing">Em Andamento</SelectItem>
                        <SelectItem value="past">Finalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Preview Section */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold">Preview das Cores</h4>
                <div className="flex items-center space-x-4">
                  <div 
                    className="w-20 h-20 rounded-lg shadow-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: config.primaryColor }}
                  >
                    Primária
                  </div>
                  <div 
                    className="w-20 h-20 rounded-lg shadow-lg flex items-center justify-center text-gray-800 font-bold"
                    style={{ backgroundColor: config.secondaryColor }}
                  >
                    Secundária
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t">
            <div className="text-sm text-gray-500">
            </div>
            
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="flex items-center space-x-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSaving ? 'Salvando...' : 'Salvar Configuração'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 