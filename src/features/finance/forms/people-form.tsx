'use client';
import { useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faPen } from '@fortawesome/free-solid-svg-icons';
import { type Person } from '../model';
import { type FormProps, field } from './types';
export function PeopleForm({ data, save, busy }: FormProps) {
  const [editing, setEditing] = useState<Person | null>(null);
  const [error, setError] = useState('');
  return (
    <>
      <p className="dialog-description">
        Người liên quan được liên kết với công nợ bằng ID. Đổi tên sẽ cập nhật toàn bộ khoản liên
        quan.
      </p>
      <div className="category-editor-list">
        {data.people.map((p) => (
          <button
            key={p.id}
            disabled={busy}
            onClick={() => {
              setEditing(p);
              setError('');
            }}
          >
            {p.name}
            <Icon icon={faPen} />
          </button>
        ))}
      </div>
      {!data.people.length && (
        <p className="dialog-description">Chưa có người liên quan. Thêm người khi ghi công nợ.</p>
      )}
      {editing && (
        <form
          key={editing.id}
          onSubmit={async (e) => {
            e.preventDefault();
            const name = field(new FormData(e.currentTarget), 'name');
            if (
              data.people.some(
                (p) =>
                  p.id !== editing.id &&
                  p.name.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'),
              )
            )
              return setError('Tên này đã tồn tại.');
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
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary full">{busy ? 'Đang lưu…' : 'Lưu tên'}</button>
          </fieldset>
        </form>
      )}
    </>
  );
}
