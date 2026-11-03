'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useFinance } from './use-finance';
import type { FinanceView, FinanceModal } from '../types';
import {
  type Expense,
  type Debt,
  type Category,
  type DebtSource,
  type FinanceData,
  initialData,
  getStatistics,
  localDate,
  parseBackup,
  LEGACY_STORAGE_KEY,
} from '../model';
export function useDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const [month, setMonth] = useState('');
  const [debtView, setDebtView] = useState<'calendar' | 'history'>('calendar');
  const tab: FinanceView = pathname === '/debts' ? 'debts' : pathname === '/categories' ? 'categories' : pathname === '/debt-sources' ? 'debt-sources' : 'overview';
  const [modal, setModal] = useState<FinanceModal>(null);
  const [notice, setNotice] = useState(''),
    [hasLegacy, setHasLegacy] = useState(false),
    [navOpen, setNavOpen] = useState(false);
  const { snapshot, busy, loading, error, conflict, refresh, save } = useFinance(!!modal);
  const data = snapshot?.data || initialData,
    ready = !!snapshot && !loading && !busy;
  const importRef = useRef<HTMLInputElement>(null),
    navToggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setMonth(localDate().slice(0, 7));
    try {
      setHasLegacy(!!localStorage.getItem(LEGACY_STORAGE_KEY));
      setNavOpen(localStorage.getItem('monexa:nav-open') === 'true' && window.innerWidth >= 1024);
    } catch {}
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!navOpen) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !modal) {
        closeNavigation();
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [navOpen, modal]);
  const stats = useMemo(() => getStatistics(data, month || localDate().slice(0, 7)), [data, month]);
  function toggleNav() {
    const next = !navOpen;
    setNavOpen(next);
    if (window.innerWidth >= 1024)
      try {
        localStorage.setItem('monexa:nav-open', String(next));
      } catch {}
  }
  function closeNavigation() {
    setNavOpen(false);
    if (window.innerWidth >= 1024)
      try {
        localStorage.setItem('monexa:nav-open', 'false');
      } catch {}
    navToggleRef.current?.focus();
  }
  function navigate(value: FinanceView) {
    router.push(value === 'overview' ? '/overview' : `/${value}`);
    if (value === 'debts') setDebtView('calendar');
    closeNavigation();
  }
  function open(value: FinanceModal) {
    setModal(value);
    setNotice('');
    closeNavigation();
  }
  function close() {
    setModal(null);
  }
  function done() {
    setModal(null);
    setNotice('Đã lưu.');
  }
  async function readReminders(ids: string[]) {
    if (!ready || modal) return false;
    const selected = new Set(ids);
    return await save({ ...data, debts: data.debts.map((debt) =>
      selected.has(debt.id) && debt.dueDate ? { ...debt, reminderReadFor: debt.dueDate } : debt,
    ) });
  }
  const formProps = { data, save: async (next: FinanceData) => await save(next), done, busy };
  async function deleteExpense(expense: Expense) {
    if (expense.debtId) {
      setNotice('Khoản chi này liên kết với công nợ. Hãy sửa, mở lại hoặc xóa khoản công nợ gốc.');
      return;
    }
    if (
      window.confirm(`Xóa khoản chi “${expense.title}”?`) &&
      (await save({ ...data, expenses: data.expenses.filter((e) => e.id !== expense.id) }))
    )
      setNotice('Đã xóa khoản chi.');
  }
  async function deleteDebt(debt: Debt) {
    if (
      window.confirm(`Xóa khoản công nợ “${debt.title}” và chi tiêu tự động liên kết (nếu có)?`) &&
      (await save({ ...data, debts: data.debts.filter((d) => d.id !== debt.id), expenses: data.expenses.filter((expense) => expense.debtId !== debt.id) }))
    )
      setNotice('Đã xóa công nợ.');
  }
  async function deleteCategory(category: Category) {
    if (data.expenses.some((expense) => expense.categoryId === category.id))
      return setNotice('Không thể xóa danh mục đang có chi tiêu.');
    if (data.categories.length === 1) return setNotice('Cần giữ ít nhất một danh mục.');
    if (
      window.confirm(`Xóa danh mục “${category.name}”?`) &&
      (await save({
        ...data,
        categories: data.categories.filter((item) => item.id !== category.id),
      }))
    )
      setNotice('Đã xóa danh mục.');
  }
  async function deleteDebtSource(source: DebtSource) {
    if (data.debts.some((debt) => debt.debtSourceId === source.id))
      return setNotice('Không thể xóa nguồn đang được công nợ sử dụng.');
    if (
      window.confirm(`Xóa nguồn công nợ “${source.name}”?`) &&
      (await save({ ...data, debtSources: data.debtSources.filter((item) => item.id !== source.id) }))
    ) setNotice('Đã xóa nguồn công nợ.');
  }
  async function settle(debt: Debt) {
    if (
      window.confirm(
        debt.settledAt ? 'Mở lại khoản công nợ này?' : 'Xác nhận đã thanh toán đầy đủ?',
      ) &&
      (await save({
        ...data,
        debts: data.debts.map((d) =>
          d.id === debt.id ? { ...d, settledAt: d.settledAt ? null : new Date().toISOString() } : d,
        ),
      }))
    )
      setNotice(debt.settledAt ? 'Đã mở lại công nợ.' : 'Đã đánh dấu hoàn tất.');
  }
  async function importData(file?: File) {
    if (!file) return;
    try {
      if (file.size > 1950000) throw new Error();
      const next = parseBackup(JSON.parse(await file.text()));
      if (
        window.confirm('Thay thế toàn bộ dữ liệu hiện tại bằng bản sao lưu này?') &&
        (await save(next))
      )
        setNotice('Đã nhập bản sao lưu.');
    } catch {
      setNotice('Tệp JSON không hợp lệ hoặc vượt 2 MB.');
    } finally {
      if (importRef.current) importRef.current.value = '';
    }
  }
  async function migrateLegacy() {
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return;
      const next = parseBackup(JSON.parse(raw));
      if (
        window.confirm(
          'Chuyển dữ liệu cũ lên MongoDB và thay thế dữ liệu hiện tại? Bản cũ trong trình duyệt được giữ lại.',
        ) &&
        (await save(next))
      ) {
        setHasLegacy(false);
        setNotice('Đã chuyển dữ liệu cũ.');
      }
    } catch {
      setNotice('Không đọc được dữ liệu cũ. Hãy dùng bản sao lưu JSON.');
    }
  }
  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `MONEXA-${localDate()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function logout() {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error();
      window.location.assign('/login');
    } catch {
      setNotice('Chưa đăng xuất được. Hãy thử lại.');
    }
  }
  return {
    snapshot,
    readReminders,
    busy,
    loading,
    error,
    conflict,
    refresh,
    data,
    ready,
    month,
    setMonth,
    tab,
    debtView,
    setDebtView,
    modal,
    notice,
    setNotice,
    hasLegacy,
    setHasLegacy,
    navOpen,
    importRef,
    navToggleRef,
    stats,
    toggleNav,
    closeNavigation,
    navigate,
    open,
    close,
    done,
    formProps,
    deleteExpense,
    deleteDebt,
    deleteCategory,
    deleteDebtSource,
    settle,
    importData,
    migrateLegacy,
    exportData,
    logout,
  };
}
