'use client';
import { useId, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { type Category, iconKeys, PERSONAL_USER_ID } from '../model';
import { categoryIcons, iconLabels } from '../icons';
import { type FormProps, field } from './types';

export function CategoryForm({
  data,
  save,
  busy,
  done,
  category,
}: { category?: Category } & FormProps) {
  const [icon, setIcon] = useState<Category['icon']>(category?.icon || 'wallet');
  const [error, setError] = useState('');
  const labelId = useId();
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setError('');
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
          color: field(form, 'color'),
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
          {iconKeys.map((key) => (
            <button
              key={key}
              type="button"
              title={iconLabels[key]}
              aria-label={iconLabels[key]}
              aria-pressed={icon === key}
              className={icon === key ? 'selected' : ''}
              onClick={() => setIcon(key)}
            >
              <Icon icon={categoryIcons[key]} />
            </button>
          ))}
        </div>
        <label>
          Màu nhận diện
          <input type="color" name="color" defaultValue={category?.color || '#2563eb'} />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary full">
          {busy ? 'Đang lưu…' : category ? 'Lưu danh mục' : 'Thêm danh mục'}
        </button>
      </fieldset>
    </form>
  );
}
