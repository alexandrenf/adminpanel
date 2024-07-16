"use client";

import React, { useState, useEffect } from 'react';
import { api } from '~/trpc/react';
import { Card, CardHeader, CardContent, CardActions, Typography, Grid, TextField, Switch, Button, FormControlLabel, Snackbar, CircularProgress } from '@mui/material';
import Alert from '@mui/material/Alert';

export default function ConfigComponent() {
  const [config, setConfig] = useState({
    id: 1,  // Assuming there's only one config item and its ID is 1
    toggleDate: false,
    dateStart: '',
    dateEnd: '',
    toggleMessage: false,
    message: '',
    toggleButton: false,
    buttonText: '',
    buttonUrl: '',
    toggleColor: false,
    color: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
        toggleColor: firstConfig?.toggleColor || false,
        color: firstConfig?.color || '',
      });
    }
  }, [initialConfig]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type, checked } = event.target;
    setConfig((prevConfig) => ({
      ...prevConfig,
      [id]: type === 'checkbox' ? checked : value
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
      onSuccess: (response) => {
        setIsSaving(false);
        setSuccessMessage('Configuração salva com sucesso!');
      },
      onError: (error) => {
        setIsSaving(false);
        console.error('Erro ao salvar configuração:', error);
      }
    });
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card style={{ width: '100%', maxWidth: '4xl' }}>
      <CardHeader
        title="Configuração de Aviso"
        subheader="Configure os detalhes do aviso."
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  id="toggleDate"
                  checked={config.toggleDate}
                  onChange={handleChange}
                />
              }
              label={
                <div>
                  <Typography variant="subtitle1">Agendar Aviso</Typography>
                  <Typography variant="body2" color="textSecondary">Habilite para definir datas de início e término.</Typography>
                </div>
              }
              labelPlacement="start"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Data de Início"
              type="date"
              InputLabelProps={{ shrink: true }}
              id="dateStart"
              value={config.dateStart}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Data de Término"
              type="date"
              InputLabelProps={{ shrink: true }}
              id="dateEnd"
              value={config.dateEnd}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  id="toggleMessage"
                  checked={config.toggleMessage}
                  onChange={handleChange}
                />
              }
              label={
                <div>
                  <Typography variant="subtitle1">Mensagem do Aviso</Typography>
                  <Typography variant="body2" color="textSecondary">Habilite para definir a mensagem do aviso.</Typography>
                </div>
              }
              labelPlacement="start"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Mensagem"
              placeholder="Digite sua mensagem de aviso"
              id="message"
              value={config.message}
              onChange={handleChange}
              multiline
              rows={4}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  id="toggleButton"
                  checked={config.toggleButton}
                  onChange={handleChange}
                />
              }
              label={
                <div>
                  <Typography variant="subtitle1">Botão do Aviso</Typography>
                  <Typography variant="body2" color="textSecondary">Habilite para personalizar o botão.</Typography>
                </div>
              }
              labelPlacement="start"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Texto do Botão"
              placeholder="Saiba Mais"
              id="buttonText"
              value={config.buttonText}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="URL do Botão"
              placeholder="https://exemplo.com"
              id="buttonUrl"
              value={config.buttonUrl}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  id="toggleColor"
                  checked={config.toggleColor}
                  onChange={handleChange}
                />
              }
              label={
                <div>
                  <Typography variant="subtitle1">Cor de Fundo do Aviso</Typography>
                  <Typography variant="body2" color="textSecondary">Habilite para definir uma cor de fundo personalizada.</Typography>
                </div>
              }
              labelPlacement="start"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Cor de Fundo"
              id="color"
              value={config.color}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
        </Grid>
      </CardContent>
      <CardActions style={{ justifyContent: 'flex-end', gap: '1rem' }}>
        <Button variant="outlined">Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <CircularProgress size={24} /> : 'Salvar Alterações'}
        </Button>
      </CardActions>
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
      >
        <Alert onClose={() => setSuccessMessage('')} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>
    </Card>
  );
}
