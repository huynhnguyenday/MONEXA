'use client';
import { useId, useState } from 'react';
import { debtSourceIconColors, debtSourceIconKeys, type DebtSource, PERSONAL_USER_ID } from '../model';
import { DebtSourceIcon } from '../debt-source-icon';
import { type FormProps, field } from './types';

const sourceLabels: Record<DebtSource['icon'], string> = {
  tiktok: 'TikTok', shopee: 'Shopee', seasy: 'SEasy', momo: 'MoMo', bank: 'Ngân hàng', person: 'Cá nhân',
};

export function DebtSourceForm({ data, save, busy, done, debtSource }: { debtSource?: DebtSource } & FormProps) {
  const [icon, setIcon] = useState<DebtSource['icon']>(debtSource?.icon || 'person');
  const [error, setError] = useState('');
  const labelId = useId();
  return (
    <form onSubmit={async (event) => {
      event.preventDefault();
      setError('');
      const name = field(new FormData(event.currentTarget), 'name');
      if (data.debtSources.some((item) => item.id !== debtSource?.id && item.name.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi')))
        return setError('Tên nguồn công nợ này đã tồn tại.');
      const next: DebtSource = { id: debtSource?.id || crypto.randomUUID(), userId: PERSONAL_USER_ID, name, icon, color: debtSourceIconColors[icon] };
      if (await save({ ...data, debtSources: debtSource
        ? data.debtSources.map((item) => item.id === debtSource.id ? next : item)
        : [...data.debtSources, next] })) done();
    }}>
      <fieldset disabled={busy}>
        <label>Tên nguồn công nợ
          <input autoFocus name="name" defaultValue={debtSource?.name} maxLength={80} placeholder="MoMo, Shopee, TikTok Shop…" required />
        </label>
        <div className="field-label" id={labelId}>Icon nguồn công nợ</div>
        <div className="icon-picker" role="group" aria-labelledby={labelId}>
          {debtSourceIconKeys.map((key) => <button key={key} type="button" title={sourceLabels[key]} aria-label={sourceLabels[key]} aria-pressed={icon === key} className={icon === key ? 'selected' : ''} style={{ color: debtSourceIconColors[key] }} onClick={() => setIcon(key)}><DebtSourceIcon icon={key} /></button>)}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button primary full">{busy ? 'Đang lưu…' : debtSource ? 'Lưu nguồn công nợ' : 'Thêm nguồn công nợ'}</button>
      </fieldset>
    </form>
  );
}
