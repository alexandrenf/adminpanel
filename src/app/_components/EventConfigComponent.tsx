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
import { 
  Calendar, 
  MapPin, 
  Download, 
  Users, 
  Palette,
  Globe,
  Save,
  Loader2,
  Plus,
  X,
  FileText,
  ExternalLink
} from "lucide-react";

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
  eventNumber?: number;
  eventTitle: string;
  eventDescription: string;
  eventLogo?: string;
  eventDateStart?: Date;
  eventDateEnd?: Date;
  eventCity?: string;
  eventState?: string;
  eventVenue?: string;
  eventAddress?: string;
  survivalKitUrl?: string;
  registrationUrl?: string;
  survivalKitStatus: "available" | "coming_soon" | "disabled";
  registrationStatus: "available" | "coming_soon" | "disabled";
  eventContent?: string;
  eventSponsors: Sponsor[];
  primaryColor: string;
  secondaryColor: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  showSponsors: boolean;
  showDownloads: boolean;
  eventStatus: "upcoming" | "ongoing" | "past";
  registrationOpen: boolean;
}

export default function EventConfigComponent() {
  const [config, setConfig] = useState<EventConfig>({
    eventType: "alert",
    eventActive: false,
    eventTitle: "",
    eventDescription: "",
    survivalKitStatus: "coming_soon",
    registrationStatus: "coming_soon",
    eventSponsors: [],
    primaryColor: "#00508c",
    secondaryColor: "#fac800",
    showSponsors: true,
    showDownloads: true,
    eventStatus: "upcoming",
    registrationOpen: false,
  });
  
  const [activeTab, setActiveTab] = useState<"basic" | "content" | "sponsors" | "branding">("basic");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadToGitHub, setUploadToGitHub] = useState(false);
  const [configId, setConfigId] = useState<number>(1);
  const { toast } = useToast();

  const { data: initialConfig, isLoading } = api.config.getEventWithDetails.useQuery();
  const updateEventMutation = api.config.updateEvent.useMutation();

  useEffect(() => {
    if (initialConfig) {
      setConfigId(initialConfig.id || 1);
      setConfig({
        eventType: "ag", // Always AG for this component
        eventActive: initialConfig.eventActive || false,
        eventNumber: initialConfig.eventNumber || undefined,
        eventTitle: initialConfig.eventTitle || "",
        eventDescription: initialConfig.eventDescription || "",
        eventLogo: initialConfig.eventLogo || "",
        eventDateStart: initialConfig.eventDateStart || undefined,
        eventDateEnd: initialConfig.eventDateEnd || undefined,
        eventCity: initialConfig.eventCity || "",
        eventState: initialConfig.eventState || "",
        eventVenue: initialConfig.eventVenue || "",
        eventAddress: initialConfig.eventAddress || "",
        survivalKitUrl: initialConfig.survivalKitUrl || "",
        registrationUrl: initialConfig.registrationUrl || "",
        survivalKitStatus: (initialConfig.survivalKitStatus as "available" | "coming_soon" | "disabled") || "coming_soon",
        registrationStatus: (initialConfig.registrationStatus as "available" | "coming_soon" | "disabled") || "coming_soon",
        eventContent: initialConfig.eventContent || "",
        eventSponsors: Array.isArray(initialConfig.eventSponsors) ? initialConfig.eventSponsors : [],
        primaryColor: initialConfig.primaryColor || "#00508c",
        secondaryColor: initialConfig.secondaryColor || "#fac800",
        metaTitle: initialConfig.metaTitle || "",
        metaDescription: initialConfig.metaDescription || "",
        metaKeywords: initialConfig.metaKeywords || "",
        showSponsors: initialConfig.showSponsors || true,
        showDownloads: initialConfig.showDownloads || true,
        eventStatus: (initialConfig.eventStatus as "upcoming" | "ongoing" | "past") || "upcoming",
        registrationOpen: initialConfig.registrationOpen || false,
      });
    }
  }, [initialConfig]);

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
    const newSponsors = config.eventSponsors.filter((_, i) => i !== index);
    setConfig((prevConfig) => ({
      ...prevConfig,
      eventSponsors: newSponsors
    }));
  };



  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateEventMutation.mutateAsync({
        id: configId,
        eventConfig: config,
        uploadContent: uploadToGitHub,
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

              {/* Event Details */}
              {config.eventType === "ag" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventNumber">Número da AG</Label>
                    <Input
                      id="eventNumber"
                      type="number"
                      placeholder="Ex: 63"
                      value={config.eventNumber || ""}
                      onChange={(e) => handleInputChange('eventNumber', parseInt(e.target.value) || undefined)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eventTitle">Título do Evento</Label>
                    <Input
                      id="eventTitle"
                      placeholder="Ex: 63ª Assembleia Geral"
                      value={config.eventTitle}
                      onChange={(e) => handleInputChange('eventTitle', e.target.value)}
                    />
                  </div>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="eventVenue">Local do Evento</Label>
                      <Input
                        id="eventVenue"
                        placeholder="Hotel Grand Mercure"
                        value={config.eventVenue || ""}
                        onChange={(e) => handleInputChange('eventVenue', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eventAddress">Endereço Completo</Label>
                      <Input
                        id="eventAddress"
                        placeholder="Endereço completo do venue"
                        value={config.eventAddress || ""}
                        onChange={(e) => handleInputChange('eventAddress', e.target.value)}
                      />
                    </div>
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
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={uploadToGitHub}
                    onCheckedChange={setUploadToGitHub}
                  />
                  <Label className="text-sm">Salvar no GitHub</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventContent">Conteúdo Detalhado (Markdown)</Label>
                <Textarea
                  id="eventContent"
                  placeholder="## Sobre o Evento&#10;&#10;Markdown content aqui..."
                  value={config.eventContent || ""}
                  onChange={(e) => handleInputChange('eventContent', e.target.value)}
                  rows={15}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  Use Markdown para formatação. Se ativar &quot;Salvar no GitHub&quot;, o conteúdo será armazenado externamente.
                </p>
              </div>

              {/* SEO Section */}
              <div className="space-y-4">
                <h4 className="flex items-center space-x-2 text-base font-semibold">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>SEO e Metadados</span>
                </h4>

                <div className="space-y-2">
                  <Label htmlFor="metaTitle">Título da Página</Label>
                  <Input
                    id="metaTitle"
                    placeholder="63ª Assembleia Geral - IFMSA Brazil"
                    value={config.metaTitle || ""}
                    onChange={(e) => handleInputChange('metaTitle', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaDescription">Meta Descrição</Label>
                  <Textarea
                    id="metaDescription"
                    placeholder="Junte-se a nós na 63ª Assembleia Geral da IFMSA Brazil..."
                    value={config.metaDescription || ""}
                    onChange={(e) => handleInputChange('metaDescription', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaKeywords">Palavras-chave (separadas por vírgula)</Label>
                  <Input
                    id="metaKeywords"
                    placeholder="assembleia, ifmsa, medicina, estudantes"
                    value={config.metaKeywords || ""}
                    onChange={(e) => handleInputChange('metaKeywords', e.target.value)}
                  />
                </div>
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
                            <Label>Logo (URL)</Label>
                            <Input
                              placeholder="https://example.com/logo.png"
                              value={sponsor.logo || ""}
                              onChange={(e) => handleSponsorChange(index, 'logo', e.target.value)}
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
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeSponsor(index)}
                          className="ml-4 text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
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

              <div className="space-y-2">
                <Label htmlFor="eventLogo">Logo do Evento (URL)</Label>
                <Input
                  id="eventLogo"
                  placeholder="/images/assembleia-geral.png"
                  value={config.eventLogo || ""}
                  onChange={(e) => handleInputChange('eventLogo', e.target.value)}
                />
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

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-base font-semibold">Registro Aberto</Label>
                      <p className="text-sm text-gray-600">Permitir novos registros</p>
                    </div>
                    <Switch
                      checked={config.registrationOpen}
                      onCheckedChange={(checked) => handleInputChange('registrationOpen', checked)}
                    />
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
              {uploadToGitHub && activeTab === "content" && (
                <div className="flex items-center space-x-2">
                  <ExternalLink className="w-4 h-4" />
                  <span>Conteúdo será salvo no GitHub ao salvar</span>
                </div>
              )}
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