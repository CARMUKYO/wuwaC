import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob, REVOKE_DELAY_MS } from './download.ts';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('downloadBlob', () => {
  it('clicks a download anchor and revokes the URL only after the delay', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    const clicked: { href: string; download: string; attached: boolean }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ href: this.getAttribute('href') ?? '', download: this.download, attached: this.isConnected });
    });

    downloadBlob(new Blob(['{}'], { type: 'application/json' }), 'out.json');

    expect(clicked).toEqual([{ href: 'blob:mock', download: 'out.json', attached: true }]);
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(REVOKE_DELAY_MS - 1);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });
});
