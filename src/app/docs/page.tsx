'use client';

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

// Wrapper component to suppress React warnings for swagger-ui-react
const SwaggerUIWrapper = ({ spec }: { spec: any }) => {
  useEffect(() => {
    // Suppress specific React warnings from swagger-ui-react
    const originalWarn = console.warn;
    console.warn = (...args) => {
      if (args[0]?.includes?.('UNSAFE_componentWillReceiveProps') ||
          args[0]?.includes?.('componentWillReceiveProps')) {
        return; // Suppress these warnings
      }
      originalWarn.apply(console, args);
    };

    return () => {
      console.warn = originalWarn; // Restore original console.warn
    };
  }, []);

  return <SwaggerUI spec={spec} />;
};

export default function ApiDocsPage() {
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    fetch('/api/docs')
      .then((res) => res.json())
      .then((data) => setSpec(data))
      .catch((err) => console.error('Error loading API spec:', err));
  }, []);

  if (!spec) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">SADI API Documentation</h1>
            <p className="text-gray-600 mt-1">
              Documentación completa de la API de SADI (Sistema de Administración y Declaraciones de Impuestos)
            </p>
          </div>
          <div className="p-6">
            <SwaggerUIWrapper spec={spec} />
          </div>
        </div>
      </div>
    </div>
  );
}