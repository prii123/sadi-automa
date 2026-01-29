'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarioTributarioService } from '@/services/calendarioTributarioService';

export interface CalendarioItem {
  id: number;
  empresa_id: number;
  vencimiento_impuesto_id: number;
  fecha_vencimiento: string;
  periodo: string;
  estado: 'pendiente' | 'pagado' | 'vencido' | 'extemporaneo';
  fecha_pago?: string;
  monto_pagado?: number;
  observaciones?: string;
  vencimiento_base: string;
  impuesto_nombre: string;
  impuesto_codigo: string;
  tipo_impuesto: string;
  periodicidad: string;
  anio_fiscal: number;
  periodo_impuesto?: string;
  vencimiento_descripcion?: string;
  google_event_id?: string;
  synced_to_google?: boolean;
  google_last_sync?: string;
  impuesto_color?: string;
  digito?: string;
}

export interface Empresa {
  id: number;
  nombre: string;
  nit: string;
}

export interface Impuesto {
  id: number;
  nombre: string;
  codigo: string;
  tipo: 'nacional' | 'departamental' | 'municipal';
  periodicidad: 'anual' | 'bimestral' | 'cuatrimestral' | 'mensual';
  descripcion: string;
  activo: boolean;
  color?: string;
}

export interface EmpresaImpuesto {
  id: number;
  empresa_id: number;
  impuesto_id: number;
  activo: boolean;
  fecha_asignacion: string;
  impuesto?: Impuesto;
}

