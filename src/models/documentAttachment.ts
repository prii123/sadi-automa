export interface DocumentTemplateAttachment {
  id?: number;
  template_id: number;
  document_type: 'renovar' | 'resolucion' | 'soporte' | 'certificado' | 'general';
  file_name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  description?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}