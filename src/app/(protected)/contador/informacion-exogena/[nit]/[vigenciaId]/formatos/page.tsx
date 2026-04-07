'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import SubNavbar from '@/components/informacion-exogena/SubNavbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, Plus, Edit, Trash2, Download, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface Vigencia {
  id: number;
  anio_fiscal: number;
  estado: string;
}

interface Formato {
  id: number;
  anio_fiscal: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  obligatorio: boolean;
  activo: boolean;
}

interface Concepto {
  id: number;
  anio_fiscal: number;
  formato_id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

interface CampoRequerido {
  id: number;
  formato_id: number;
  atributo: string;
  denominacion: string | null;
  tipo: string | null;
  longitud: number | null;
  criterios: string | null;
}

export default function FormatosPage() {
  const params = useParams();
  const nit = params.nit as string;
  const vigenciaId = parseInt(params.vigenciaId as string);

  // Estados principales
  const [vigencia, setVigencia] = useState<Vigencia | null>(null);
  const [anioFiscal, setAnioFiscal] = useState<number>(2024);
  const [formatos, setFormatos] = useState<Formato[]>([]);
  const [selectedFormato, setSelectedFormato] = useState<Formato | null>(null);
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [camposRequeridos, setCamposRequeridos] = useState<CampoRequerido[]>([]);

  // Estados de formularios
  const [nuevoFormato, setNuevoFormato] = useState({
    anio_fiscal: 2024,
    codigo: '',
    nombre: '',
    descripcion: '',
    obligatorio: false
  });

  const [nuevoConcepto, setNuevoConcepto] = useState({
    codigo: '',
    nombre: '',
    descripcion: ''
  });

  const [nuevoCampo, setNuevoCampo] = useState({
    atributo: '',
    denominacion: '',
    tipo: 'Texto',
    longitud: 100,
    criterios: ''
  });

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formatoToEdit, setFormatoToEdit] = useState<Formato | null>(null);
  const [conceptoDialogOpen, setConceptoDialogOpen] = useState(false);
  const [campoDialogOpen, setCampoDialogOpen] = useState(false);
  const [bulkConceptoDialogOpen, setBulkConceptoDialogOpen] = useState(false);
  const [bulkCampoDialogOpen, setBulkCampoDialogOpen] = useState(false);
  const [datosDialogOpen, setDatosDialogOpen] = useState(false);

  // Estados para subida de datos
  const [nuevoDato, setNuevoDato] = useState<Record<string, any>>({});
  const [bulkDatosDialogOpen, setBulkDatosDialogOpen] = useState(false);
  const [bulkDatos, setBulkDatos] = useState<any[]>([]);

  // Refs para file inputs
  const conceptoFileRef = useRef<HTMLInputElement>(null);
  const campoFileRef = useRef<HTMLInputElement>(null);

  // Estados de bulk upload
  const [bulkConceptos, setBulkConceptos] = useState<Concepto[]>([]);
  const [bulkCampos, setBulkCampos] = useState<CampoRequerido[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);

  // Cargar vigencia
  useEffect(() => {
    loadVigencia();
  }, [vigenciaId]);

  // Cargar datos iniciales
  useEffect(() => {
    if (anioFiscal) {
      loadFormatos();
    }
  }, [anioFiscal]);

  // Cargar conceptos y campos cuando se selecciona un formato
  useEffect(() => {
    if (selectedFormato) {
      loadConceptos(selectedFormato.id);
      loadCamposRequeridos(selectedFormato.id);
    }
  }, [selectedFormato]);

  const loadVigencia = async () => {
    try {
      const response = await fetch(`/api/informacion-exogena/vigencias?nit=${nit}`);
      if (response.ok) {
        const data = await response.json();

        // Validar que vigencias existe y es un array
        if (data.vigencias && Array.isArray(data.vigencias)) {
          const currentVigencia = data.vigencias.find((v: Vigencia) => v.id === vigenciaId);
          if (currentVigencia) {
            setVigencia(currentVigencia);
            setAnioFiscal(currentVigencia.anio_fiscal);
          }
        } else {
          console.error('La respuesta no contiene un array de vigencias:', data);
        }
      }
    } catch (error) {
      console.error('Error loading vigencia:', error);
    }
  };

  const loadFormatos = async () => {
    try {
      const response = await fetch(`/api/informacion-exogena/formatos?anioFiscal=${anioFiscal}`);
      if (response.ok) {
        const data = await response.json();
        setFormatos(data);
      }
    } catch (error) {
      console.error('Error loading formatos:', error);
      toast.error('Error al cargar formatos');
    }
  };

  const loadConceptos = async (formatoId: number) => {
    try {
      const response = await fetch(`/api/informacion-exogena/conceptos?formatoId=${formatoId}`);
      if (response.ok) {
        const data = await response.json();
        setConceptos(data);
      }
    } catch (error) {
      console.error('Error loading conceptos:', error);
      toast.error('Error al cargar conceptos');
    }
  };

  const loadCamposRequeridos = async (formatoId: number) => {
    try {
      const response = await fetch(`/api/informacion-exogena/campos-requeridos?formatoId=${formatoId}`);
      if (response.ok) {
        const data = await response.json();
        setCamposRequeridos(data);
      }
    } catch (error) {
      console.error('Error loading campos requeridos:', error);
      toast.error('Error al cargar campos requeridos');
    }
  };

