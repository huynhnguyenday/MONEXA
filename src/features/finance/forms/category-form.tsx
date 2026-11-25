'use client';
import Toast from '@/components/toast';
import PendingLabel from '@/components/pending-label';
import { useId, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { type Category, PERSONAL_USER_ID } from '../model';
import { faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import CategoryIcon from '../components/category-icon';
import IconUploadDialog from './icon-upload-dialog';
import IconDeleteDialog from './icon-delete-dialog';
import type { CustomIcon } from '../custom-icon-schema';
import './custom-icons.css';
import { type FormProps, field } from './types';

export function CategoryForm({
  data,
  save,
  busy,
  done,
  category,
}: { category?: Category } & FormProps) {
  // Keep the legacy field for old backups; the picker and new links use asset IDs only.
  const icon = category?.icon || 'receipt';
  const [color, setColor] = useState(category?.color || '#db2777');
  const [error, setError] = useState('');
  const [customIconId, setCustomIconId] = useState(category?.customIconId || '');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deletingIcon, setDeletingIcon] = useState<CustomIcon | null>(null);
  const labelId = useId();
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || deletingIcon || uploadOpen) return;
        setError('');
        if (!data.customIcons.some((asset) => asset.id === customIconId))
          return setError('Chọn một icon trong thư viện hoặc thêm icon mới.');
        const form = new FormData(event.currentTarget);
        const name = field(form, 'name');
        if (
          data.categories.some(
            (item) =>
              item.id !== category?.id &&
              item.name.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'),
          )
        )
          return setError('Tên danh mục này đã tồn tại.');
        const next: Category = {
          id: category?.id || crypto.randomUUID(),
          userId: PERSONAL_USER_ID,
          name,
          icon,
          customIconId: customIconId || null,
          color: field(form, 'color'),
          backgroundColor: category?.backgroundColor ?? (icon === 'shirt' ? '#CCFBF1' : undefined),
        };
        if (
          await save({
            ...data,
            categories: category
              ? data.categories.map((item) => (item.id === category.id ? next : item))
              : [...data.categories, next],
          })
        )
          done();
      }}
    >
      <fieldset disabled={busy}>
        <label>
          Tên danh mục
          <input
            name="name"
            autoFocus
            defaultValue={category?.name}
            maxLength={50}
            placeholder="Ví dụ: Sức khỏe"
            required
          />
        </label>
        <div className="field-label" id={labelId}>
          Icon danh mục
        </div>
        <div className="icon-picker" role="group" aria-labelledby={labelId}>
          {data.customIcons.map((asset) => (
            <div className="custom-icon-option" key={asset.id}>
              <button
                type="button"
                title={asset.name}
                aria-label={asset.name}
                aria-pressed={customIconId === asset.id}
                className={customIconId === asset.id ? 'selected' : ''}
                onClick={() => setCustomIconId(asset.id)}
              >
                <CategoryIcon
                  category={{ icon, customIconId: asset.id }}
                  assets={data.customIcons}
                />
              </button>
              <button
                type="button"
                className="custom-icon-remove"
                aria-label={`Xóa icon ${asset.name}`}
                title={`Xóa icon ${asset.name}`}
                onClick={() => setDeletingIcon(asset)}
              >
                <Icon icon={faXmark} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="monexa-action monexa-create"
            aria-label="Thêm icon tùy chỉnh"
            title="Thêm icon tùy chỉnh"
            disabled={data.customIcons.length >= 30}
            onClick={() => setUploadOpen(true)}
          >
            <Icon icon={faPlus} />
          </button>
        </div>
        <label>
          Màu nhận diện
          <input
            type="color"
            name="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
          />
        </label>
        {error && (
          <Toast>
            {error}
          </Toast>
        )}
        <button aria-busy={busy} className="button primary full monexa-action monexa-create">
          {busy ? (
            <PendingLabel>Đang lưu</PendingLabel>
          ) : category ? (
            'Lưu danh mục'
          ) : (
            'Thêm danh mục'
          )}
        </button>
      </fieldset>
      {uploadOpen && (
        <IconUploadDialog
          busy={busy}
          onClose={() => setUploadOpen(false)}
          onSave={async (asset) => {
            if (await save({ ...data, customIcons: [...data.customIcons, asset] })) {
              setCustomIconId(asset.id);
              return true;
            }
            return false;
          }}
        />
      )}
      {deletingIcon && (
        <IconDeleteDialog
          asset={deletingIcon}
          affectedCount={
            data.categories.filter((item) => item.customIconId === deletingIcon.id).length
          }
          busy={busy}
          onClose={() => setDeletingIcon(null)}
          onDelete={async () => {
            // A used icon must be replaced explicitly before deleting its library record.
            if (data.categories.some((item) => item.customIconId === deletingIcon.id)) return false;
            const removed = await save({
              ...data,
              customIcons: data.customIcons.filter((item) => item.id !== deletingIcon.id),
            });
            if (removed && customIconId === deletingIcon.id) setCustomIconId('');
            return removed;
          }}
        />
      )}
    </form>
  );
}
