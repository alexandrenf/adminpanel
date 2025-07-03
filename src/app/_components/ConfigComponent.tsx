"use client";

import React, { useState, useEffect } from 'react';
import { api } from '~/trpc/react';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { useToast } from "../../hooks/use-toast";
import EventConfigComponent from "./EventConfigComponent";
import { 
  Settings, 
  Calendar, 
  MessageSquare, 
  Link as LinkIcon, 
  Save,
  Loader2,
  Bell,
  Users
} from "lucide-react";

export default function ConfigComponent() {
  const [config, setConfig] = useState({
    id: 1,
    toggleDate: false,
    dateStart: '',
    dateEnd: '',
    toggleMessage: false,
    message: '',
    toggleButton: false,
    buttonText: '',
    buttonUrl: '',
    title: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const { data: initialConfig, isLoading } = api.config.get.useQuery();
  const updateConfigMutation = api.config.update.useMutation();

  useEffect(() => {
    if (initialConfig && initialConfig.length > 0) {
      const firstConfig = initialConfig[0];
      setConfig({
        id: firstConfig?.id || 0,
        toggleDate: firstConfig?.toggleDate || false,
        dateStart: (firstConfig?.dateStart?.toISOString().split('T')[0] || ""),
        dateEnd: (firstConfig?.dateEnd?.toISOString().split('T')[0] || ""),
        toggleMessage: firstConfig?.toggleMessage || false,
        message: firstConfig?.message || '',
        toggleButton: firstConfig?.toggleButton || false,
        buttonText: firstConfig?.buttonText || '',
        buttonUrl: firstConfig?.buttonUrl || '',
        title: firstConfig?.title || '',
      });
    }
  }, [initialConfig]);

  const handleInputChange = (field: string, value: string) => {
    setConfig((prevConfig) => ({
      ...prevConfig,
      [field]: value
    }));
  };

  const handleSwitchChange = (field: string, checked: boolean) => {
    setConfig((prevConfig) => ({
      ...prevConfig,
      [field]: checked
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    const updatedConfig = {
      ...config,
      dateStart: config.dateStart || '',
      dateEnd: config.dateEnd || '',
    };

    updateConfigMutation.mutate(updatedConfig, {
      onSuccess: () => {
        setIsSaving(false);
        toast({
          title: "Configuração salva!",
          description: "As configurações foram atualizadas com sucesso.",
        });
      },
      onError: (error) => {
        setIsSaving(false);
        toast({
          title: "Erro ao salvar",
          description: "Ocorreu um erro ao salvar as configurações. Tente novamente.",
          variant: "destructive",
        });
        console.error('Erro ao salvar configuração:', error);
      }
    });
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
            Configurações do Sistema
          </h2>
          <p className="text-gray-600">Configure avisos e eventos da Assembleia Geral</p>
        </div>
      </div>

      {/* Alert Configuration Section */}
      <Card className="w-full max-w-4xl shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <span>Configuração de Alerta</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Date Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <Label className="text-base font-semibold">Agendar Aviso</Label>
                  <p className="text-sm text-gray-600">Habilite para definir datas de início e término</p>
                </div>
              </div>
              <Switch
                checked={config.toggleDate}
                onCheckedChange={(checked) => handleSwitchChange('toggleDate', checked)}
              />
            </div>
            
            {config.toggleDate && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8">
                <div className="space-y-2">
                  <Label htmlFor="dateStart">Data de Início</Label>
                  <Input
                    id="dateStart"
                    type="date"
                    value={config.dateStart}
                    onChange={(e) => handleInputChange('dateStart', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateEnd">Data de Término</Label>
                  <Input
                    id="dateEnd"
                    type="date"
                    value={config.dateEnd}
                    onChange={(e) => handleInputChange('dateEnd', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Title Configuration */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-semibold">Título do Aviso</Label>
            <Input
              id="title"
              placeholder="Digite o título do aviso"
              value={config.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
            />
          </div>

          {/* Message Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <div>
                  <Label className="text-base font-semibold">Mensagem do Aviso</Label>
                  <p className="text-sm text-gray-600">Habilite para definir a mensagem do aviso</p>
                </div>
              </div>
              <Switch
                checked={config.toggleMessage}
                onCheckedChange={(checked) => handleSwitchChange('toggleMessage', checked)}
              />
            </div>
            
            {config.toggleMessage && (
              <div className="space-y-2 pl-8">
                <Label htmlFor="message">Mensagem</Label>
                <Textarea
                  id="message"
                  placeholder="Digite sua mensagem de aviso"
                  value={config.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  rows={4}
                />
              </div>
            )}
          </div>

          {/* Button Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <LinkIcon className="w-5 h-5 text-blue-600" />
                <div>
                  <Label className="text-base font-semibold">Botão do Aviso</Label>
                  <p className="text-sm text-gray-600">Habilite para personalizar o botão</p>
                </div>
              </div>
              <Switch
                checked={config.toggleButton}
                onCheckedChange={(checked) => handleSwitchChange('toggleButton', checked)}
              />
            </div>
            
            {config.toggleButton && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8">
                <div className="space-y-2">
                  <Label htmlFor="buttonText">Texto do Botão</Label>
                  <Input
                    id="buttonText"
                    placeholder="Saiba Mais"
                    value={config.buttonText}
                    onChange={(e) => handleInputChange('buttonText', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buttonUrl">URL do Botão</Label>
                  <Input
                    id="buttonUrl"
                    placeholder="https://exemplo.com"
                    value={config.buttonUrl}
                    onChange={(e) => handleInputChange('buttonUrl', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button variant="outline" disabled={isSaving}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alerta
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AG Event Configuration Section */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Users className="w-6 h-6 text-blue-600" />
          <h3 className="text-2xl font-bold text-gray-900">Configuração da Assembleia Geral</h3>
        </div>
        <EventConfigComponent />
      </div>
    </div>
  );
}
