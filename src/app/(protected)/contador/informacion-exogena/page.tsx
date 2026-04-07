'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Empresa {
  id: number;
  nombre: string;
  nit: string;
}

export default function InformacionExogenaPage() {
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [selectedVigencia, setSelectedVigencia] = useState<number | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const response = await fetch('/api/empresas');
        const data = await response.json();
        if (data.success) {
          setEmpresas(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching empresas:', error);
      }
    };
    fetchEmpresas();
  }, []);

  const vigencias = [2023, 2024, 2025, 2026]; // Años fiscales disponibles

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Información Exógena</h1>
        <p className="text-gray-600">
          Gestión completa de información exógena para cumplimiento tributario DIAN
        </p>
      </div>

      {/* Selector de Empresa y Vigencia */}
      <div className="mb-8 p-4 bg-black-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4 text-black">Configuración</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Empresa
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md text-black"
              value={selectedEmpresa?.id || ''}
              onChange={(e) => {
                const empresaId = Number(e.target.value);
                const empresa = empresas.find(emp => emp.id === empresaId) || null;
                setSelectedEmpresa(empresa);
              }}
            >
              <option value="">Seleccionar empresa...</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nombre} ({empresa.nit})
                </option>
              ))}
            </select>
          </div>
          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vigencia Fiscal
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md text-black"
              value={selectedVigencia || ''}
              onChange={(e) => setSelectedVigencia(Number(e.target.value) || null)}
            >
              <option value="">Seleccionar vigencia...</option>
              {vigencias.map((vigencia) => (
                <option key={vigencia} value={vigencia}>
                  {vigencia}
                </option>
              ))}
            </select>
          </div> */}
        </div>
        {selectedEmpresa && (
          <div className="mt-4">
            <Link href={`/contador/informacion-exogena/${selectedEmpresa.nit}`}>
              <Button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Ir
              </Button>
            </Link>
          </div>
        )}
      </div>

    </div>
  );
}
