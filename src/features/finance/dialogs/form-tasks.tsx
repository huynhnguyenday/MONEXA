'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { FormProps } from '../forms/types';

/** Retain submitted forms independently of the next form the user opens. */
export default function FormTasks<T>({
  modal,
  onClose,
  forms,
  children,
}: {
  modal: T | null;
  onClose: () => void;
  forms: FormProps;
  children: (modal: T, forms: FormProps, close: () => void) => ReactNode;
}) {
  const [tasks, setTasks] = useState<{ id: number; modal: T }[]>([]);
  const nextId = useRef(0);
  const active = useRef<T | null>(modal);
  active.current = modal;
  useEffect(() => {
    if (modal !== null)
      setTasks((items) =>
        items.some((item) => item.modal === modal)
          ? items
          : [...items, { id: ++nextId.current, modal }],
      );
  }, [modal]);
  return tasks.map((task) => (
    <FormTask
      key={task.id}
      forms={forms}
      detach={() => {
        if (active.current === task.modal) onClose();
      }}
      remove={() => setTasks((items) => items.filter((item) => item.id !== task.id))}
    >
      {(scoped, close) => children(task.modal, scoped, close)}
    </FormTask>
  ));
}

function FormTask({
  forms,
  detach,
  remove,
  children,
}: {
  forms: FormProps;
  detach: () => void;
  remove: () => void;
  children: (forms: FormProps, close: () => void) => ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const close = () => {
    detach();
    remove();
  };
  return (
    <div ref={root} style={{ display: 'contents' }}>
      {children(
        {
          ...forms,
          busy,
          done: () => {
            forms.done();
            close();
          },
          save: async (data) => {
            if (pending.current) return false;
            pending.current = true;
            setBusy(true);
            const dialogs = document.querySelectorAll('dialog[open]');
            const top = dialogs.item(dialogs.length - 1);
            // Upload/delete icon dialogs must finish without closing the parent draft.
            const ownsSubmission = top === root.current?.querySelector('dialog');
            const timer = ownsSubmission ? setTimeout(detach, 1500) : undefined;
            try {
              return await forms.save(data);
            } finally {
              clearTimeout(timer);
              pending.current = false;
              setBusy(false);
            }
          },
        },
        close,
      )}
    </div>
  );
}
