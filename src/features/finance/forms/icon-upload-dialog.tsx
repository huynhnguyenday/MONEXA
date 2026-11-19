'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import Dialog from '@/components/dialog';
import PendingLabel from '@/components/pending-label';
import { importIconImage } from './import-icon-image';
import { customIconSchema, type CustomIcon } from '../custom-icon-schema';

export default function IconUploadDialog({
  busy,
  onClose,
  onSave,
}: {
  busy: boolean;
  onClose: () => void;
  onSave: (icon: CustomIcon) => Promise<boolean>;
}) {
  const [image, setImage] = useState('');
  const [name, setName] = useState('');
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  return createPortal(
    <Dialog title="Thêm icon" onClose={onClose} busy={busy || reading}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          event.stopPropagation();
          setError('');
          if (busy || reading) return;
          const parsed = customIconSchema.safeParse({
            id: crypto.randomUUID(),
            userId: 'personal',
            name,
            image,
          });
          if (!parsed.success) {
            setError('Nhập tên và chọn icon hợp lệ.');
            return;
          }
          if (await onSave(parsed.data)) onClose();
          else
            setError('Không lưu được icon. Giữ nguyên ảnh và thử lại sau khi kiểm tra thông báo.');
        }}
      >
        <fieldset disabled={busy || reading}>
          <label>
            Tên icon
            <input
              required
              maxLength={50}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Tệp SVG hoặc PNG
            <input
              type="file"
              accept=".svg,.png,image/svg+xml,image/png"
              required
              onChange={async (event) => {
                const file = event.target.files?.[0];
                setImage('');
                setError('');
                if (!file) return;
                setReading(true);
                try {
                  setImage(await importIconImage(file));
                  if (!name) setName(file.name.replace(/\.(svg|png)$/i, '').slice(0, 50));
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Không đọc được icon.');
                } finally {
                  setReading(false);
                }
              }}
            />
          </label>
          {image && <img className="custom-icon-preview" src={image} alt="Xem trước icon" />}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button
            className="button primary full monexa-action monexa-create"
            disabled={!image || busy || reading}
            aria-busy={busy || reading}
          >
            {busy || reading ? <PendingLabel>Đang xử lý</PendingLabel> : 'Thêm vào thư viện'}
          </button>
        </fieldset>
      </form>
    </Dialog>,
    document.body,
  );
}
