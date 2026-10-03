import { useEffect, useRef, useState } from 'react';

export interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'info' | 'danger';
}

/** Toast list with auto-dismiss. Timers clear on unmount. */
export function useToasts(timeoutMs = 4000): {
  toasts: Toast[];
  push: (message: string, tone?: Toast['tone']) => void;
  dismiss: (id: number) => void;
} {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const dismiss = (id: number): void => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((t) => t.id !== id));
  };

  const push = (message: string, tone: Toast['tone'] = 'success'): void => {
    const id = nextId.current++;
    setToasts((current) => [...current.slice(-2), { id, message, tone }]);
    timers.current.set(id, setTimeout(() => dismiss(id), timeoutMs));
  };

  return { toasts, push, dismiss };
}
