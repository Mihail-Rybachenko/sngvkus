import type { ProjectStatus } from '@/types';

/** Скачивание файлов (Word, PDF, PNG, PPTX и т.п.) — только после утверждения координатором. */
export function canDownloadExports(status: ProjectStatus | string | null | undefined): boolean {
  // По требованию: экспорт всегда доступен, независимо от статуса.
  return true;
}

export const EXPORT_LOCKED_MESSAGE =
  'Экспорт доступен на любом этапе проекта.';
