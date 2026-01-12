'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CalendarioTributarioService } from '@/services/calendarioTributarioService';
import { EmpresaService } from '@/services/empresaService';
import { VencimientoImpuesto } from '@/services/calendarioTributarioService';

interface CalendarioItem {
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
}

interface Empresa {
  id: number;
  nombre: string;
  nit: string;
}

interface Impuesto {
  id: number;
  nombre: string;
  codigo: string;
  tipo: 'nacional' | 'departamental' | 'municipal';
  periodicidad: 'anual' | 'bimestral' | 'cuatrimestral' | 'mensual';
  descripcion: string;
  activo: boolean;
}

interface EmpresaImpuesto {
  id: number;
  empresa_id: number;
  impuesto_id: number;
  activo: boolean;
  fecha_asignacion: string;
  impuesto?: Impuesto;
}

export default function CalendarioTributarioPage() {
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

  // Estados para operaciones masivas
  const [syncingAllToGoogle, setSyncingAllToGoogle] = useState(false);
  const [removingAllFromGoogle, setRemovingAllFromGoogle] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);

  // Estados para mensajes de OAuth
  const [oauthMessage, setOauthMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Efecto para ocultar mensajes de OAuth después de 5 segundos
  useEffect(() => {
    if (oauthMessage) {
      const timer = setTimeout(() => {
        setOauthMessage(null);
      }, 5000); // 5 segundos

      return () => clearTimeout(timer);
    }
  }, [oauthMessage]);

  // Efecto para verificar conexión cuando cambie el estado
  useEffect(() => {
    if (googleCalendarConnected === null) {
      checkGoogleCalendarConnection();
    }
  }, [googleCalendarConnected]);

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
    fecha_vencimiento: '',
    descripcion: ''
  });

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const loadInitialData = async () => {
      setDataLoading(true);
      await Promise.all([loadEmpresas(), loadImpuestos(), loadVencimientos()]);
      setDataLoading(false);

      const empresaId = searchParams.get('empresaId');
      if (empresaId) {
        setSelectedEmpresa(parseInt(empresaId));
      }

      // Verificar conexión de Google Calendar al cargar la página
      await checkGoogleCalendarConnection();

      // Manejar parámetros de OAuth callback
      const success = searchParams.get('success');
      const error = searchParams.get('error');
      const message = searchParams.get('message');

      if (success === 'oauth_complete' && message) {
        setOauthMessage({ type: 'success', message: decodeURIComponent(message) });
        // Guardar en localStorage que se acaba de autorizar
        localStorage.setItem('googleCalendarJustAuthorized', 'true');
        // Limpiar los parámetros de la URL
        router.replace('/calendario-tributario', { scroll: false });
      } else if (error && message) {
        setOauthMessage({ type: 'error', message: decodeURIComponent(message) });
        // Limpiar los parámetros de la URL
        router.replace('/calendario-tributario', { scroll: false });
      } else {
        // Verificar si se acaba de autorizar (desde localStorage)
        const justAuthorized = localStorage.getItem('googleCalendarJustAuthorized');
        if (justAuthorized === 'true') {
          localStorage.removeItem('googleCalendarJustAuthorized');
          // Mostrar mensaje de éxito si está conectado
          setTimeout(() => {
            if (googleCalendarConnected === true) {
              setOauthMessage({ type: 'success', message: 'Google Calendar autorizado exitosamente' });
            }
          }, 1000); // Pequeño delay para asegurar que el estado esté actualizado
        }
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
    }
  }, [selectedEmpresa, empresas]);

  // Efecto para cargar calendario cuando cambian empresa o año
  useEffect(() => {
    if (selectedEmpresa) {
      loadCalendario();
      loadEmpresaImpuestos(selectedEmpresa);
    }
  }, [selectedEmpresa, selectedYear]);

  useEffect(() => {
    checkGoogleCalendarConnection();
  }, []);

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
    ).slice(0, 10); // Limitar a 10 resultados

    setEmpresaSearchResults(filtered);
    setShowEmpresaDropdown(filtered.length > 0);
  }, [empresaSearchText, empresas]);

  const loadEmpresas = async () => {
    try {
      const response = await fetch('/api/empresas');
      const data = await response.json();
      if (data.success) {
        setEmpresas(data.data || []);
      } else {
        console.error('Error en la API de empresas:', data.error);
        setEmpresas([]);
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
      } else {
        console.error('Error en la API de impuestos:', data.error);
        setImpuestos([]);
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
      } else {
        console.error('Error en la API de vencimientos:', data.error);
        setVencimientos([]);
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

  // Funciones para búsqueda predictiva de empresas
  const handleEmpresaSearchChange = (value: string) => {
    setEmpresaSearchText(value);
  };

  const handleEmpresaSelect = (empresa: Empresa) => {
    setSelectedEmpresa(empresa.id);
    setEmpresaSearchText(`${empresa.nombre} - ${empresa.nit}`);
    setShowEmpresaDropdown(false);
  };

  const handleEmpresaSearchFocus = () => {
    if (empresaSearchText.trim() !== '' && empresaSearchResults.length > 0) {
      setShowEmpresaDropdown(true);
    }
  };

  const handleEmpresaSearchBlur = () => {
    // Delay para permitir que el click en las opciones funcione
    setTimeout(() => setShowEmpresaDropdown(false), 200);
  };

  const clearEmpresaSelection = () => {
    setSelectedEmpresa(null);
    setEmpresaSearchText('');
    setShowEmpresaDropdown(false);
  };

  // Funciones para Google Calendar
  const authorizeGoogleCalendar = async () => {
    if (googleCalendarAuthUrl) {
      window.open(googleCalendarAuthUrl, '_blank');
    }
  };

  const completeGoogleAuth = async (authCode: string) => {
    try {
      const response = await fetch('/api/google-calendar/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode })
      });

      const data = await response.json();
      if (data.success) {
        alert('Autorización completada exitosamente');
        setShowGoogleAuth(false);
        await checkGoogleCalendarConnection();
      } else {
        alert('Error en autorización: ' + data.error);
      }
    } catch (error) {
      console.error('Error completando autorización:', error);
      alert('Error completando autorización');
    }
  };

  const checkGoogleCalendarConnection = async () => {
    try {
      const response = await fetch('/api/google-calendar/status');
      const data = await response.json();

      const wasConnected = googleCalendarConnected;
      setGoogleCalendarConnected(data.connected);

      if (data.authRequired) {
        setGoogleCalendarAuthUrl(data.authUrl);
        setShowGoogleAuth(true);
        // No mostrar mensaje de error si ya estaba desconectado
        if (wasConnected === true) {
          setOauthMessage({ type: 'error', message: 'Conexión con Google Calendar perdida. Reautoriza para continuar.' });
        }
      } else {
        setShowGoogleAuth(false);
        setGoogleCalendarAuthUrl(null);
        // Solo mostrar mensaje de éxito si antes estaba desconectado y ahora está conectado
        if (wasConnected === false && data.connected === true) {
          setOauthMessage({ type: 'success', message: 'Google Calendar autorizado exitosamente' });
        }
      }
    } catch (error) {
      console.error('Error verificando conexión con Google Calendar:', error);
      setGoogleCalendarConnected(false);
      setShowGoogleAuth(false);
      // Solo mostrar error si antes estaba conectado
      if (googleCalendarConnected === true) {
        setOauthMessage({ type: 'error', message: 'Error verificando conexión con Google Calendar' });
      }
    }
  };

  const syncToGoogleCalendar = async (calendarioId: number) => {
    if (!selectedEmpresa) return;

    setSyncingToGoogle(calendarioId);
    try {
      // Obtener información del evento
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
Fecha de vencimiento: ${new Date(evento.fecha_vencimiento).toLocaleDateString('es-CO')}
Estado: ${evento.estado}

Generado automáticamente por SADI`;

      const response = await fetch('/api/google-calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarioId,
          summary,
          description,
          startDate: evento.fecha_vencimiento.split('T')[0], // Solo la fecha, sin hora
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Evento agendado exitosamente en Google Calendar');
        await loadCalendario(); // Recargar para mostrar el estado actualizado
      } else {
        // Si se requiere autorización, mostrar el mensaje correspondiente
        if (data.authRequired) {
          alert('Se requiere autorización de Google Calendar. Haz clic en "Autorizar Google Calendar" en la parte superior.');
        } else {
          alert('Error agendando evento: ' + data.error);
        }
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

      const data = await response.json();
      if (data.success) {
        alert('Evento eliminado exitosamente de Google Calendar');
        await loadCalendario(); // Recargar para mostrar el estado actualizado
      } else {
        // Si se requiere autorización, mostrar el mensaje correspondiente
        if (data.authRequired) {
          alert('Se requiere autorización de Google Calendar. Haz clic en "Autorizar Google Calendar" en la parte superior.');
        } else {
          alert('Error eliminando evento: ' + data.error);
        }
      }
    } catch (error) {
      console.error('Error eliminando evento de Google Calendar:', error);
      alert('Error eliminando evento de Google Calendar');
    } finally {
      setRemovingFromGoogle(null);
    }
  };

  // Funciones para operaciones masivas
  const syncAllToGoogleCalendar = async () => {
    if (!selectedEmpresa) return;

    const unsyncedEvents = calendario.filter(c => !c.synced_to_google);
    if (unsyncedEvents.length === 0) {
      alert('No hay eventos pendientes de sincronizar');
      return;
    }

    setSyncingAllToGoogle(true);
    try {
      const empresa = empresas.find(e => e.id === selectedEmpresa);
      const empresaNombre = empresa ? empresa.nombre : 'Empresa';

      const syncPromises = unsyncedEvents.map(async (evento) => {
        const summary = `Vencimiento Tributario: ${evento.impuesto_nombre}`;
        const description = `Empresa: ${empresaNombre}
Impuesto: ${evento.impuesto_nombre} (${evento.impuesto_codigo})
Tipo: ${evento.tipo_impuesto}
Periodo: ${evento.periodo}
Fecha de vencimiento: ${new Date(evento.fecha_vencimiento).toLocaleDateString('es-CO')}
Estado: ${evento.estado}

Generado automáticamente por SADI`;

        const response = await fetch('/api/google-calendar/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            calendarioId: evento.id,
            summary,
            description,
            startDate: evento.fecha_vencimiento.split('T')[0],
          })
        });

        return response.json();
      });

      const results = await Promise.all(syncPromises);
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.length - successCount;

      if (successCount > 0) {
        alert(`${successCount} eventos sincronizados exitosamente en Google Calendar${errorCount > 0 ? `. ${errorCount} errores.` : ''}`);
        await loadCalendario();
      } else {
        alert('Error sincronizando eventos');
      }
    } catch (error) {
      console.error('Error sincronizando eventos masivamente:', error);
      alert('Error sincronizando eventos masivamente');
    } finally {
      setSyncingAllToGoogle(false);
    }
  };

  const removeAllFromGoogleCalendar = async () => {
    const syncedEvents = calendario.filter(c => c.synced_to_google);
    if (syncedEvents.length === 0) {
      alert('No hay eventos sincronizados para eliminar');
      return;
    }

    setRemovingAllFromGoogle(true);
    try {
      const deletePromises = syncedEvents.map(async (evento) => {
        const response = await fetch(`/api/google-calendar/events/${evento.id}`, {
          method: 'DELETE'
        });
        return response.json();
      });

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.length - successCount;

      if (successCount > 0) {
        alert(`${successCount} eventos eliminados exitosamente de Google Calendar${errorCount > 0 ? `. ${errorCount} errores.` : ''}`);
        await loadCalendario();
      } else {
        alert('Error eliminando eventos');
      }
    } catch (error) {
      console.error('Error eliminando eventos masivamente:', error);
      alert('Error eliminando eventos masivamente');
    } finally {
      setRemovingAllFromGoogle(false);
    }
  };

  const sendEmailsForEvents = async () => {
    if (!selectedEmpresa) return;

    const eventsToNotify = calendario.filter(c => c.estado === 'pendiente');
    if (eventsToNotify.length === 0) {
      alert('No hay eventos pendientes para notificar');
      return;
    }

    setSendingEmails(true);
    try {
      // Obtener información de contacto de la empresa y contador
      const [contactoResponse, contadorResponse] = await Promise.all([
        fetch(`/api/empresas/${empresas.find(e => e.id === selectedEmpresa)?.nit}/contacto`),
        fetch(`/api/empresas/${empresas.find(e => e.id === selectedEmpresa)?.nit}/contador-info`)
      ]);

      const contactoData = await contactoResponse.json();
      const contadorData = await contadorResponse.json();

      const emails = [];
      if (contactoData.success && contactoData.contacto?.email) {
        emails.push(contactoData.contacto.email);
      }
      if (contadorData.success && contadorData.contador?.email) {
        emails.push(contadorData.contador.email);
      }

      if (emails.length === 0) {
        alert('No se encontraron correos electrónicos para enviar notificaciones');
        return;
      }

      const empresa = empresas.find(e => e.id === selectedEmpresa);
      const empresaNombre = empresa ? empresa.nombre : 'Empresa';

      const response = await fetch('/api/calendario-tributario/send-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId: selectedEmpresa,
          empresaNombre,
          events: eventsToNotify,
          emails
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`Notificaciones enviadas exitosamente a ${emails.length} destinatarios`);
      } else {
        alert('Error enviando notificaciones: ' + data.error);
      }
    } catch (error) {
      console.error('Error enviando notificaciones:', error);
      alert('Error enviando notificaciones');
    } finally {
      setSendingEmails(false);
    }
  };

  const loadCalendario = async () => {
    if (!selectedEmpresa) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/calendario-tributario?empresaId=${selectedEmpresa}&year=${selectedYear}`
      );
      const data = await response.json();
      if (data.success) {
        setCalendario(data.data);
      }
    } catch (error) {
      console.error('Error cargando calendario:', error);
    } finally {
      setLoading(false);
    }
  };

  const generarCalendario = async () => {
    if (!selectedEmpresa) return;

    setGenerating(true);
    try {
      const response = await fetch('/api/calendario-tributario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId: selectedEmpresa, year: selectedYear })
      });

      const data = await response.json();
      if (data.success) {
        await loadCalendario(); // Recargar el calendario
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

  const actualizarEstado = async (calendarioId: number, nuevoEstado: string) => {
    try {
      const response = await fetch('/api/calendario-tributario/estado', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarioId, estado: nuevoEstado })
      });

      const data = await response.json();
      if (data.success) {
        await loadCalendario(); // Recargar el calendario
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
      const vencimientoData = {
        ...newVencimiento,
        periodo: newVencimiento.periodo.trim() === '' ? null : newVencimiento.periodo.trim()
      };

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
          fecha_vencimiento: '',
          descripcion: ''
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
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {dataLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando datos del calendario tributario...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Calendario Tributario
            </h1>
            <p className="text-gray-600">
              Gestiona los vencimientos tributarios de tus empresas
            </p>
            
            {/* Indicador de conexión Google Calendar */}
            <div className="mt-4 flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                googleCalendarConnected === true
                  ? 'bg-green-50 border border-green-200'
                  : googleCalendarConnected === false
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  googleCalendarConnected === true
                    ? 'bg-green-500'
                    : googleCalendarConnected === false
                      ? 'bg-red-500'
                      : 'bg-yellow-500'
                }`}></div>
                <span className={`text-sm font-medium ${
                  googleCalendarConnected === true
                    ? 'text-green-800'
                    : googleCalendarConnected === false
                      ? 'text-red-800'
                      : 'text-yellow-800'
                }`}>
                  {googleCalendarConnected === true
                    ? 'Google Calendar Conectado'
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
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    oauthMessage.type === 'success'
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`}>
                    {oauthMessage.type === 'success' ? (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
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

              {/* Botón de autorización OAuth */}
              {showGoogleAuth && googleCalendarAuthUrl && (
                <button
                  onClick={authorizeGoogleCalendar}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Autorizar Google Calendar
                </button>
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
                    {impuestos
                      .filter(impuesto =>
                        !empresaImpuestos.some(ei => ei.impuesto_id === impuesto.id)
                      )
                      .map(impuesto => (
                        <div key={impuesto.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                          <div>
                            <div className="font-medium text-gray-900">{impuesto.nombre}</div>
                            <div className="text-sm text-gray-500">{impuesto.codigo} - {impuesto.tipo}</div>
                          </div>
                          <button
                            onClick={() => asignarImpuesto(impuesto.id)}
                            disabled={assigningImpuesto === impuesto.id}
                            className={`px-3 py-1 rounded-md text-sm ${
                              assigningImpuesto === impuesto.id
                                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {assigningImpuesto === impuesto.id ? 'Asignando...' : 'Asignar'}
                          </button>
                        </div>
                      ))}
                    {impuestos.filter(impuesto =>
                      !empresaImpuestos.some(ei => ei.impuesto_id === impuesto.id)
                    ).length === 0 && (
                      <p className="text-gray-500 text-sm">No hay impuestos disponibles para asignar</p>
                    )}
                  </div>
                </div>

                {/* Impuestos asignados */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Impuestos Asignados</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {empresaImpuestos.map(empresaImpuesto => (
                      <div key={empresaImpuesto.id} className="flex items-center justify-between p-3 border border-blue-200 bg-blue-50 rounded-md">
                        <div>
                          <div className="font-medium text-gray-900">
                            {empresaImpuesto.impuesto?.nombre || 'Cargando...'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {empresaImpuesto.impuesto?.codigo} - {empresaImpuesto.impuesto?.tipo}
                          </div>
                        </div>
                        <button
                          onClick={() => desasignarImpuesto(empresaImpuesto.impuesto_id)}
                          disabled={removingImpuesto === empresaImpuesto.impuesto_id}
                          className={`px-3 py-1 rounded-md text-sm ${
                            removingImpuesto === empresaImpuesto.impuesto_id
                              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {removingImpuesto === empresaImpuesto.impuesto_id ? 'Removiendo...' : 'Remover'}
                        </button>
                      </div>
                    ))}
                    {empresaImpuestos.length === 0 && (
                      <p className="text-gray-500 text-sm">No hay impuestos asignados</p>
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
                    <div
                      key={empresa.id}
                      onClick={() => handleEmpresaSelect(empresa)}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{empresa.nombre}</div>
                      <div className="text-sm text-gray-500">NIT: {empresa.nit}</div>
                    </div>
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

      {/* Acciones Masivas */}
      {selectedEmpresa && calendario.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Masivas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <button
                onClick={syncAllToGoogleCalendar}
                disabled={syncingAllToGoogle || !googleCalendarConnected}
                className={`w-full px-4 py-3 rounded-md text-sm font-medium ${
                  syncingAllToGoogle
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : !googleCalendarConnected
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {syncingAllToGoogle ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sincronizando...
                  </div>
                ) : (
                  <>
                    📅 Sincronizar Todos a Google Calendar
                    <div className="text-xs mt-1 opacity-90">
                      ({calendario.filter(c => !c.synced_to_google).length} pendientes)
                    </div>
                  </>
                )}
              </button>
            </div>

            <div>
              <button
                onClick={removeAllFromGoogleCalendar}
                disabled={removingAllFromGoogle || !googleCalendarConnected}
                className={`w-full px-4 py-3 rounded-md text-sm font-medium ${
                  removingAllFromGoogle
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : !googleCalendarConnected
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {removingAllFromGoogle ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Eliminando...
                  </div>
                ) : (
                  <>
                    🗑️ Eliminar Todos de Google Calendar
                    <div className="text-xs mt-1 opacity-90">
                      ({calendario.filter(c => c.synced_to_google).length} sincronizados)
                    </div>
                  </>
                )}
              </button>
            </div>

            <div>
              <button
                onClick={sendEmailsForEvents}
                disabled={sendingEmails}
                className={`w-full px-4 py-3 rounded-md text-sm font-medium ${
                  sendingEmails
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {sendingEmails ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Enviando...
                  </div>
                ) : (
                  <>
                    📧 Enviar Notificaciones por Email
                    <div className="text-xs mt-1 opacity-90">
                      ({calendario.filter(c => c.estado === 'pendiente').length} pendientes)
                    </div>
                  </>
                )}
              </button>
            </div>
          </div>

          {!googleCalendarConnected && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                ⚠️ Para usar las funciones de Google Calendar, primero autoriza la conexión en la parte superior de la página.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Calendario */}
      {selectedEmpresa && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando calendario...</p>
            </div>
          ) : calendario.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">No hay vencimientos tributarios para mostrar.</p>
              <p className="text-sm text-gray-500 mt-2">
                Haz clic en "Generar Calendario" para crear los vencimientos.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Impuesto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Periodo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Vencimiento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Pago
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {calendario.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.impuesto_nombre}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.tipo_impuesto} - {item.impuesto_codigo}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.periodo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(item.fecha_vencimiento)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(item.estado)}`}>
                          {item.estado.charAt(0).toUpperCase() + item.estado.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.fecha_pago ? formatDate(item.fecha_pago) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.monto_pagado ? `$${item.monto_pagado.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col space-y-2">
                          <select
                            value={item.estado}
                            onChange={(e) => actualizarEstado(item.id, e.target.value)}
                            className="border border-gray-400 bg-white text-black rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-500 transition-colors"
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="pagado">Pagado</option>
                            <option value="vencido">Vencido</option>
                            <option value="extemporaneo">Extemporáneo</option>
                          </select>
                          
                          {/* Botones de Google Calendar */}
                          <div className="flex space-x-1">
                            {item.synced_to_google ? (
                              <button
                                onClick={() => removeFromGoogleCalendar(item.id)}
                                disabled={removingFromGoogle === item.id}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                                title="Remover de Google Calendar"
                              >
                                {removingFromGoogle === item.id ? (
                                  <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-red-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg className="-ml-1 mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                )}
                                Remover
                              </button>
                            ) : (
                              <button
                                onClick={() => syncToGoogleCalendar(item.id)}
                                disabled={syncingToGoogle === item.id || googleCalendarConnected === false}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                title={googleCalendarConnected === false ? "Google Calendar no conectado" : "Agregar a Google Calendar"}
                              >
                                {syncingToGoogle === item.id ? (
                                  <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg className="-ml-1 mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                  </svg>
                                )}
                                {googleCalendarConnected === false ? "No conectado" : "Agregar"}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
        </>
      )}
    </div>
  );
}