export interface VencimientoImpuesto {
  id: number;
  impuesto_id: number;
  anio_fiscal: number;
  periodo?: string;
  descripcion?: string;
  depende_nit?: boolean;
  tipo_dependencia_nit?: 'ultimo_digito' | 'dos_ultimos_digitos';
  digito?: string;
  fecha_vencimiento?: string;
  fechas_por_digito?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

interface CalendarioTributarioComponentProps {
  empresasSource: 'all' | 'contador-asignadas';
  userId?: number;
  titulo?: string;
}

export default function CalendarioTributarioComponent({ 
  empresasSource = 'all', 
  userId, 
  titulo = "Calendario Tributario" 
}: CalendarioTributarioComponentProps) {
  const [calendario, setCalendario] = useState<CalendarioItem[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [impuestos, setImpuestos] = useState<Impuesto[]>([]);
  const [vencimientos, setVencimientos] = useState<VencimientoImpuesto[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<number | null>(null);
  const [empresaSearchText, setEmpresaSearchText] = useState('');
  const [empresaSearchResults, setEmpresaSearchResults] = useState<Empresa[]>([]);
  const [showEmpresaDropdown, setShowEmpresaDropdown] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [empresaImpuestos, setEmpresaImpuestos] = useState<EmpresaImpuesto[]>([]);
  const [showAssignImpuestos, setShowAssignImpuestos] = useState(false);
  const [assigningImpuesto, setAssigningImpuesto] = useState<number | null>(null);
  const [removingImpuesto, setRemovingImpuesto] = useState<number | null>(null);

  // Estados para Google Calendar
  const [syncingToGoogle, setSyncingToGoogle] = useState<number | null>(null);
  const [removingFromGoogle, setRemovingFromGoogle] = useState<number | null>(null);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState<boolean | null>(null);
  const [googleCalendarAuthUrl, setGoogleCalendarAuthUrl] = useState<string | null>(null);
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);
  const [googleCalendarApiDisabled, setGoogleCalendarApiDisabled] = useState(false);

  // Estado para envío de emails
  const [sendingEmails, setSendingEmails] = useState(false);

  // Estados para controlar períodos expandidos por impuesto
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());

  // Función para alternar la expansión de un período
  const togglePeriodExpansion = (impuestoKey: string, periodo: string) => {
    const key = `${impuestoKey}-${periodo}`;
    const newExpanded = new Set(expandedPeriods);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedPeriods(newExpanded);
  };

  // Función para agrupar calendario por impuesto y periodo
  const groupCalendarioByImpuestoAndPeriod = (calendario: CalendarioItem[]) => {
    const grouped: { [impuestoKey: string]: { [periodoKey: string]: CalendarioItem[] } } = {};
    
    calendario.forEach(item => {
      const impuestoKey = `${item.impuesto_codigo} - ${item.impuesto_nombre}`;
      const periodoKey = item.periodo || 'Anual';
      
      if (!grouped[impuestoKey]) {
        grouped[impuestoKey] = {};
      }
      
      if (!grouped[impuestoKey][periodoKey]) {
        grouped[impuestoKey][periodoKey] = [];
      }
      
      grouped[impuestoKey][periodoKey].push(item);
    });

    return grouped;
  };

  const groupedCalendario = groupCalendarioByImpuestoAndPeriod(calendario);

  // Estados para mensajes de OAuth
  const [oauthMessage, setOauthMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estados para formularios
  const [showCreateImpuesto, setShowCreateImpuesto] = useState(false);
  const [showCreateVencimiento, setShowCreateVencimiento] = useState(false);
  const [newImpuesto, setNewImpuesto] = useState({
    nombre: '',
    codigo: '',
    tipo: 'nacional' as 'nacional' | 'departamental' | 'municipal',
    periodicidad: 'mensual' as 'anual' | 'bimestral' | 'cuatrimestral' | 'mensual',
    descripcion: ''
  });
  const [newVencimiento, setNewVencimiento] = useState({
    impuesto_id: 0,
    anio_fiscal: new Date().getFullYear(),
    periodo: '',
    descripcion: '',
    depende_nit: false,
    tipo_dependencia_nit: 'ultimo_digito' as 'ultimo_digito' | 'dos_ultimos_digitos',
    digito: '',
    fecha_vencimiento: '',
    fechas_por_digito: {} as Record<string, string>
  });

  const router = useRouter();
  const searchParams = useSearchParams();

  // Colores disponibles de Google Calendar
  const googleCalendarColors = [
    { id: '7', name: 'Azul', hex: '#039be5' },
    { id: '2', name: 'Verde', hex: '#33b679' },
    { id: '11', name: 'Rojo', hex: '#d60000' },
    { id: '5', name: 'Amarillo', hex: '#f6c026' },
    { id: '6', name: 'Naranja', hex: '#f5511d' },
    { id: '3', name: 'Púrpura', hex: '#8e24aa' },
    { id: '4', name: 'Rosa', hex: '#e67c73' },
    { id: '8', name: 'Gris', hex: '#616161' },
    { id: '9', name: 'Azul Oscuro', hex: '#3f51b5' },
    { id: '10', name: 'Verde Oscuro', hex: '#0b8043' },
    { id: '1', name: 'Lavanda', hex: '#7986cb' }
  ];

  // Función para mapear color hexadecimal a colorId de Google Calendar
  const mapHexToGoogleColorId = (hexColor: string): string => {
    if (!hexColor) return '7'; // Default: Azul

    const normalizedColor = hexColor.toLowerCase();
    const color = googleCalendarColors.find(c => c.hex.toLowerCase() === normalizedColor);

    if (color) {
      return color.id;
    }

    return '7'; // Default: Azul
  };

  useEffect(() => {
    const loadInitialData = async () => {
      const empresaId = searchParams.get('empresaId');
      if (empresaId) {
        // Si hay empresaId en URL, cargar empresas para poder seleccionar la empresa
        setDataLoading(true);
        await loadEmpresas();
        setDataLoading(false);
        setSelectedEmpresa(parseInt(empresaId));
      } else {
        // Si no hay empresaId, terminar la carga inicial
        setDataLoading(false);
      }

      // Manejar parámetros de OAuth callback
      const success = searchParams.get('success');
      const error = searchParams.get('error');
      const message = searchParams.get('message');

      if (success === 'oauth_complete' && message) {
        setOauthMessage({ type: 'success', message: decodeURIComponent(message) });
        setGoogleCalendarConnected(true);
        router.replace('/impuestos/calendario-tributario', { scroll: false });
      } else if (error && message) {
        setOauthMessage({ type: 'error', message: decodeURIComponent(message) });
        setGoogleCalendarConnected(false);
        router.replace('/impuestos/calendario-tributario', { scroll: false });
      } else {
        await checkGoogleCalendarConnection();
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedEmpresa && empresas.length > 0) {
      const empresa = empresas.find(e => e.id === selectedEmpresa);
      if (empresa) {
        const expectedText = `${empresa.nombre} - ${empresa.nit}`;
        if (empresaSearchText !== expectedText) {
          setEmpresaSearchText(expectedText);
        }
      }
      // Cargar calendario automáticamente si existe
      loadCalendario();
    }
  }, [selectedEmpresa, empresas]);

  // El calendario solo se carga cuando el usuario lo genera explícitamente

  // Efecto para búsqueda predictiva de empresas
  useEffect(() => {
    if (empresaSearchText.trim() === '') {
      setEmpresaSearchResults([]);
      setShowEmpresaDropdown(false);
      return;
    }

    const filtered = empresas.filter(empresa =>
      empresa.nombre.toLowerCase().includes(empresaSearchText.toLowerCase()) ||
      empresa.nit.includes(empresaSearchText)
    ).slice(0, 10);

    setEmpresaSearchResults(filtered);
    setShowEmpresaDropdown(filtered.length > 0);
  }, [empresaSearchText, empresas]);

  // Efecto para ocultar mensajes de OAuth después de 5 segundos
  useEffect(() => {
    if (oauthMessage) {
      const timer = setTimeout(() => {
        setOauthMessage(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [oauthMessage]);

  // Efecto para cargar datos cuando se abre el modal de asignar impuestos
  useEffect(() => {
    if (showAssignImpuestos && selectedEmpresa) {
      // Cargar impuestos si no están cargados
      if (impuestos.length === 0) {
        loadImpuestos();
      }
      // Cargar impuestos asignados a la empresa
      loadEmpresaImpuestos(selectedEmpresa);
    }
  }, [showAssignImpuestos, selectedEmpresa]);

  const loadEmpresas = async () => {
    try {
      let url = '/api/empresas';
      if (empresasSource === 'contador-asignadas' && userId) {
        url = `/api/contadores/${userId}/empresas`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setEmpresas(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando empresas:', error);
      setEmpresas([]);
    }
  };

  const loadImpuestos = async () => {
    try {
      const response = await fetch('/api/impuestos');
      const data = await response.json();
      if (data.success) {
        setImpuestos(data.impuestos || []);
      }
    } catch (error) {
      console.error('Error cargando impuestos:', error);
      setImpuestos([]);
    }
  };

  const loadVencimientos = async () => {
    try {
      const response = await fetch('/api/vencimientos-impuestos');
      const data = await response.json();
      if (data.success) {
        setVencimientos(data.vencimientos || []);
      }
    } catch (error) {
      console.error('Error cargando vencimientos:', error);
      setVencimientos([]);
    }
  };

  const loadEmpresaImpuestos = async (empresaId: number) => {
    try {
      const response = await fetch(`/api/empresa-impuestos/${empresaId}/impuestos`);
      const data = await response.json();
      if (data.success) {
        setEmpresaImpuestos(data.impuestos || []);
      } else {
        console.error('Error cargando impuestos de empresa:', data.error);
        setEmpresaImpuestos([]);
      }
    } catch (error) {
      console.error('Error cargando impuestos de empresa:', error);
      setEmpresaImpuestos([]);
    }
  };

  const loadCalendario = async () => {
    if (!selectedEmpresa) {
      return;
    }

    setLoading(true);
    try {
      const url = `/api/calendario-tributario?empresaId=${selectedEmpresa}&year=${selectedYear}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setCalendario(data.data);
      } else {
        console.error('Error en API calendario:', data.error);
        setCalendario([]);
      }
    } catch (error) {
      console.error('Error cargando calendario:', error);
      setCalendario([]);
    } finally {
      setLoading(false);
    }
  };

  const checkGoogleCalendarConnection = async () => {
    try {
      const response = await fetch('/api/google-calendar/status');
      const data = await response.json();

      const wasConnected = googleCalendarConnected;
      setGoogleCalendarConnected(data.connected);
      setGoogleCalendarApiDisabled(data.apiDisabled || false);

      if (data.authRequired) {
        setGoogleCalendarAuthUrl(data.authUrl);
        setShowGoogleAuth(true);
        if (wasConnected === true && !data.connected) {
          setOauthMessage({ type: 'error', message: 'Conexión con Google Calendar perdida. Reautoriza para continuar.' });
        }
      } else {
        setShowGoogleAuth(false);
        setGoogleCalendarAuthUrl(null);
      }

      if (data.apiDisabled) {
        setOauthMessage({ type: 'error', message: 'La API de Google Calendar no está habilitada. Ve a Google Cloud Console para habilitarla.' });
      }
    } catch (error) {
      console.error('Error verificando conexión con Google Calendar:', error);
      setGoogleCalendarConnected(false);
      setGoogleCalendarApiDisabled(false);
      setShowGoogleAuth(false);
      if (googleCalendarConnected === true) {
        setOauthMessage({ type: 'error', message: 'Error verificando conexión con Google Calendar' });
      }
    }
  };

  const asignarImpuesto = async (impuestoId: number) => {
    if (!selectedEmpresa) return;

    setAssigningImpuesto(impuestoId);
    try {
      const response = await fetch(`/api/empresa-impuestos/${selectedEmpresa}/impuestos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ impuesto_id: impuestoId })
      });

      const data = await response.json();
      if (data.success) {
        await loadEmpresaImpuestos(selectedEmpresa);
        alert('Impuesto asignado exitosamente');
      } else {
        alert('Error asignando impuesto: ' + data.error);
      }
    } catch (error) {
      console.error('Error asignando impuesto:', error);
      alert('Error asignando impuesto');
    } finally {
      setAssigningImpuesto(null);
    }
  };

  const desasignarImpuesto = async (impuestoId: number) => {
    if (!selectedEmpresa) return;

    setRemovingImpuesto(impuestoId);
    try {
      const response = await fetch(`/api/empresa-impuestos/${selectedEmpresa}/impuestos/${impuestoId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        await loadEmpresaImpuestos(selectedEmpresa);
        alert('Impuesto desasignado exitosamente');
      } else {
        alert('Error desasignando impuesto: ' + data.error);
      }
    } catch (error) {
      console.error('Error desasignando impuesto:', error);
      alert('Error desasignando impuesto');
    } finally {
      setRemovingImpuesto(null);
    }
  };

  const generarCalendario = async () => {
    if (!selectedEmpresa) return;

    setGenerating(true);
    try {
      // Cargar datos maestros si no están cargados
      if (empresas.length === 0) {
        await loadEmpresas();
      }
      if (impuestos.length === 0) {
        await loadImpuestos();
      }
      if (vencimientos.length === 0) {
        await loadVencimientos();
      }

      // Generar el calendario
      const response = await fetch('/api/calendario-tributario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId: selectedEmpresa, year: selectedYear })
      });

      const data = await response.json();
      if (data.success) {
        await loadCalendario();
        await loadEmpresaImpuestos(selectedEmpresa);
        alert('Calendario tributario generado exitosamente');
      } else {
        alert('Error generando calendario: ' + data.error);
      }
    } catch (error) {
      console.error('Error generando calendario:', error);
      alert('Error generando calendario');
    } finally {
      setGenerating(false);
    }
  };

  // Funciones para búsqueda predictiva de empresas
  const handleEmpresaSearchChange = (value: string) => {
    setEmpresaSearchText(value);
  };

  const handleEmpresaSelect = (empresa: Empresa) => {
    setSelectedEmpresa(empresa.id);
    setEmpresaSearchText(`${empresa.nombre} - ${empresa.nit}`);
    setShowEmpresaDropdown(false);
  };

  const handleEmpresaSearchFocus = async () => {
    // Si no hay empresas cargadas, cargarlas para permitir búsqueda
    if (empresas.length === 0) {
      setDataLoading(true);
      await loadEmpresas();
      setDataLoading(false);
    }

    if (empresaSearchText.trim() !== '' && empresaSearchResults.length > 0) {
      setShowEmpresaDropdown(true);
    }
  };

  const handleEmpresaSearchBlur = () => {
    setTimeout(() => setShowEmpresaDropdown(false), 200);
  };

  const clearEmpresaSelection = () => {
    setSelectedEmpresa(null);
    setEmpresaSearchText('');
    setShowEmpresaDropdown(false);
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pagado': return 'bg-green-100 text-green-800';
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'vencido': return 'bg-red-100 text-red-800';
      case 'extemporaneo': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    // Para fechas en formato YYYY-MM-DD, crear fecha local para evitar problemas de zona horaria
    if (dateString.includes('-') && !dateString.includes('T')) {
      const [year, month, day] = dateString.split('-').map(Number);
      // Crear fecha local (no UTC) para que se muestre correctamente
      const localDate = new Date(year, month - 1, day);
      return localDate.toLocaleDateString('es-CO');
    }
    // Si incluye hora, usar directamente
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  // Función helper para formatear fechas en templates de string
  const formatDateForTemplate = (dateString: string) => {
    return formatDate(dateString);
  };

  // Función helper para convertir fecha string a Date correctamente
  const parseDate = (dateString: string) => {
    // Para fechas en formato YYYY-MM-DD, crear fecha local
    if (dateString.includes('-') && !dateString.includes('T')) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(dateString);
  };

  const actualizarEstado = async (calendarioId: number, nuevoEstado: string) => {
    try {
      const response = await fetch('/api/calendario-tributario/estado', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarioId, estado: nuevoEstado })
      });

      const data = await response.json();
      if (data.success) {
        await loadCalendario();

        // Actualizar el evento en Google Calendar de manera asíncrona (no bloqueante)
        const item = calendario.find(item => item.id === calendarioId);
        if (item && item.google_event_id) {
          // Mapear estado a color hexadecimal
          const getEstadoHexColor = (estado: string) => {
            switch (estado) {
              case 'pagado': return '#10b981'; // Verde
              case 'pendiente': return '#f59e0b'; // Amarillo
              case 'vencido': return '#ef4444'; // Rojo
              case 'extemporaneo': return '#f97316'; // Naranja
              default: return '#6b7280'; // Gris
            }
          };

          const colorId = mapHexToGoogleColorId(getEstadoHexColor(nuevoEstado));

          // Actualizar el evento en Google Calendar sin bloquear la UI
          fetch('/api/google-calendar/events/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              calendarioId: calendarioId,
              colorId: colorId,
              summary: `${item.impuesto_nombre} - ${nuevoEstado.toUpperCase()}`
            })
          }).then(async (response) => {
            if (!response.ok) {
              // Si es error de autenticación, mostrar mensaje
              if (response.status === 401) {
                const errorData = await response.json();
                if (errorData.authRequired && errorData.authUrl) {
                  setGoogleCalendarAuthUrl(errorData.authUrl);
                  setShowGoogleAuth(true);
                  setOauthMessage({ type: 'error', message: 'Se requiere reautorización de Google Calendar para actualizar el evento.' });
                  return;
                }
              }
              console.warn('⚠️ No se pudo actualizar el evento en Google Calendar:', response.status);
              return;
            }

            const result = await response.json();
            if (result.success) {
              console.log('✅ Evento actualizado en Google Calendar:', result.message);
            } else {
              console.warn('⚠️ No se pudo actualizar el evento en Google Calendar:', result.error);
            }
          }).catch((error) => {
            console.error('❌ Error actualizando evento en Google Calendar:', error);
          });
        }
      } else {
        alert('Error actualizando estado: ' + data.error);
      }
    } catch (error) {
      console.error('Error actualizando estado:', error);
      alert('Error actualizando estado');
    }
  };

  const crearImpuesto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/impuestos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newImpuesto)
      });

      const data = await response.json();
      if (data.success) {
        setNewImpuesto({
          nombre: '',
          codigo: '',
          tipo: 'nacional',
          periodicidad: 'mensual',
          descripcion: ''
        });
        setShowCreateImpuesto(false);
        loadImpuestos();
        alert('Impuesto creado exitosamente');
      } else {
        alert('Error creando impuesto: ' + data.error);
      }
    } catch (error) {
      console.error('Error creando impuesto:', error);
      alert('Error creando impuesto');
    }
  };

  const crearVencimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let vencimientoData: any = {
        impuesto_id: newVencimiento.impuesto_id,
        anio_fiscal: newVencimiento.anio_fiscal,
        periodo: newVencimiento.periodo.trim() === '' ? null : newVencimiento.periodo.trim(),
        descripcion: newVencimiento.descripcion,
        depende_nit: newVencimiento.depende_nit,
        tipo_dependencia_nit: newVencimiento.depende_nit ? newVencimiento.tipo_dependencia_nit : null
      };

      if (newVencimiento.depende_nit) {
        // Si depende del NIT, enviar fechas_por_digito
        vencimientoData.fechas_por_digito = newVencimiento.fechas_por_digito;
      } else {
        // Si no depende del NIT, enviar dígito específico y fecha
        vencimientoData.digito = newVencimiento.digito;
        vencimientoData.fecha_vencimiento = newVencimiento.fecha_vencimiento;
      }

      const response = await fetch('/api/vencimientos-impuestos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vencimientoData)
      });

      const data = await response.json();
      if (data.success) {
        setNewVencimiento({
          impuesto_id: 0,
          anio_fiscal: new Date().getFullYear(),
          periodo: '',
          descripcion: '',
          depende_nit: false,
          tipo_dependencia_nit: 'ultimo_digito' as 'ultimo_digito' | 'dos_ultimos_digitos',
          digito: '',
          fecha_vencimiento: '',
          fechas_por_digito: {}
        });
        setShowCreateVencimiento(false);
        loadVencimientos();
        alert('Vencimiento creado exitosamente');
      } else {
        alert('Error creando vencimiento: ' + data.error);
      }
    } catch (error) {
      console.error('Error creando vencimiento:', error);
      alert('Error creando vencimiento');
    }
  };

  const authorizeGoogleCalendar = async () => {
    if (googleCalendarAuthUrl) {
      window.open(googleCalendarAuthUrl, '_blank');
    } else {
      // Intentar obtener authUrl si no está disponible
      try {
        const response = await fetch('/api/google-calendar/status');
        const data = await response.json();
        if (data.authRequired && data.authUrl) {
          setGoogleCalendarAuthUrl(data.authUrl);
          setShowGoogleAuth(true);
          window.open(data.authUrl, '_blank');
        } else {
          alert('No se pudo obtener la URL de autorización. Verifica la configuración de Google Calendar.');
        }
      } catch (error) {
        console.error('Error obteniendo authUrl:', error);
        alert('Error conectando con Google Calendar. Inténtalo de nuevo.');
      }
    }
  };

  const syncToGoogleCalendar = async (calendarioId: number) => {
    if (!selectedEmpresa) return;

    setSyncingToGoogle(calendarioId);
    try {
      const evento = calendario.find(c => c.id === calendarioId);
      if (!evento) {
        alert('Evento no encontrado');
        return;
      }

      const empresa = empresas.find(e => e.id === selectedEmpresa);
      const empresaNombre = empresa ? empresa.nombre : 'Empresa';

      const summary = `Vencimiento Tributario: ${evento.impuesto_nombre}`;
      const description = `Empresa: ${empresaNombre}
Impuesto: ${evento.impuesto_nombre} (${evento.impuesto_codigo})
Tipo: ${evento.tipo_impuesto}
Periodo: ${evento.periodo}
Fecha de vencimiento: ${evento.fecha_vencimiento}
Estado: ${evento.estado}

Generado automáticamente por SADI`;

      const response = await fetch('/api/google-calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarioId,
          summary,
          description,
          startDate: evento.fecha_vencimiento.split('T')[0],
          colorId: mapHexToGoogleColorId(evento.impuesto_color || '#3B82F6')
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          const errorData = await response.json();
          if (errorData.authRequired && errorData.authUrl) {
            setGoogleCalendarAuthUrl(errorData.authUrl);
            setShowGoogleAuth(true);
            setOauthMessage({ type: 'error', message: 'Se requiere reautorización de Google Calendar para sincronizar el evento.' });
            return;
          }
        }
        alert(`Error HTTP ${response.status} agendando evento`);
        return;
      }

      const data = await response.json();
      if (data.success) {
        alert('Evento agendado exitosamente en Google Calendar');
        await loadCalendario();
      } else {
        alert('Error agendando evento: ' + data.error);
      }
    } catch (error) {
      console.error('Error sincronizando con Google Calendar:', error);
      alert('Error sincronizando con Google Calendar');
    } finally {
      setSyncingToGoogle(null);
    }
  };

  const removeFromGoogleCalendar = async (calendarioId: number) => {
    setRemovingFromGoogle(calendarioId);
    try {
      const response = await fetch(`/api/google-calendar/events/${calendarioId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        if (response.status === 401) {
          const errorData = await response.json();
          if (errorData.authRequired && errorData.authUrl) {
            setGoogleCalendarAuthUrl(errorData.authUrl);
            setShowGoogleAuth(true);
            setOauthMessage({ type: 'error', message: 'Se requiere reautorización de Google Calendar para eliminar el evento.' });
            return;
          }
        }
        alert(`Error HTTP ${response.status} eliminando evento`);
        return;
      }

      const data = await response.json();
      if (data.success) {
        alert('Evento eliminado exitosamente de Google Calendar');
        await loadCalendario();
      } else {
        alert('Error eliminando evento: ' + data.error);
      }
    } catch (error) {
      console.error('Error eliminando evento de Google Calendar:', error);
      alert('Error eliminando evento de Google Calendar');
    } finally {
      setRemovingFromGoogle(null);
    }
  };

  const syncAllToGoogleCalendar = async () => {
    if (!selectedEmpresa || !googleCalendarConnected) return;

    const eventosNoSincronizados = calendario.filter(item => !item.synced_to_google);
    if (eventosNoSincronizados.length === 0) {
      alert('Todos los eventos ya están sincronizados con Google Calendar');
      return;
    }

    if (!confirm(`¿Deseas sincronizar ${eventosNoSincronizados.length} eventos con Google Calendar?`)) {
      return;
    }

    setSyncingToGoogle(-1);
    try {
      const empresa = empresas.find(e => e.id === selectedEmpresa);
      const empresaNombre = empresa ? empresa.nombre : 'Empresa';

      const eventos = eventosNoSincronizados.map(evento => ({
        calendarioId: evento.id,
        summary: `Vencimiento Tributario: ${evento.impuesto_nombre}`,
        description: `Empresa: ${empresaNombre}
Impuesto: ${evento.impuesto_nombre} (${evento.impuesto_codigo})
Tipo: ${evento.tipo_impuesto}
Periodo: ${evento.periodo}
Fecha de vencimiento: ${evento.fecha_vencimiento}
Estado: ${evento.estado}

Generado automáticamente por SADI`,
        startDate: evento.fecha_vencimiento.split('T')[0],
        colorId: mapHexToGoogleColorId(evento.impuesto_color || '#3B82F6')
      }));

      const response = await fetch('/api/google-calendar/events/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventos })
      });

      if (!response.ok) {
        if (response.status === 401) {
          const errorData = await response.json();
          if (errorData.authRequired && errorData.authUrl) {
            setGoogleCalendarAuthUrl(errorData.authUrl);
            setShowGoogleAuth(true);
            setOauthMessage({ type: 'error', message: 'Se requiere reautorización de Google Calendar para sincronizar los eventos.' });
            return;
          }
        }
        alert(`Error HTTP ${response.status} sincronizando eventos`);
        return;
      }

      const data = await response.json();
      if (data.success) {
        alert(`${data.sincronizados || eventosNoSincronizados.length} eventos sincronizados exitosamente con Google Calendar`);
        await loadCalendario();
      } else {
        alert('Error sincronizando eventos: ' + data.error);
      }
    } catch (error) {
      console.error('Error sincronizando todos los eventos:', error);
      alert('Error sincronizando eventos con Google Calendar');
    } finally {
      setSyncingToGoogle(null);
    }
  };

  const removeAllFromGoogleCalendar = async () => {
    if (!selectedEmpresa || !googleCalendarConnected) return;

    const eventosSincronizados = calendario.filter(item => item.synced_to_google);
    if (eventosSincronizados.length === 0) {
      alert('No hay eventos sincronizados para eliminar de Google Calendar');
      return;
    }

    if (!confirm(`¿Deseas eliminar ${eventosSincronizados.length} eventos de Google Calendar? Esta acción no se puede deshacer.`)) {
      return;
    }

    setRemovingFromGoogle(-1);
    try {
      const eventosIds = eventosSincronizados.map(evento => evento.id);

      const response = await fetch('/api/google-calendar/events/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventosIds })
      });

      if (!response.ok) {
        if (response.status === 401) {
          const errorData = await response.json();
          if (errorData.authRequired && errorData.authUrl) {
            setGoogleCalendarAuthUrl(errorData.authUrl);
            setShowGoogleAuth(true);
            setOauthMessage({ type: 'error', message: 'Se requiere reautorización de Google Calendar para eliminar los eventos.' });
            return;
          }
        }
        alert(`Error HTTP ${response.status} eliminando eventos`);
        return;
      }

      const data = await response.json();
      if (data.success) {
        alert(`${data.eliminados || eventosSincronizados.length} eventos eliminados exitosamente de Google Calendar`);
        await loadCalendario();
      } else {
        alert('Error eliminando eventos: ' + data.error);
      }
    } catch (error) {
      console.error('Error eliminando todos los eventos:', error);
      alert('Error eliminando eventos de Google Calendar');
    } finally {
      setRemovingFromGoogle(null);
    }
  };

  const sendEmailNotifications = async () => {
    if (!selectedEmpresa) return;

    const eventosPendientes = calendario.filter(item => 
      item.estado === 'pendiente' && 
      parseDate(item.fecha_vencimiento) >= new Date()
    );

    if (eventosPendientes.length === 0) {
      alert('No hay vencimientos pendientes para notificar');
      return;
    }

    if (!confirm(`¿Deseas enviar notificaciones por email para ${eventosPendientes.length} vencimientos pendientes?`)) {
      return;
    }

    setSendingEmails(true);
    try {
      const response = await fetch('/api/calendario-tributario/send-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          empresaId: selectedEmpresa, 
          year: selectedYear 
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`Notificaciones enviadas exitosamente: ${data.enviadas || eventosPendientes.length} emails`);
      } else {
        alert('Error enviando notificaciones: ' + data.error);
      }
    } catch (error) {
      console.error('Error enviando notificaciones:', error);
      alert('Error enviando notificaciones por email');
    } finally {
      setSendingEmails(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {dataLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando datos del calendario tributario...</p>
            <p className="text-sm text-gray-500 mt-2">Verificando conexiones a las APIs...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{titulo}</h1>
                <p className="text-gray-600 mt-2">
                  Gestiona los vencimientos fiscales de tus empresas
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCreateImpuesto(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Crear Impuesto
                </button>
                <button
                  onClick={() => setShowCreateVencimiento(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                >
                  Agregar Vencimiento
                </button>
              </div>
            </div>
            
            {/* Indicador de conexión Google Calendar */}
            <div className="mt-4 flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                googleCalendarConnected === true
                  ? 'bg-green-50 border border-green-200'
                  : googleCalendarApiDisabled
                    ? 'bg-orange-50 border border-orange-200'
                    : googleCalendarConnected === false
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  googleCalendarConnected === true
                    ? 'bg-green-500'
                    : googleCalendarApiDisabled
                      ? 'bg-orange-500'
                      : googleCalendarConnected === false
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                }`}></div>
                <span className={`text-sm font-medium ${
                  googleCalendarConnected === true
                    ? 'text-green-800'
                    : googleCalendarApiDisabled
                      ? 'text-orange-800'
                      : googleCalendarConnected === false
                        ? 'text-red-800'
                        : 'text-yellow-800'
                }`}>
                  {googleCalendarConnected === true
                    ? 'Google Calendar Conectado'
                    : googleCalendarApiDisabled
                      ? 'API de Google Calendar Deshabilitada'
                      : googleCalendarConnected === false
                        ? 'Google Calendar No Conectado'
                        : 'Verificando conexión...'
                  }
                </span>
              </div>

              {/* Mensaje de OAuth */}
              {oauthMessage && (
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  oauthMessage.type === 'success'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <span className={`text-sm font-medium ${
                    oauthMessage.type === 'success'
                      ? 'text-green-800'
                      : 'text-red-800'
                  }`}>
                    {oauthMessage.message}
                  </span>
                  <button
                    onClick={() => setOauthMessage(null)}
                    className={`ml-2 text-sm hover:opacity-75 ${
                      oauthMessage.type === 'success'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Botón de autorización OAuth o habilitar API */}
              {googleCalendarConnected === false && !googleCalendarApiDisabled && (
                <button
                  onClick={authorizeGoogleCalendar}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Conectar Google Calendar
                </button>
              )}

              {/* Botón para habilitar API */}
              {googleCalendarApiDisabled && (
                <a
                  href="https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=925863234529"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 010 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 010-1.414zM10 11a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  Habilitar API de Google Calendar
                </a>
              )}
            </div>
          </div>

          {/* Formulario Crear Impuesto */}
          {showCreateImpuesto && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Crear Nuevo Impuesto</h3>
              <form onSubmit={crearImpuesto} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Impuesto
                  </label>
                  <input
                    type="text"
                    required
                    value={newImpuesto.nombre}
                    onChange={(e) => setNewImpuesto({...newImpuesto, nombre: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Ej: IVA Mensual"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código
                  </label>
                  <input
                    type="text"
                    required
                    value={newImpuesto.codigo}
                    onChange={(e) => setNewImpuesto({...newImpuesto, codigo: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Ej: IVA-M"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo
                  </label>
                  <select
                    value={newImpuesto.tipo}
                    onChange={(e) => setNewImpuesto({...newImpuesto, tipo: e.target.value as any})}
                    className="w-full border border-gray-400 bg-white text-black rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-gray-500 transition-colors"
                  >
                    <option value="nacional">Nacional</option>
                    <option value="departamental">Departamental</option>
                    <option value="municipal">Municipal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Periodicidad
                  </label>
                  <select
                    value={newImpuesto.periodicidad}
                    onChange={(e) => setNewImpuesto({...newImpuesto, periodicidad: e.target.value as any})}
                    className="w-full border border-gray-400 bg-white text-black rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-gray-500 transition-colors"
                  >
                    <option value="mensual">Mensual</option>
                    <option value="bimestral">Bimestral</option>
                    <option value="cuatrimestral">Cuatrimestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={newImpuesto.descripcion}
                    onChange={(e) => setNewImpuesto({...newImpuesto, descripcion: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows={3}
                    placeholder="Descripción del impuesto..."
                  />
                </div>
                <div className="md:col-span-2 flex gap-4">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
                  >
                    Crear Impuesto
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateImpuesto(false)}
                    className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Formulario Crear Vencimiento */}
          {showCreateVencimiento && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Agregar Vencimiento</h3>
              <form onSubmit={crearVencimiento} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Impuesto
                  </label>
                  <select
                    required
                    value={newVencimiento.impuesto_id}
                    onChange={(e) => setNewVencimiento({...newVencimiento, impuesto_id: parseInt(e.target.value)})}
                    className="w-full border border-gray-400 bg-white text-black rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 hover:border-gray-500 transition-colors"
                    disabled={dataLoading}
                  >
                    <option value={0}>
                      {dataLoading ? 'Cargando impuestos...' : 'Seleccionar impuesto...'}
                    </option>
                    {impuestos && impuestos.map((impuesto) => (
                      <option key={impuesto.id} value={impuesto.id}>
                        {impuesto.nombre} ({impuesto.codigo})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Año Fiscal
                  </label>
                  <input
                    type="number"
                    required
                    value={newVencimiento.anio_fiscal}
                    onChange={(e) => setNewVencimiento({...newVencimiento, anio_fiscal: parseInt(e.target.value)})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min={2020}
                    max={2030}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Periodo (opcional)
                  </label>
                  <input
                    type="text"
                    value={newVencimiento.periodo}
                    onChange={(e) => setNewVencimiento({...newVencimiento, periodo: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Ej: 01, 02, Q1, B1"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="depende_nit"
                    checked={newVencimiento.depende_nit}
                    onChange={(e) => setNewVencimiento({...newVencimiento, depende_nit: e.target.checked})}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="depende_nit" className="ml-2 block text-sm text-gray-900">
                    Depende del NIT
                  </label>
                </div>
                {!newVencimiento.depende_nit ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dígito del NIT
                      </label>
                      <input
                        type="text"
                        required
                        value={newVencimiento.digito}
                        onChange={(e) => setNewVencimiento({...newVencimiento, digito: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Ej: 1, 23, A"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha de Vencimiento
                      </label>
                      <input
                        type="date"
                        required
                        value={newVencimiento.fecha_vencimiento}
                        onChange={(e) => setNewVencimiento({...newVencimiento, fecha_vencimiento: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Dependencia del NIT
                      </label>
                      <select
                        required
                        value={newVencimiento.tipo_dependencia_nit}
                        onChange={(e) => setNewVencimiento({...newVencimiento, tipo_dependencia_nit: e.target.value as 'ultimo_digito' | 'dos_ultimos_digitos'})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="ultimo_digito">Último dígito</option>
                        <option value="dos_ultimos_digitos">Dos últimos dígitos</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fechas por Dígito
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-gray-300 rounded-md p-3">
                        {(() => {
                          const digitos = newVencimiento.tipo_dependencia_nit === 'ultimo_digito' 
                            ? ['0','1','2','3','4','5','6','7','8','9']
                            : Array.from({length: 100}, (_, i) => i.toString().padStart(2, '0'));
                          
                          return digitos.map(digito => (
                            <div key={digito} className="flex items-center gap-2">
                              <label className="text-sm font-medium min-w-[40px]">Dígito {digito}:</label>
                              <input
                                type="date"
                                value={newVencimiento.fechas_por_digito[digito] || ''}
                                onChange={(e) => setNewVencimiento({
                                  ...newVencimiento, 
                                  fechas_por_digito: {
                                    ...newVencimiento.fechas_por_digito,
                                    [digito]: e.target.value
                                  }
                                })}
                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                              />
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </>
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={newVencimiento.descripcion}
                    onChange={(e) => setNewVencimiento({...newVencimiento, descripcion: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={2}
                    placeholder="Descripción del vencimiento..."
                  />
                </div>
                <div className="md:col-span-2 flex gap-4">
                  <button
                    type="submit"
                    className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700"
                  >
                    Crear Vencimiento
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateVencimiento(false)}
                    className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Modal Asignar Impuestos */}
          {showAssignImpuestos && selectedEmpresa && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Asignar Impuestos a Empresa
                  </h3>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      Selecciona los impuestos que deseas asignar a la empresa. Solo los impuestos asignados se incluirán en el calendario tributario.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Impuestos disponibles */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3">Impuestos Disponibles</h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {impuestos.filter(impuesto => !empresaImpuestos.some(ei => ei.impuesto_id === impuesto.id)).map((impuesto) => (
                          <div key={impuesto.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                            <div>
                              <p className="font-medium text-gray-900">{impuesto.nombre}</p>
                              <p className="text-sm text-gray-600">{impuesto.codigo} - {impuesto.tipo}</p>
                            </div>
                            <button
                              onClick={() => asignarImpuesto(impuesto.id)}
                              disabled={assigningImpuesto === impuesto.id}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                            >
                              {assigningImpuesto === impuesto.id ? 'Asignando...' : 'Asignar'}
                            </button>
                          </div>
                        ))}
                        {impuestos.filter(impuesto => !empresaImpuestos.some(ei => ei.impuesto_id === impuesto.id)).length === 0 && (
                          <p className="text-gray-500 text-center py-4">Todos los impuestos están asignados</p>
                        )}
                      </div>
                    </div>

                    {/* Impuestos asignados */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3">Impuestos Asignados</h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {empresaImpuestos.map((empresaImpuesto) => {
                          const impuesto = impuestos.find(i => i.id === empresaImpuesto.impuesto_id);
                          if (!impuesto) return null;
                          
                          return (
                            <div key={empresaImpuesto.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-green-50">
                              <div>
                                <p className="font-medium text-gray-900">{impuesto.nombre}</p>
                                <p className="text-sm text-gray-600">{impuesto.codigo} - {impuesto.tipo}</p>
                              </div>
                              <button
                                onClick={() => desasignarImpuesto(impuesto.id)}
                                disabled={removingImpuesto === impuesto.id}
                                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50"
                              >
                                {removingImpuesto === impuesto.id ? 'Eliminando...' : 'Eliminar'}
                              </button>
                            </div>
                          );
                        })}
                        {empresaImpuestos.length === 0 && (
                          <p className="text-gray-500 text-center py-4">No hay impuestos asignados</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 mt-6">
                    <button
                      onClick={() => setShowAssignImpuestos(false)}
                      className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Empresa
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={empresaSearchText}
                    onChange={(e) => handleEmpresaSearchChange(e.target.value)}
                    onFocus={handleEmpresaSearchFocus}
                    onBlur={handleEmpresaSearchBlur}
                    placeholder={dataLoading ? 'Cargando empresas...' : 'Buscar empresa por nombre o NIT...'}
                    className="w-full border border-black bg-white text-black rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-700 transition-colors"
                    disabled={dataLoading}
                  />
                  {selectedEmpresa && (
                    <button
                      onClick={clearEmpresaSelection}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="Limpiar selección"
                    >
                      ✕
                    </button>
                  )}
                  {showEmpresaDropdown && empresaSearchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {empresaSearchResults.map((empresa) => (
                        <button
                          key={empresa.id}
                          onClick={() => handleEmpresaSelect(empresa)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-900"
                        >
                          {empresa.nombre} - {empresa.nit}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Año
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full border border-black bg-white text-black rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-700 transition-colors"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() + i - 2;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => setShowAssignImpuestos(true)}
                  disabled={!selectedEmpresa}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Asignar Impuestos
                </button>
              </div>

              <div className="flex items-end">
                <button
                  onClick={generarCalendario}
                  disabled={!selectedEmpresa || generating}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? 'Generando...' : 'Generar Calendario'}
                </button>
              </div>
            </div>
          </div>

          {/* Calendario */}
          {selectedEmpresa && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {/* Botones de operaciones masivas */}
              {calendario.length > 0 && (
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-gray-600">Operaciones:</span>

                    <button
                      onClick={syncAllToGoogleCalendar}
                      disabled={syncingToGoogle !== null || !googleCalendarConnected || calendario.filter(item => !item.synced_to_google).length === 0}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {syncingToGoogle !== null ? (
                        <>
                          <svg className="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sincronizando...
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v1l-1 5-1 5a2 2 0 01-2 2H6a2 2 0 01-2-2l-1-5-1-5V9a2 2 0 012-2h3z"></path>
                          </svg>
                          Agendar ({calendario.filter(item => !item.synced_to_google).length})
                        </>
                      )}
                    </button>

                    <button
                      onClick={removeAllFromGoogleCalendar}
                      disabled={removingFromGoogle !== null || !googleCalendarConnected || calendario.filter(item => item.synced_to_google).length === 0}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {removingFromGoogle !== null ? (
                        <>
                          <svg className="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Eliminando...
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                          Eliminar ({calendario.filter(item => item.synced_to_google).length})
                        </>
                      )}
                    </button>

                    <button
                      onClick={sendEmailNotifications}
                      disabled={sendingEmails || calendario.filter(item => item.estado === 'pendiente' && parseDate(item.fecha_vencimiento) >= new Date()).length === 0}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {sendingEmails ? (
                        <>
                          <svg className="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Enviando...
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                          </svg>
                          Notificar ({calendario.filter(item => item.estado === 'pendiente' && parseDate(item.fecha_vencimiento) >= new Date()).length})
                        </>
                      )}
                    </button>

                    <div className="ml-auto flex items-center space-x-2 text-xs text-gray-500">
                      <span>Total: {calendario.length}</span>
                      <span>•</span>
                      <span>Pendientes: {calendario.filter(item => item.estado === 'pendiente').length}</span>
                      <span>•</span>
                      <span>Vencidos: {calendario.filter(item => item.estado === 'vencido').length}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Cargando calendario...</p>
                </div>
              ) : calendario.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v1l-1 5-1 5a2 2 0 01-2 2H6a2 2 0 01-2-2l-1-5-1-5V9a2 2 0 012-2h3z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay vencimientos tributarios</h3>
                    <p className="text-gray-600 mb-4">
                      {selectedEmpresa ? 
                        'No se han generado vencimientos para esta empresa y año.' : 
                        'Selecciona una empresa primero.'
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                          {/* Espacio para el botón de expandir */}
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Impuesto
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Periodo
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha Vencimiento
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Google Calendar
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(groupedCalendario).map(([impuestoKey, periodos]) => {
                        return Object.entries(periodos).map(([periodo, items]) => {
                          const impuestoKeyWithPeriodo = `${impuestoKey}-${periodo}`;
                          const isExpanded = expandedPeriods.has(impuestoKeyWithPeriodo);
                          const hasMultipleItems = items.length > 1;
                          const firstItem = items[0];
                        
                        // Calcular estadísticas del grupo
                        const totalItems = items.length;
                        const syncedCount = items.filter(item => item.synced_to_google).length;
                        const pendingCount = items.filter(item => item.estado === 'pendiente').length;
                        const vencidoCount = items.filter(item => item.estado === 'vencido').length;
                        
                          return (
                            <React.Fragment key={impuestoKeyWithPeriodo}>
                            {/* Fila principal del grupo */}
                            <tr className="hover:bg-gray-50">
                              <td className="px-3 py-2 whitespace-nowrap">
                                {hasMultipleItems && (
                                  <button
                                    onClick={() => togglePeriodExpansion(impuestoKey, periodo)}
                                    className="text-gray-500 hover:text-gray-700 focus:outline-none"
                                  >
                                    {isExpanded ? (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path>
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                                      </svg>
                                    )}
                                  </button>
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{firstItem.impuesto_nombre}</div>
                                <div className="text-xs text-gray-500">{firstItem.impuesto_codigo}</div>
                                {hasMultipleItems && (
                                  <div className="text-xs text-blue-600 font-medium mt-1">
                                    {totalItems} vencimientos
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 font-medium">
                                {periodo}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                {hasMultipleItems ? (
                                  <div className="text-xs text-gray-500">
                                    Múltiples fechas
                                  </div>
                                ) : (
                                  <div className="font-medium">
                                    {firstItem.fecha_vencimiento}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="flex flex-col space-y-1">
                                  {pendingCount > 0 && (
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                      {pendingCount} Pendientes
                                    </span>
                                  )}
                                  {vencidoCount > 0 && (
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                      {vencidoCount} Vencidos
                                    </span>
                                  )}
                                  {pendingCount === 0 && vencidoCount === 0 && (
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                      Al día
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="flex items-center space-x-1">
                                  <div className={`w-2 h-2 rounded-full ${syncedCount > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                  <span className="text-xs text-gray-600">
                                    {syncedCount}/{totalItems}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="flex space-x-1">
                                  {syncedCount < totalItems && (
                                    <button
                                      onClick={() => {
                                        const unsyncedItems = items.filter(item => !item.synced_to_google);
                                        if (unsyncedItems.length > 0) {
                                          syncToGoogleCalendar(unsyncedItems[0].id);
                                        }
                                      }}
                                      disabled={syncingToGoogle !== null || !googleCalendarConnected}
                                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                      title="Sincronizar con Google Calendar"
                                    >
                                      {syncingToGoogle === null ? (
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v1l-1 5-1 5a2 2 0 01-2 2H6a2 2 0 01-2-2l-1-5-1-5V9a2 2 0 012-2h3z"></path>
                                        </svg>
                                      ) : (
                                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                      )}
                                    </button>
                                  )}
                                  {syncedCount > 0 && (
                                    <button
                                      onClick={() => {
                                        const syncedItems = items.filter(item => item.synced_to_google);
                                        if (syncedItems.length > 0) {
                                          removeFromGoogleCalendar(syncedItems[0].id);
                                        }
                                      }}
                                      disabled={removingFromGoogle !== null || !googleCalendarConnected}
                                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                      title="Eliminar de Google Calendar"
                                    >
                                      {removingFromGoogle === null ? (
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                        </svg>
                                      ) : (
                                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            
                              {/* Filas expandidas con detalles de dígitos */}
                              {isExpanded && hasMultipleItems && items.map((item, index) => (
                                <tr key={`${impuestoKeyWithPeriodo}-${item.id}`} className="bg-gray-50">
                                <td className="px-3 py-2"></td>
                                <td className="px-3 py-2 pl-8" colSpan={2}>
                                  <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-xs font-medium text-gray-500">Dígito:</span>
                                      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                                        {item.digito || 'N/A'}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-xs font-medium text-gray-500">Vence:</span>
                                      <span className="text-sm font-medium text-gray-900">
                                        {item.fecha_vencimiento}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2"></td>
                                <td className="px-3 py-2">
                                  <select
                                    value={item.estado}
                                    onChange={(e) => actualizarEstado(item.id, e.target.value)}
                                    className={`text-xs px-2 py-1 rounded-full border-0 font-semibold ${getEstadoColor(item.estado)}`}
                                  >
                                    <option value="pendiente">Pendiente</option>
                                    <option value="pagado">Pagado</option>
                                    <option value="vencido">Vencido</option>
                                    <option value="extemporaneo">Extemporáneo</option>
                                  </select>
                                </td>
                                <td className="px-3 py-2">
                                  {item.synced_to_google ? (
                                    <div className="flex items-center space-x-1">
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      <span className="text-xs text-green-700 font-medium">Sí</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-1">
                                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                      <span className="text-xs text-gray-600">No</span>
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex space-x-1">
                                    {!item.synced_to_google ? (
                                      <button
                                        onClick={() => syncToGoogleCalendar(item.id)}
                                        disabled={syncingToGoogle === item.id || !googleCalendarConnected}
                                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        title="Sincronizar con Google Calendar"
                                      >
                                        {syncingToGoogle === item.id ? (
                                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                          </svg>
                                        ) : (
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v1l-1 5-1 5a2 2 0 01-2 2H6a2 2 0 01-2-2l-1-5-1-5V9a2 2 0 012-2h3z"></path>
                                          </svg>
                                        )}
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => removeFromGoogleCalendar(item.id)}
                                        disabled={removingFromGoogle === item.id || !googleCalendarConnected}
                                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        title="Eliminar de Google Calendar"
                                      >
                                        {removingFromGoogle === item.id ? (
                                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                          </svg>
                                        ) : (
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                          </svg>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                      )})})}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Información */}
              <div className="mt-8 bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  ¿Cómo funciona?
                </h3>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• Los vencimientos se calculan automáticamente basados en el NIT de la empresa</li>
                  <li>• La fecha exacta depende del último dígito del NIT y el tipo de impuesto</li>
                  <li>• Puedes generar calendarios para años futuros</li>
                  <li>• Actualiza el estado de los pagos según sea necesario</li>
                </ul>
              </div>
          </div>
      )}
    </>
  )}
  </div> );
};