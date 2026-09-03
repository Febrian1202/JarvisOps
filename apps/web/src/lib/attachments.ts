export function attachmentDownloadUrl(url: string): string {
  // Rewrite /api/attachments/{id}/download → /api/proxy/attachments/{id}/download
  if (url.startsWith('/api/')) {
    return url.replace(/^\/api\//, '/api/proxy/');
  }
  return url;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}