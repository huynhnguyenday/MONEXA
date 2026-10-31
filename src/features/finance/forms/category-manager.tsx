'use client';
import { useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faPen, faPlus, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { type Category } from '../model';
import { categoryIcons } from '../icons';
import { type FormProps } from './types';
import { CategoryForm } from './category-form';

// Contextual category management inside an expense form; its draft stays mounted.
export function CategoryManager(props: FormProps) {
  const [editing, setEditing] = useState<Category | undefined>();
  const [version, setVersion] = useState(0);
  function edit(category?: Category) {
    setEditing(category);
    setVersion((value) => value + 1);
  }
  return (
    <>
      <p className="dialog-description">
        Đổi tên hoặc icon vẫn giữ nguyên ID và chi tiêu liên quan.
      </p>
      <div className="category-editor-list">
        {props.data.categories.map((category) => (
          <button
            key={category.id}
            disabled={props.busy}
            className={editing?.id === category.id ? 'selected' : ''}
            onClick={() => edit(category)}
          >
            <span style={{ color: category.color }}>
              <Icon icon={categoryIcons[category.icon]} />
            </span>
            {category.name}
            <Icon icon={faPen} />
          </button>
        ))}
      </div>
      <div className="editor-subheading">
        <h3>{editing ? 'Sửa danh mục' : 'Thêm danh mục'}</h3>
        {editing && (
          <button
            className="inline-button"
            type="button"
            disabled={props.busy}
            onClick={() => edit()}
          >
            <Icon icon={faPlus} /> Tạo mới
          </button>
        )}
      </div>
      <CategoryForm key={version} {...props} category={editing} done={() => edit()} />
      <button className="inline-button full" disabled={props.busy} onClick={props.done}>
        Tiếp tục ghi chi tiêu <Icon icon={faArrowRight} />
      </button>
    </>
  );
}