  const createFormato = async () => {
    if (!nuevoFormato.codigo || !nuevoFormato.nombre) {
      toast.error('Código y nombre son requeridos');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/informacion-exogena/formatos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoFormato)
      });

      if (response.ok) {
        const formato = await response.json();
        setFormatos([...formatos, formato]);
        setNuevoFormato({ anio_fiscal: anioFiscal, codigo: '', nombre: '', descripcion: '', obligatorio: false });
        setDialogOpen(false);
        toast.success('Formato creado exitosamente');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al crear formato');
      }
    } catch (error) {
      console.error('Error creating formato:', error);
      toast.error('Error al crear formato');
    } finally {
      setLoading(false);
    }
  };

  const updateFormato = async () => {
    if (!formatoToEdit || !formatoToEdit.codigo || !formatoToEdit.nombre) {
      toast.error('Código y nombre son requeridos');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/informacion-exogena/formatos?id=${formatoToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anio_fiscal: formatoToEdit.anio_fiscal,
          codigo: formatoToEdit.codigo,
          nombre: formatoToEdit.nombre,
          descripcion: formatoToEdit.descripcion,
          obligatorio: formatoToEdit.obligatorio,
          activo: formatoToEdit.activo
        })
      });

      if (response.ok) {
        const updatedFormato = await response.json();
        setFormatos(formatos.map(f => f.id === updatedFormato.id ? updatedFormato : f));
        if (selectedFormato?.id === updatedFormato.id) {
          setSelectedFormato(updatedFormato);
        }
        setFormatoToEdit(null);
        setEditDialogOpen(false);
        toast.success('Formato actualizado exitosamente');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al actualizar formato');
      }
    } catch (error) {
      console.error('Error updating formato:', error);
      toast.error('Error al actualizar formato');
    } finally {
      setLoading(false);
    }
  };

  const deleteFormato = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este formato? Se eliminarán también todos sus conceptos, campos y datos asociados.')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/informacion-exogena/formatos?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setFormatos(formatos.filter(f => f.id !== id));
        if (selectedFormato?.id === id) {
          setSelectedFormato(null);
        }
        toast.success('Formato eliminado exitosamente');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al eliminar formato');
      }
    } catch (error) {
      console.error('Error deleting formato:', error);
      toast.error('Error al eliminar formato');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (formato: Formato, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormatoToEdit({ ...formato });
    setEditDialogOpen(true);
  };

  const createConcepto = async () => {
    if (!selectedFormato || !nuevoConcepto.codigo || !nuevoConcepto.nombre) {
      toast.error('Código y nombre son requeridos');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/informacion-exogena/conceptos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formato_id: selectedFormato.id,
          ...nuevoConcepto
        })
      });

      if (response.ok) {
        const concepto = await response.json();
        setConceptos([...conceptos, concepto]);
        setNuevoConcepto({ codigo: '', nombre: '', descripcion: '' });
        toast.success('Concepto creado exitosamente');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al crear concepto');
      }
    } catch (error) {
      console.error('Error creating concepto:', error);
      toast.error('Error al crear concepto');
    } finally {
      setLoading(false);
    }
  };

  const createCampoRequerido = async () => {
    if (!selectedFormato || !nuevoCampo.atributo || !nuevoCampo.denominacion) {
      toast.error('Atributo y denominación son requeridos');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/informacion-exogena/campos-requeridos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formato_id: selectedFormato.id,
          ...nuevoCampo
        })
      });

      if (response.ok) {
        const campo = await response.json();
        setCamposRequeridos([...camposRequeridos, campo]);
        setNuevoCampo({ atributo: '', denominacion: '', tipo: 'Texto', longitud: 100, criterios: '' });
        toast.success('Campo requerido creado exitosamente');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al crear campo requerido');
      }
    } catch (error) {
      console.error('Error creating campo requerido:', error);
      toast.error('Error al crear campo requerido');
    } finally {
      setLoading(false);
    }
  };

  const parseCSV = (csvText: string): string[][] => {
    // Normalizar saltos de línea y eliminar BOM si existe
    const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^\uFEFF/, '');
    const lines = normalizedText.split('\n').filter(line => line.trim().length > 0);

    return lines.map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++; // skip next quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  const handleConceptoFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedFormato) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        console.log('CSV raw text length:', csvText.length);

        const lines = parseCSV(csvText);
        console.log('Parsed lines:', lines.length);

        if (lines.length < 2) {
          toast.error('El archivo debe contener al menos una fila de datos');
          return;
        }

        const headers = lines[0].map(h => h.toLowerCase().trim());
        console.log('Headers found:', headers);

        const expectedHeaders = ['codigo', 'nombre', 'descripcion'];

        const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          toast.error(`Faltan las columnas: ${missingHeaders.join(', ')}`);
          return;
        }

        const parsedConceptos: Concepto[] = [];
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i];

          // Validar que tenga al menos 2 columnas (código y nombre son obligatorios)
          if (row.length < 2) {
            errors.push(`Fila ${i + 1}: debe tener al menos 2 columnas (codigo, nombre)`);
            continue;
          }

          const codigo = row[0]?.trim();
          const nombre = row[1]?.trim();
          const descripcion = row[2]?.trim();

          if (!codigo || !nombre) {
            errors.push(`Fila ${i + 1}: código y nombre son requeridos`);
            continue;
          }

          parsedConceptos.push({
            id: 0, // se asignará en la BD
            anio_fiscal: selectedFormato.anio_fiscal,
            formato_id: selectedFormato.id,
            codigo: codigo,
            nombre: nombre,
            descripcion: descripcion || null
          });
        }

        console.log('Parsed conceptos:', parsedConceptos.length);
        console.log('Errors:', errors);

        if (errors.length > 0) {
          setBulkErrors(errors);
          toast.error('Errores encontrados en el archivo CSV');
          return;
        }

        setBulkConceptos(parsedConceptos);
        setBulkErrors([]);
        toast.success(`Se encontraron ${parsedConceptos.length} conceptos válidos`);
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast.error('Error al procesar el archivo CSV. Verifica que el formato sea correcto.');
      }
    };

    reader.onerror = () => {
      toast.error('Error al leer el archivo');
    };

    reader.readAsText(file);
  };

  const handleCampoFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedFormato) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      const lines = parseCSV(csvText);

      if (lines.length < 2) {
        toast.error('El archivo debe contener al menos una fila de datos');
        return;
      }

      const headers = lines[0].map(h => h.toLowerCase().trim());
      const expectedHeaders = ['atributo', 'denominacion', 'tipo', 'longitud', 'criterios'];

      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        toast.error(`Faltan las columnas: ${missingHeaders.join(', ')}`);
        return;
      }

      const parsedCampos: CampoRequerido[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (row.length !== 5) {
          errors.push(`Fila ${i + 1}: debe tener 5 columnas`);
          continue;
        }

        const [atributo, denominacion, tipo, longitudStr, criterios] = row;
        if (!atributo || !denominacion) {
          errors.push(`Fila ${i + 1}: atributo y denominación son requeridos`);
          continue;
        }

        const longitud = parseInt(longitudStr) || 100;

        parsedCampos.push({
          id: 0, // se asignará en la BD
          formato_id: selectedFormato.id,
          atributo: atributo.trim(),
          denominacion: denominacion.trim(),
          tipo: tipo?.trim() || 'Texto',
          longitud: longitud,
          criterios: criterios?.trim() || null
        });
      }

      if (errors.length > 0) {
        setBulkErrors(errors);
        toast.error('Errores encontrados en el archivo CSV');
        return;
      }

      setBulkCampos(parsedCampos);
      setBulkErrors([]);
      toast.success(`Se encontraron ${parsedCampos.length} campos válidos`);
    };

    reader.readAsText(file);
  };

  const uploadBulkConceptos = async () => {
    if (!selectedFormato || bulkConceptos.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch('/api/informacion-exogena/conceptos/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptos: bulkConceptos })
      });

      if (response.ok) {
        const result = await response.json();
        await loadConceptos(selectedFormato.id);
        setBulkConceptos([]);
        setBulkConceptoDialogOpen(false);
        if (conceptoFileRef.current) conceptoFileRef.current.value = '';
        toast.success(result.message || `Se crearon ${result.count} conceptos exitosamente`);
      } else {
        const error = await response.json();
        console.error('Error response:', error);
        toast.error(error.error || 'Error al subir conceptos');
      }
    } catch (error) {
      console.error('Error uploading bulk conceptos:', error);
      toast.error('Error de conexión al subir conceptos. Verifica tu conexión e intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const uploadBulkCampos = async () => {
    if (!selectedFormato || bulkCampos.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch('/api/informacion-exogena/campos-requeridos/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campos: bulkCampos })
      });

      if (response.ok) {
        const result = await response.json();
        await loadCamposRequeridos(selectedFormato.id);
        setBulkCampos([]);
        setBulkCampoDialogOpen(false);
        if (campoFileRef.current) campoFileRef.current.value = '';
        toast.success(result.message);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al subir campos requeridos');
      }
    } catch (error) {
      console.error('Error uploading bulk campos:', error);
      toast.error('Error al subir campos requeridos');
    } finally {
      setLoading(false);
    }
  };

  const createDato = async () => {
    if (!selectedFormato) {
      toast.error('No hay formato seleccionado');
      return;
    }

    // Validar campos requeridos
    for (const campo of camposRequeridos) {
      if (campo.criterios?.toLowerCase().includes('obligatorio') && !nuevoDato[campo.atributo]) {
        toast.error(`${campo.atributo} es requerido`);
        return;
      }
    }

    setLoading(true);
    try {
      const response = await fetch('/api/informacion-exogena/datos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formato_id: selectedFormato.id,
          nit,
          datos: nuevoDato
        })
      });

      if (response.ok) {
        setNuevoDato({});
        setDatosDialogOpen(false);
        toast.success('Dato creado exitosamente');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al crear dato');
      }
    } catch (error) {
      console.error('Error creating dato:', error);
      toast.error('Error al crear dato');
    } finally {
      setLoading(false);
    }
  };

  const handleDatosFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedFormato) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      const lines = parseCSV(csvText);

      if (lines.length < 2) {
        toast.error('El archivo debe contener al menos una fila de datos');
        return;
      }

      const headers = lines[0].map(h => h.toLowerCase().trim());
      const expectedHeaders = camposRequeridos.map(c => c.atributo.toLowerCase());

      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        toast.error(`Faltan las columnas: ${missingHeaders.join(', ')}`);
        return;
      }

      const parsedDatos: any[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (row.length !== expectedHeaders.length) {
          errors.push(`Fila ${i + 1}: debe tener ${expectedHeaders.length} columnas`);
          continue;
        }

        const dato: any = {};
        for (let j = 0; j < expectedHeaders.length; j++) {
          dato[expectedHeaders[j]] = row[j]?.trim() || '';
        }

        // Validar requeridos (campos con criterios que indican obligatoriedad)
        let hasError = false;
        for (const campo of camposRequeridos) {
          if (campo.criterios?.toLowerCase().includes('obligatorio') && !dato[campo.atributo]) {
            errors.push(`Fila ${i + 1}: ${campo.atributo} es requerido`);
            hasError = true;
            break;
          }
        }
        if (!hasError) {
          parsedDatos.push(dato);
        }
      }

      if (errors.length > 0) {
        setBulkErrors(errors);
        toast.error('Errores encontrados en el archivo CSV');
        return;
      }

      setBulkDatos(parsedDatos);
      setBulkErrors([]);
      toast.success(`Se encontraron ${parsedDatos.length} registros válidos`);
    };

    reader.readAsText(file);
  };

  const uploadBulkDatos = async () => {
    if (!selectedFormato || bulkDatos.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch('/api/informacion-exogena/datos/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos: bulkDatos, formato_id: selectedFormato.id, nit })
      });

      if (response.ok) {
        const result = await response.json();
        setBulkDatos([]);
        setBulkDatosDialogOpen(false);
        toast.success(result.message);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al subir datos');
      }
    } catch (error) {
      console.error('Error uploading bulk datos:', error);
      toast.error('Error al subir datos');
    } finally {
      setLoading(false);
    }
  };

  const deleteConcepto = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este concepto?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/informacion-exogena/conceptos?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setConceptos(conceptos.filter(c => c.id !== id));
        toast.success('Concepto eliminado exitosamente');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al eliminar concepto');
      }
    } catch (error) {
      console.error('Error deleting concepto:', error);
      toast.error('Error al eliminar concepto');
    } finally {
      setLoading(false);
    }
  };

  const deleteCampoRequerido = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este campo requerido?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/informacion-exogena/campos-requeridos?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setCamposRequeridos(camposRequeridos.filter(c => c.id !== id));
        toast.success('Campo requerido eliminado exitosamente');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al eliminar campo requerido');
      }
    } catch (error) {
      console.error('Error deleting campo requerido:', error);
      toast.error('Error al eliminar campo requerido');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = (type: 'conceptos' | 'campos') => {
    let csvContent = '';
    let filename = '';

    if (type === 'conceptos') {
      csvContent = 'codigo,nombre,descripcion\nCON001,Concepto Ejemplo 1,Descripción del concepto 1\nCON002,Concepto Ejemplo 2,Descripción del concepto 2\n';
      filename = 'plantilla_conceptos.csv';
    } else {
      csvContent = 'atributo,denominacion,tipo,longitud,criterios\nnit,NIT del informado,Texto,15,Obligatorio\nnombre,Nombre o razón social,Texto,100,Obligatorio\nvalor,Valor operación,Número,15,Obligatorio\n';
      filename = 'plantilla_campos_requeridos.csv';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <SubNavbar />
      <div className="container mx-auto p-6 space-y-6">
        {/* Título y botón para crear formatos */}
        <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Formatos DIAN</h1>
            {vigencia && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {vigencia.anio_fiscal}
              </Badge>
            )}
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Formato
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              {/* <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Formato
            </Button> */}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className='text-black'>Crear Nuevo Formato</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-black">
                <div>
                  <Label htmlFor="anio_fiscal">Año Fiscal *</Label>
                  <Input
                    id="anio_fiscal"
                    type="number"
                    value={nuevoFormato.anio_fiscal}
                    onChange={(e) => setNuevoFormato({ ...nuevoFormato, anio_fiscal: parseInt(e.target.value) || 2024 })}
                    placeholder="Ej: 2024"
                  />
                </div>
                <div>
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    value={nuevoFormato.codigo}
                    onChange={(e) => setNuevoFormato({ ...nuevoFormato, codigo: e.target.value })}
                    placeholder="Ej: 1001"
                  />
                </div>
                <div>
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={nuevoFormato.nombre}
                    onChange={(e) => setNuevoFormato({ ...nuevoFormato, nombre: e.target.value })}
                    placeholder="Nombre del formato"
                  />
                </div>
                <div>
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={nuevoFormato.descripcion}
                    onChange={(e) => setNuevoFormato({ ...nuevoFormato, descripcion: e.target.value })}
                    placeholder="Descripción opcional"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="obligatorio"
                    checked={nuevoFormato.obligatorio}
                    onChange={(e) => setNuevoFormato({ ...nuevoFormato, obligatorio: e.target.checked })}
                  />
                  <Label htmlFor="obligatorio">Obligatorio</Label>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={createFormato} disabled={loading}>
                    {loading ? 'Creando...' : 'Crear'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Dialog de edición - se abre programáticamente */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Formato</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-anio-fiscal">Año Fiscal *</Label>
                <Input
                  id="edit-anio-fiscal"
                  type="number"
                  value={formatoToEdit?.anio_fiscal || 2024}
                  onChange={(e) => setFormatoToEdit(formatoToEdit ? { ...formatoToEdit, anio_fiscal: parseInt(e.target.value) || 2024 } : null)}
                  placeholder="Ej: 2024"
                />
              </div>
              <div>
                <Label htmlFor="edit-codigo">Código *</Label>
                <Input
                  id="edit-codigo"
                  value={formatoToEdit?.codigo || ''}
                  onChange={(e) => setFormatoToEdit(formatoToEdit ? { ...formatoToEdit, codigo: e.target.value } : null)}
                  placeholder="Ej: 1001"
                />
              </div>
              <div>
                <Label htmlFor="edit-nombre">Nombre *</Label>
                <Input
                  id="edit-nombre"
                  value={formatoToEdit?.nombre || ''}
                  onChange={(e) => setFormatoToEdit(formatoToEdit ? { ...formatoToEdit, nombre: e.target.value } : null)}
                  placeholder="Nombre del formato"
                />
              </div>
              <div>
                <Label htmlFor="edit-descripcion">Descripción</Label>
                <Textarea
                  id="edit-descripcion"
                  value={formatoToEdit?.descripcion || ''}
                  onChange={(e) => setFormatoToEdit(formatoToEdit ? { ...formatoToEdit, descripcion: e.target.value } : null)}
                  placeholder="Descripción opcional"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-obligatorio"
                  checked={formatoToEdit?.obligatorio || false}
                  onChange={(e) => setFormatoToEdit(formatoToEdit ? { ...formatoToEdit, obligatorio: e.target.checked } : null)}
                />
                <Label htmlFor="edit-obligatorio">Obligatorio</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-activo"
                  checked={formatoToEdit?.activo ?? true}
                  onChange={(e) => setFormatoToEdit(formatoToEdit ? { ...formatoToEdit, activo: e.target.checked } : null)}
                />
                <Label htmlFor="edit-activo">Activo</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => {
                  setEditDialogOpen(false);
                  setFormatoToEdit(null);
                }}>
                  Cancelar
                </Button>
                <Button onClick={updateFormato} disabled={loading}>
                  {loading ? 'Actualizando...' : 'Actualizar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Card de configuración - Solo si hay un formato seleccionado */}
        {selectedFormato && (
          <Card>
            <CardHeader>
              <CardTitle>Configuración y Subida de Información Exógena</CardTitle>
              <p className="text-sm text-black">Configura y sube datos para el formato {selectedFormato.nombre}</p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="conceptos" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="conceptos">Conceptos</TabsTrigger>
                  <TabsTrigger value="campos">Campos Requeridos</TabsTrigger>
                  <TabsTrigger value="datos">Datos</TabsTrigger>
                </TabsList>

                <TabsContent value="conceptos" className="space-y-6">
                  {/* Creación Manual */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Crear Concepto Manual</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="concepto-codigo">Código *</Label>
                          <Input
                            id="concepto-codigo"
                            value={nuevoConcepto.codigo}
                            onChange={(e) => setNuevoConcepto({ ...nuevoConcepto, codigo: e.target.value })}
                            placeholder="Ej: CON001"
                          />
                        </div>
                        <div>
                          <Label htmlFor="concepto-nombre">Nombre *</Label>
                          <Input
                            id="concepto-nombre"
                            value={nuevoConcepto.nombre}
                            onChange={(e) => setNuevoConcepto({ ...nuevoConcepto, nombre: e.target.value })}
                            placeholder="Nombre del concepto"
                          />
                        </div>
                        <div>
                          <Label htmlFor="concepto-descripcion">Descripción</Label>
                          <Input
                            id="concepto-descripcion"
                            value={nuevoConcepto.descripcion}
                            onChange={(e) => setNuevoConcepto({ ...nuevoConcepto, descripcion: e.target.value })}
                            placeholder="Descripción opcional"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end mt-4">
                        <Button onClick={createConcepto} disabled={loading}>
                          {loading ? 'Creando...' : 'Crear Concepto'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Carga Masiva */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        Carga Masiva de Conceptos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="concepto-file">Seleccionar archivo CSV</Label>
                        <input
                          id="concepto-file"
                          type="file"
                          accept=".csv"
                          ref={conceptoFileRef}
                          onChange={handleConceptoFileUpload}
                          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <p className="text-sm text-black mt-1">
                          El archivo debe contener las columnas: codigo, nombre, descripcion
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadTemplate('conceptos')}
                          className="mt-2"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Descargar Plantilla
                        </Button>
                      </div>

                      {bulkErrors.length > 0 && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <ul className="list-disc list-inside">
                              {bulkErrors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {bulkConceptos.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 text-black">Vista previa ({bulkConceptos.length} conceptos):</h4>
                          <div className="max-h-40 overflow-y-auto border rounded p-2">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Código</TableHead>
                                  <TableHead>Nombre</TableHead>
                                  <TableHead>Descripción</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {bulkConceptos.slice(0, 5).map((concepto, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{concepto.codigo}</TableCell>
                                    <TableCell>{concepto.nombre}</TableCell>
                                    <TableCell>{concepto.descripcion}</TableCell>
                                  </TableRow>
                                ))}
                                {bulkConceptos.length > 5 && (
                                  <TableRow>
                                    <TableCell colSpan={3} className="text-center text-black">
                                      ... y {bulkConceptos.length - 5} más
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                          <div className="flex justify-end space-x-2 mt-4">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setBulkConceptos([]);
                                setBulkErrors([]);
                                if (conceptoFileRef.current) conceptoFileRef.current.value = '';
                              }}
                            >
                              Limpiar
                            </Button>
                            <Button
                              onClick={uploadBulkConceptos}
                              disabled={loading || bulkConceptos.length === 0}
                            >
                              {loading ? 'Subiendo...' : `Subir ${bulkConceptos.length} Conceptos`}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Lista de Conceptos Existentes */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Conceptos Existentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Código</TableHead>
                              <TableHead>Nombre</TableHead>
                              <TableHead>Descripción</TableHead>
                              <TableHead className="w-20">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {conceptos.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-black">
                                  No hay conceptos registrados
                                </TableCell>
                              </TableRow>
                            ) : (
                              conceptos.map((concepto) => (
                                <TableRow key={concepto.id}>
                                  <TableCell className="font-medium text-black">{concepto.codigo}</TableCell>
                                  <TableCell className="font-medium text-black">{concepto.nombre}</TableCell>
                                  <TableCell className="font-medium text-black">{concepto.descripcion || '-'}</TableCell>
                                  <TableCell>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => deleteConcepto(concepto.id)}
                                      disabled={loading}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="campos" className="space-y-6">
                  {/* Creación Manual */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Crear Campo Requerido Manual</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="campo-atributo">Atributo *</Label>
                          <Input
                            id="campo-atributo"
                            value={nuevoCampo.atributo}
                            onChange={(e) => setNuevoCampo({ ...nuevoCampo, atributo: e.target.value })}
                            placeholder="Ej: nit"
                          />
                        </div>
                        <div>
                          <Label htmlFor="campo-denominacion">Denominación *</Label>
                          <Input
                            id="campo-denominacion"
                            value={nuevoCampo.denominacion}
                            onChange={(e) => setNuevoCampo({ ...nuevoCampo, denominacion: e.target.value })}
                            placeholder="Ej: NIT del informado"
                          />
                        </div>
                        <div>
                          <Label htmlFor="campo-tipo">Tipo</Label>
                          <select
                            id="campo-tipo"
                            value={nuevoCampo.tipo}
                            onChange={(e) => setNuevoCampo({ ...nuevoCampo, tipo: e.target.value })}
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                          >
                            <option value="Texto">Texto</option>
                            <option value="Número">Número</option>
                            <option value="Fecha">Fecha</option>
                            <option value="Alfanumérico">Alfanumérico</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="campo-longitud">Longitud</Label>
                          <Input
                            id="campo-longitud"
                            type="number"
                            value={nuevoCampo.longitud}
                            onChange={(e) => setNuevoCampo({ ...nuevoCampo, longitud: parseInt(e.target.value) || 100 })}
                            placeholder="100"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="campo-criterios">Criterios</Label>
                          <Input
                            id="campo-criterios"
                            value={nuevoCampo.criterios}
                            onChange={(e) => setNuevoCampo({ ...nuevoCampo, criterios: e.target.value })}
                            placeholder="Ej: Obligatorio, sin guiones ni puntos"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end mt-4">
                        <Button onClick={createCampoRequerido} disabled={loading}>
                          {loading ? 'Creando...' : 'Crear Campo'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Carga Masiva */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        Carga Masiva de Campos Requeridos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="campo-file">Seleccionar archivo CSV</Label>
                        <input
                          id="campo-file"
                          type="file"
                          accept=".csv"
                          ref={campoFileRef}
                          onChange={handleCampoFileUpload}
                          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <p className="text-sm text-black mt-1">
                          El archivo debe contener las columnas: atributo, denominacion, tipo, longitud, criterios
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadTemplate('campos')}
                          className="mt-2"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Descargar Plantilla
                        </Button>
                      </div>

                      {bulkErrors.length > 0 && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <ul className="list-disc list-inside">
                              {bulkErrors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {bulkCampos.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 text-black">Vista previa ({bulkCampos.length} campos):</h4>
                          <div className="max-h-40 overflow-y-auto border rounded p-2">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Atributo</TableHead>
                                  <TableHead>Denominación</TableHead>
                                  <TableHead>Tipo</TableHead>
                                  <TableHead>Longitud</TableHead>
                                  <TableHead>Criterios</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {bulkCampos.slice(0, 5).map((campo, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium text-black">{campo.atributo}</TableCell>
                                    <TableCell className="font-medium text-black">{campo.denominacion}</TableCell>
                                    <TableCell className="font-medium text-black">{campo.tipo}</TableCell>
                                    <TableCell className="font-medium text-black">{campo.longitud}</TableCell>
                                    <TableCell className="font-medium text-black">{campo.criterios || '-'}</TableCell>
                                  </TableRow>
                                ))}
                                {bulkCampos.length > 5 && (
                                  <TableRow>
                                    <TableCell colSpan={2} className="text-center text-black">
                                      ... y {bulkCampos.length - 5} más
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                          <div className="flex justify-end space-x-2 mt-4">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setBulkCampos([]);
                                setBulkErrors([]);
                                if (campoFileRef.current) campoFileRef.current.value = '';
                              }}
                            >
                              Limpiar
                            </Button>
                            <Button
                              onClick={uploadBulkCampos}
                              disabled={loading || bulkCampos.length === 0}
                            >
                              {loading ? 'Subiendo...' : `Subir ${bulkCampos.length} Campos`}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Lista de Campos Existentes */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Campos Requeridos Existentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Atributo</TableHead>
                              <TableHead>Denominación</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Longitud</TableHead>
                              <TableHead>Criterios</TableHead>
                              <TableHead className="w-20">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {camposRequeridos.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center text-black">
                                  No hay campos requeridos registrados
                                </TableCell>
                              </TableRow>
                            ) : (
                              camposRequeridos.map((campo) => (
                                <TableRow key={campo.id}>
                                  <TableCell className="font-medium text-black">{campo.atributo}</TableCell>
                                  <TableCell className="font-medium text-black">{campo.denominacion}</TableCell>
                                  <TableCell className="font-medium text-black">{campo.tipo}</TableCell>
                                  <TableCell className="font-medium text-black">{campo.longitud}</TableCell>
                                  <TableCell>
                                    {campo.criterios ? (
                                      <span className={campo.criterios.toLowerCase().includes('obligatorio') ? 'text-red-600 font-medium' : ''}>
                                        {campo.criterios}
                                      </span>
                                    ) : (
                                      <span className="text-black">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => deleteCampoRequerido(campo.id)}
                                      disabled={loading}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="datos" className="space-y-4">
                  <div className="flex space-x-2">
                    <Dialog open={datosDialogOpen} onOpenChange={setDatosDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <Plus className="w-4 h-4 mr-2" />
                          Carga Manual
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Carga Manual de Datos</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {camposRequeridos.map(campo => (
                            <div key={campo.id}>
                              <Label htmlFor={campo.atributo}>
                                {campo.denominacion || campo.atributo}
                                {campo.criterios?.toLowerCase().includes('obligatorio') ? ' *' : ''}
                              </Label>
                              <Input
                                id={campo.atributo}
                                value={nuevoDato[campo.atributo] || ''}
                                onChange={(e) => setNuevoDato({ ...nuevoDato, [campo.atributo]: e.target.value })}
                                required={campo.criterios?.toLowerCase().includes('obligatorio')}
                                placeholder={campo.tipo ? `Tipo: ${campo.tipo}${campo.longitud ? `, Long: ${campo.longitud}` : ''}` : ''}
                              />
                              {campo.criterios && (
                                <p className="text-xs text-black mt-1">{campo.criterios}</p>
                              )}
                            </div>
                          ))}
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => {
                              setNuevoDato({});
                              setDatosDialogOpen(false);
                            }}>
                              Cancelar
                            </Button>
                            <Button onClick={createDato} disabled={loading}>
                              {loading ? 'Creando...' : 'Crear'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={bulkDatosDialogOpen} onOpenChange={setBulkDatosDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Upload className="w-4 h-4 mr-2" />
                          Carga Masiva
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Carga Masiva de Datos</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="datos-file">Seleccionar archivo CSV</Label>
                            <input
                              id="datos-file"
                              type="file"
                              accept=".csv"
                              onChange={handleDatosFileUpload}
                              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <p className="text-sm text-black mt-1">
                              El archivo debe contener las columnas: {camposRequeridos.map(c => c.atributo).join(', ')}
                            </p>
                          </div>
                          {bulkErrors.length > 0 && (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                <ul className="list-disc list-inside">
                                  {bulkErrors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                  ))}
                                </ul>
                              </AlertDescription>
                            </Alert>
                          )}
                          {bulkDatos.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2 text-black">Vista previa ({bulkDatos.length} registros):</h4>
                              <div className="max-h-40 overflow-y-auto border rounded p-2">
                                <Table>
                                  <TableHeader>
                                    <TableRow >
                                      {camposRequeridos.map(c => <TableHead key={c.atributo} className="font-medium text-black">{c.denominacion || c.atributo}</TableHead>)}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {bulkDatos.slice(0, 5).map((dato, index) => (
                                      <TableRow key={index}>
                                        {camposRequeridos.map(c => <TableCell key={c.atributo} className="font-medium text-black">{dato[c.atributo]}</TableCell>)}
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setBulkDatosDialogOpen(false);
                                setBulkDatos([]);
                                setBulkErrors([]);
                              }}
                            >
                              Cancelar
                            </Button>
                            <Button
                              onClick={uploadBulkDatos}
                              disabled={loading || bulkDatos.length === 0}
                            >
                              {loading ? 'Subiendo...' : `Subir ${bulkDatos.length} Registros`}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Formatos */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Formatos Disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {formatos.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No hay formatos registrados
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Comienza creando tu primer formato DIAN
                    </p>
                    <Button
                      onClick={() => setDialogOpen(true)}
                      className="mx-auto"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Primer Formato
                    </Button>
                  </div>
                ) : (
                  formatos.map((formato) => (
                    <div
                      key={formato.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedFormato?.id === formato.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                      onClick={() => setSelectedFormato(formato)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-black">{formato.nombre}</h3>
                          <p className="text-sm text-black">{formato.codigo}</p>
                          {formato.descripcion && (
                            <p className="text-xs text-black mt-1">{formato.descripcion}</p>
                          )}
                        </div>
                        <div className="flex items-start gap-2">
                          {formato.obligatorio && (
                            <Badge variant="secondary">Obligatorio</Badge>
                          )}
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => openEditDialog(formato, e)}
                              disabled={loading}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFormato(formato.id);
                              }}
                              disabled={loading}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Detalles del Formato Seleccionado */}
          <div className="lg:col-span-2">
            {selectedFormato ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{selectedFormato.nombre} ({selectedFormato.codigo})</span>
                    {selectedFormato.obligatorio && (
                      <Badge variant="destructive">Obligatorio</Badge>
                    )}
                  </CardTitle>
                  {selectedFormato.descripcion && (
                    <p className="text-sm text-black">{selectedFormato.descripcion}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="conceptos" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="conceptos">Conceptos</TabsTrigger>
                      <TabsTrigger value="campos">Campos Requeridos</TabsTrigger>
                    </TabsList>

                    <TabsContent value="conceptos" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-black">Conceptos del Formato</h3>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadTemplate('conceptos')}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Plantilla
                          </Button>
                          <Dialog open={bulkConceptoDialogOpen} onOpenChange={setBulkConceptoDialogOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Upload className="w-4 h-4 mr-2" />
                                Carga Masiva
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Carga Masiva de Conceptos</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="concepto-file">Seleccionar archivo CSV</Label>
                                  <input
                                    id="concepto-file"
                                    type="file"
                                    accept=".csv"
                                    ref={conceptoFileRef}
                                    onChange={handleConceptoFileUpload}
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                  />
                                  <p className="text-sm text-black mt-1">
                                    El archivo debe contener las columnas: codigo, nombre, descripcion
                                  </p>
                                </div>

                                {bulkErrors.length > 0 && (
                                  <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                      <ul className="list-disc list-inside">
                                        {bulkErrors.map((error, index) => (
                                          <li key={index}>{error}</li>
                                        ))}
                                      </ul>
                                    </AlertDescription>
                                  </Alert>
                                )}

                                {bulkConceptos.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2 text-black">Vista previa ({bulkConceptos.length} conceptos):</h4>
                                    <div className="max-h-40 overflow-y-auto border rounded p-2">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Código</TableHead>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>Descripción</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {bulkConceptos.slice(0, 5).map((concepto, index) => (
                                            <TableRow key={index}>
                                              <TableCell className="font-medium text-black">{concepto.codigo}</TableCell>
                                              <TableCell className="font-medium text-black">{concepto.nombre}</TableCell>
                                              <TableCell className="font-medium text-black">{concepto.descripcion}</TableCell>
                                            </TableRow>
                                          ))}
                                          {bulkConceptos.length > 5 && (
                                            <TableRow>
                                              <TableCell colSpan={3} className="text-center text-black">
                                                ... y {bulkConceptos.length - 5} más
                                              </TableCell>
                                            </TableRow>
                                          )}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                )}

                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setBulkConceptoDialogOpen(false);
                                      setBulkConceptos([]);
                                      setBulkErrors([]);
                                      if (conceptoFileRef.current) conceptoFileRef.current.value = '';
                                    }}
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    onClick={uploadBulkConceptos}
                                    disabled={loading || bulkConceptos.length === 0}
                                  >
                                    {loading ? 'Subiendo...' : `Subir ${bulkConceptos.length} Conceptos`}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Dialog open={conceptoDialogOpen} onOpenChange={setConceptoDialogOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Nuevo Concepto
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Crear Nuevo Concepto</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="concepto-codigo">Código *</Label>
                                  <Input
                                    id="concepto-codigo"
                                    value={nuevoConcepto.codigo}
                                    onChange={(e) => setNuevoConcepto({ ...nuevoConcepto, codigo: e.target.value })}
                                    placeholder="Ej: CON001"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="concepto-nombre">Nombre *</Label>
                                  <Input
                                    id="concepto-nombre"
                                    value={nuevoConcepto.nombre}
                                    onChange={(e) => setNuevoConcepto({ ...nuevoConcepto, nombre: e.target.value })}
                                    placeholder="Nombre del concepto"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="concepto-descripcion">Descripción</Label>
                                  <Textarea
                                    id="concepto-descripcion"
                                    value={nuevoConcepto.descripcion}
                                    onChange={(e) => setNuevoConcepto({ ...nuevoConcepto, descripcion: e.target.value })}
                                    placeholder="Descripción opcional"
                                  />
                                </div>
                                <div className="flex justify-end space-x-2">
                                  <Button variant="outline" onClick={() => setConceptoDialogOpen(false)}>
                                    Cancelar
                                  </Button>
                                  <Button onClick={createConcepto} disabled={loading}>
                                    {loading ? 'Creando...' : 'Crear'}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>

                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Código</TableHead>
                              <TableHead>Nombre</TableHead>
                              <TableHead>Descripción</TableHead>
                              <TableHead className="w-20">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {conceptos.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-black">
                                  No hay conceptos registrados
                                </TableCell>
                              </TableRow>
                            ) : (
                              conceptos.map((concepto) => (
                                <TableRow key={concepto.id}>
                                  <TableCell className="font-medium text-black">{concepto.codigo}</TableCell>
                                  <TableCell className="font-medium text-black">{concepto.nombre}</TableCell>
                                  <TableCell className="font-medium text-black">{concepto.descripcion || '-'}</TableCell>
                                  <TableCell>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => deleteConcepto(concepto.id)}
                                      disabled={loading}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    <TabsContent value="campos" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-black">Campos Requeridos del Formato</h3>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadTemplate('campos')}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Plantilla
                          </Button>
                          <Dialog open={bulkCampoDialogOpen} onOpenChange={setBulkCampoDialogOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Upload className="w-4 h-4 mr-2" />
                                Carga Masiva
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Carga Masiva de Campos Requeridos</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="campo-file">Seleccionar archivo CSV</Label>
                                  <input
                                    id="campo-file"
                                    type="file"
                                    accept=".csv"
                                    ref={campoFileRef}
                                    onChange={handleCampoFileUpload}
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                  />
                                  <p className="text-sm text-black mt-1">
                                    El archivo debe contener las columnas: campo, requerido
                                  </p>
                                </div>

                                {bulkErrors.length > 0 && (
                                  <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                      <ul className="list-disc list-inside">
                                        {bulkErrors.map((error, index) => (
                                          <li key={index}>{error}</li>
                                        ))}
                                      </ul>
                                    </AlertDescription>
                                  </Alert>
                                )}

                                {bulkCampos.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2 text-black">Vista previa ({bulkCampos.length} campos):</h4>
                                    <div className="max-h-40 overflow-y-auto border rounded p-2">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Atributo</TableHead>
                                            <TableHead>Denominación</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Longitud</TableHead>
                                            <TableHead>Criterios</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {bulkCampos.slice(0, 5).map((campo, index) => (
                                            <TableRow key={index}>
                                              <TableCell className="font-medium text-black">{campo.atributo}</TableCell>
                                              <TableCell className="font-medium text-black">{campo.denominacion}</TableCell>
                                              <TableCell className="font-medium text-black">{campo.tipo}</TableCell>
                                              <TableCell className="font-medium text-black">{campo.longitud}</TableCell>
                                              <TableCell className="font-medium text-black">{campo.criterios || '-'}</TableCell>
                                            </TableRow>
                                          ))}
                                          {bulkCampos.length > 5 && (
                                            <TableRow>
                                              <TableCell colSpan={5} className="text-center text-black">
                                                ... y {bulkCampos.length - 5} más
                                              </TableCell>
                                            </TableRow>
                                          )}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                )}

                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setBulkCampoDialogOpen(false);
                                      setBulkCampos([]);
                                      setBulkErrors([]);
                                      if (campoFileRef.current) campoFileRef.current.value = '';
                                    }}
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    onClick={uploadBulkCampos}
                                    disabled={loading || bulkCampos.length === 0}
                                  >
                                    {loading ? 'Subiendo...' : `Subir ${bulkCampos.length} Campos`}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Dialog open={campoDialogOpen} onOpenChange={setCampoDialogOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Nuevo Campo
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Crear Nuevo Campo Requerido</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="dialog-campo-atributo">Atributo *</Label>
                                  <Input
                                    id="dialog-campo-atributo"
                                    value={nuevoCampo.atributo}
                                    onChange={(e) => setNuevoCampo({ ...nuevoCampo, atributo: e.target.value })}
                                    placeholder="Ej: nit"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="dialog-campo-denominacion">Denominación *</Label>
                                  <Input
                                    id="dialog-campo-denominacion"
                                    value={nuevoCampo.denominacion}
                                    onChange={(e) => setNuevoCampo({ ...nuevoCampo, denominacion: e.target.value })}
                                    placeholder="Ej: NIT del informado"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="dialog-campo-tipo">Tipo</Label>
                                  <select
                                    id="dialog-campo-tipo"
                                    value={nuevoCampo.tipo}
                                    onChange={(e) => setNuevoCampo({ ...nuevoCampo, tipo: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                                  >
                                    <option value="Texto">Texto</option>
                                    <option value="Número">Número</option>
                                    <option value="Fecha">Fecha</option>
                                    <option value="Alfanumérico">Alfanumérico</option>
                                  </select>
                                </div>
                                <div>
                                  <Label htmlFor="dialog-campo-longitud">Longitud</Label>
                                  <Input
                                    id="dialog-campo-longitud"
                                    type="number"
                                    value={nuevoCampo.longitud}
                                    onChange={(e) => setNuevoCampo({ ...nuevoCampo, longitud: parseInt(e.target.value) || 100 })}
                                    placeholder="100"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="dialog-campo-criterios">Criterios</Label>
                                  <Input
                                    id="dialog-campo-criterios"
                                    value={nuevoCampo.criterios}
                                    onChange={(e) => setNuevoCampo({ ...nuevoCampo, criterios: e.target.value })}
                                    placeholder="Ej: Obligatorio, sin guiones ni puntos"
                                  />
                                </div>
                                <div className="flex justify-end space-x-2">
                                  <Button variant="outline" onClick={() => setCampoDialogOpen(false)}>
                                    Cancelar
                                  </Button>
                                  <Button onClick={createCampoRequerido} disabled={loading}>
                                    {loading ? 'Creando...' : 'Crear'}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>

                      <div className="border rounded-lg overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Atributo</TableHead>
                              <TableHead>Denominación</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Longitud</TableHead>
                              <TableHead>Criterios</TableHead>
                              <TableHead className="w-20">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {camposRequeridos.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center text-black">
                                  No hay campos requeridos registrados
                                </TableCell>
                              </TableRow>
                            ) : (
                              camposRequeridos.map((campo) => (
                                <TableRow key={campo.id}>
                                  <TableCell className="font-medium text-black">{campo.atributo}</TableCell>
                                  <TableCell className="font-medium text-black">{campo.denominacion}</TableCell>
                                  <TableCell className="font-medium text-black">{campo.tipo}</TableCell>
                                  <TableCell className="font-medium text-black">{campo.longitud}</TableCell>
                                  <TableCell className="font-medium text-black">
                                    {campo.criterios ? (
                                      <span className={campo.criterios.toLowerCase().includes('obligatorio') ? 'text-red-600 font-medium' : ''}>
                                        {campo.criterios}
                                      </span>
                                    ) : (
                                      <span className="text-black">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => deleteCampoRequerido(campo.id)}
                                      disabled={loading}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <FileText className="w-12 h-12 text-black mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-black mb-2">
                      Selecciona un formato
                    </h3>
                    <p className="text-black">
                      Haz clic en un formato de la lista para ver sus conceptos y campos requeridos
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}