'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import SubNavbar from '@/components/informacion-exogena/SubNavbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Download, Users, Plus } from 'lucide-react';

interface Tercero {
  id: number;
  tipo_tercero: 'NIT' | 'CC';
  nit_cc: string;
  razon_social?: string;
  nombre1: string;
  nombre2?: string;
  apellido1?: string;
  apellido2?: string;
  direccion?: string;
  codigo_municipio?: string;
  codigo_pais: string;
  activo: boolean;
}

export default function TercerosPage() {
  const params = useParams();
  const vigenciaId = parseInt(params.vigenciaId as string);

  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadTerceros();
  }, [vigenciaId]);

  const loadTerceros = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/informacion-exogena/terceros');
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        toast.error('Error al cargar terceros', {
          description: result.error || 'No se pudieron cargar los terceros',
          duration: 5000
        });
        console.error('Error loading terceros:', result);
        return;
      }
      const data = await response.json();
      setTerceros(data);
    } catch (error) {
      console.error('Error loading terceros:', error);
      toast.error('Error de conexión', {
        description: 'No se pudo conectar con el servidor',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    try {
      const data = {
        vigencia_id: vigenciaId,
        tipo_tercero: formData.get('tipo_tercero') as 'NIT' | 'CC',
        nit_cc: formData.get('nit_cc') as string,
        razon_social: formData.get('razon_social') as string || undefined,
        nombre1: formData.get('nombre1') as string,
        nombre2: formData.get('nombre2') as string || undefined,
        apellido1: formData.get('apellido1') as string || undefined,
        apellido2: formData.get('apellido2') as string || undefined,
        direccion: formData.get('direccion') as string || undefined,
        codigo_municipio: formData.get('codigo_municipio') as string || undefined,
        codigo_pais: formData.get('codigo_pais') as string || 'CO'
      };

      const response = await fetch('/api/informacion-exogena/terceros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        toast.error('Error al guardar tercero', {
          description: result.error || 'No se pudo guardar el tercero',
          duration: 5000
        });
        console.error('Error saving tercero:', result);
        return;
      }

      toast.success('Tercero guardado exitosamente');
      setIsDialogOpen(false);
      loadTerceros();
    } catch (error) {
      console.error('Error saving tercero:', error);
      toast.error('Error de conexión', {
        description: 'No se pudo conectar con el servidor',
        duration: 5000
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !vigenciaId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('vigenciaId', vigenciaId.toString());

      const response = await fetch('/api/informacion-exogena/terceros/import', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        toast.error('Error al importar terceros', {
          description: result.error || result.details || 'Verifica el formato del archivo',
          duration: 6000
        });
        console.error('Error importing terceros:', result);
        return;
      }

      const result = await response.json();

      // Recargar datos
      await loadTerceros();

      // Mostrar resultado
      if (result.created > 0) {
        toast.success(`${result.created} tercero(s) importado(s) exitosamente`);
      }
      if (result.errors && result.errors.length > 0) {
        setTimeout(() => {
          toast.warning('Algunos registros tenían errores', {
            description: `${result.errors.length} fila(s) con problemas`,
            duration: 5000
          });
        }, 500);
      }
    } catch (error) {
      console.error('Error importing terceros:', error);
      toast.error('Error de conexión', {
        description: 'No se pudo conectar con el servidor',
        duration: 5000
      });
    } finally {
      setUploading(false);
      // Limpiar el input file
      const input = document.getElementById('file-upload') as HTMLInputElement;
      if (input) input.value = '';
    }
  };

  const downloadTemplate = async () => {
    const headers = ['Tipo', 'NIT/CC', 'Razón Social', 'Nombre 1', 'Nombre 2', 'Apellido 1', 'Apellido 2', 'Dirección', 'Municipio', 'País'];
    const sampleData = [
      ['NIT', '901234567', 'Empresa S.A.S.', '', '', '', '', 'Calle 123 #45-67', '11001', 'CO'],
      ['CC', '12345678', '', 'Juan', 'Carlos', 'Pérez', 'Gómez', 'Carrera 7 #12-34', '05001', 'CO'],
      ['NIT', '900456789', 'Comercializadora XYZ Ltda', '', '', '', '', 'Av. El Dorado #68-90', '11001', 'CO'],
      ['CC', '40123456', '', 'María', 'Fernanda', 'García', 'López', 'Calle 45 #23-12', '11001', 'CO'],
      ['NIT', '890234567', 'Industrias del Norte S.A.', '', '', '', '', 'Carrera 15 #85-23', '05001', 'CO'],
      ['CC', '79456123', '', 'Carlos', 'Alberto', 'Rodríguez', 'Martínez', 'Calle 100 #15-20', '11001', 'CO'],
      ['NIT', '900789012', 'Servicios Integrales S.A.S.', '', '', '', '', 'Calle 72 #10-34', '76001', 'CO'],
      ['CC', '52987654', '', 'Ana', 'Patricia', 'Hernández', 'Silva', 'Carrera 50 #45-67', '05001', 'CO'],
      ['NIT', '890567890', 'Distribuciones Colombia Ltda', '', '', '', '', 'Av. Caracas #45-23', '11001', 'CO'],
      ['CC', '1015678901', '', 'Luis', 'Fernando', 'Ramírez', 'Torres', 'Calle 80 #12-45', '76001', 'CO']
    ];

    try {
      // Usar importación dinámica para XLSX
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Terceros');

      XLSX.writeFile(wb, 'template_terceros.xlsx');
      toast.success('Template descargado exitosamente');
    } catch (error) {
      console.error('Error generating template:', error);
      toast.error('Error al generar el template', {
        description: 'No se pudo crear el archivo Excel',
        duration: 5000
      });
    }
  };

  const getNombreCompleto = (tercero: Tercero) => {
    if (tercero.tipo_tercero === 'NIT') {
      return tercero.razon_social || 'Sin razón social';
    } else {
      return `${tercero.nombre1} ${tercero.nombre2 || ''} ${tercero.apellido1 || ''} ${tercero.apellido2 || ''}`.trim();
    }
  };

  if (loading) {
    return <div className="p-6">Cargando terceros...</div>;
  }

  return (
    <>
      <SubNavbar />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terceros</h1>
          <p className="text-gray-600">
            Gestiona proveedores y clientes para información exógena
          </p>
        </div>

        {/* Acciones */}
        <div className="mb-6 flex flex-wrap gap-4">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Tercero
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nuevo Tercero</DialogTitle>
              </DialogHeader>
              <form action={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tipo_tercero">Tipo</Label>
                    <Select name="tipo_tercero" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NIT">NIT (Persona Jurídica)</SelectItem>
                        <SelectItem value="CC">CC (Persona Natural)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="nit_cc">NIT/CC</Label>
                    <Input id="nit_cc" name="nit_cc" required />
                  </div>
                </div>

                <div>
                  <Label htmlFor="razon_social">Razón Social (solo NIT)</Label>
                  <Input id="razon_social" name="razon_social" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nombre1">Nombre 1 *</Label>
                    <Input id="nombre1" name="nombre1" required />
                  </div>
                  <div>
                    <Label htmlFor="nombre2">Nombre 2</Label>
                    <Input id="nombre2" name="nombre2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="apellido1">Apellido 1 (obligatorio para CC)</Label>
                    <Input id="apellido1" name="apellido1" />
                  </div>
                  <div>
                    <Label htmlFor="apellido2">Apellido 2</Label>
                    <Input id="apellido2" name="apellido2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="direccion">Dirección</Label>
                    <Input id="direccion" name="direccion" />
                  </div>
                  <div>
                    <Label htmlFor="codigo_municipio">Código Municipio</Label>
                    <Input id="codigo_municipio" name="codigo_municipio" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="codigo_pais">Código País</Label>
                  <Input id="codigo_pais" name="codigo_pais" defaultValue="CO" />
                </div>

                <Button type="submit">Guardar</Button>
              </form>
            </DialogContent>
          </Dialog>

          <div>
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading || !vigenciaId}
            />
            <Button
              variant="outline"
              disabled={uploading || !vigenciaId}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Subiendo...' : 'Subir Excel'}
            </Button>
          </div>

          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Descargar Template
          </Button>
        </div>

        {/* Información del archivo */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600">
              <p><strong>Formato esperado:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Columna A: Tipo (NIT o CC)</li>
                <li>Columna B: NIT/CC (obligatorio)</li>
                <li>Columna C: Razón Social (solo para NIT)</li>
                <li>Columna D: Nombre 1 (obligatorio)</li>
                <li>Columna E: Nombre 2</li>
                <li>Columna F: Apellido 1 (obligatorio para CC)</li>
                <li>Columna G: Apellido 2</li>
                <li>Columna H: Dirección</li>
                <li>Columna I: Municipio</li>
                <li>Columna J: País (por defecto CO)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de terceros */}
        <Card>
          <CardHeader>
            <CardTitle>Terceros ({terceros.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {terceros.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>NIT/CC</TableHead>
                    <TableHead>Nombre/Razón Social</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Municipio</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terceros.map((tercero) => (
                    <TableRow key={tercero.id}>
                      <TableCell className="text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs ${tercero.tipo_tercero === 'NIT'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                          }`}>
                          {tercero.tipo_tercero}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-gray-900">{tercero.nit_cc}</TableCell>
                      <TableCell className="text-gray-900">{getNombreCompleto(tercero)}</TableCell>
                      <TableCell className="text-gray-900">{tercero.direccion || '-'}</TableCell>
                      <TableCell className="text-gray-900">{tercero.codigo_municipio || '-'}</TableCell>
                      <TableCell className="text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs ${tercero.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {tercero.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  No hay terceros registrados. Agrega uno manualmente o sube un archivo Excel.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}