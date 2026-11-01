'use client';
import { useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faPen } from '@fortawesome/free-solid-svg-icons';
import { PERSONAL_USER_ID, type Person } from '../model';
import { type FormProps, field } from './types';
export function PeopleForm({ data, save, busy }: FormProps) {
  const [editing, setEditing] = useState<Person | null>(null);
  const [createError, setCreateError] = useState('');
  const [editError, setEditError] = useState('');
  return (
    <>
      <p className="dialog-description">
        Tạo người liên quan trước, sau đó chọn người này khi ghi công nợ. Đổi tên vẫn giữ nguyên
        liên kết với các khoản đã có.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setCreateError('');
          const form = e.currentTarget;
          const name = field(new FormData(form), 'name');
          if (
            data.people.some((p) => p.name.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'))
          )
            return setCreateError('Tên này đã tồn tại.');
          if (
            await save({
              ...data,
              people: [...data.people, { id: crypto.randomUUID(), userId: PERSONAL_USER_ID, name }],
            })
          ) {
            form.reset();
          }
        }}
      >
        <fieldset disabled={busy}>
          <label>
            Tên người liên quan
            <input name="name" maxLength={80} placeholder="Tên người / đơn vị" required />
          </label>
          {createError && (
            <p className="form-error" role="alert">
              {createError}
            </p>
          )}
          <button className="button primary full">
            {busy ? 'Đang lưu…' : 'Thêm người liên quan'}
          </button>
        </fieldset>
      </form>
      <div className="category-editor-list">
        {data.people.map((p) => (
          <button
            key={p.id}
            disabled={busy}
            onClick={() => {
              setEditing(p);
              setEditError('');
            }}
          >
            {p.name}
            <Icon icon={faPen} />
          </button>
        ))}
      </div>
      {!data.people.length && <p className="dialog-description">Chưa có người liên quan.</p>}
      {editing && (
        <form
          key={editing.id}
          onSubmit={async (e) => {
            e.preventDefault();
            setEditError('');
            const name = field(new FormData(e.currentTarget), 'name');
            if (
              data.people.some(
                (p) =>
                  p.id !== editing.id &&
                  p.name.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'),
              )
            )
              return setEditError('Tên này đã tồn tại.');
            if (
              await save({
                ...data,
                people: data.people.map((p) => (p.id === editing.id ? { ...p, name } : p)),
              })
            )
              setEditing(null);
          }}
        >
          <fieldset disabled={busy}>
            <label>
              Tên người liên quan
              <input autoFocus name="name" defaultValue={editing.name} maxLength={80} required />
            </label>
            {editError && (
              <p className="form-error" role="alert">
                {editError}
              </p>
            )}
            <button className="button primary full">{busy ? 'Đang lưu…' : 'Lưu tên'}</button>
          </fieldset>
        </form>
      )}
    </>
  );
}
