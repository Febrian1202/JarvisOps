import { describe, it, expect } from 'vitest';
import { attachmentDownloadUrl, formatFileSize } from '@/lib/attachments';

describe('attachments lib', () => {
  it('rewrites API path to proxy path', () => {
    expect(attachmentDownloadUrl('/api/attachments/5/download')).toBe(
      '/api/proxy/attachments/5/download'
    );
  });

  it('rewrites relative download_url path', () => {
    expect(attachmentDownloadUrl('/api/attachments/12/download')).toBe(
      '/api/proxy/attachments/12/download'
    );
  });

  it('formats file size in KB', () => {
    expect(formatFileSize(2048)).toBe('2.00 KB');
  });

  it('formats file size in MB', () => {
    expect(formatFileSize(3 * 1024 * 1024)).toBe('3.00 MB');
  });
});