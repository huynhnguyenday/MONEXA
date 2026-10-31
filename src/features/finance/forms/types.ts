import type { FinanceData } from '../model';
export type Save = (data: FinanceData) => Promise<boolean>;
export type FormProps = { data: FinanceData; save: Save; done: () => void; busy: boolean };
export const field = (form: FormData, key: string) => String(form.get(key) || '').trim();
