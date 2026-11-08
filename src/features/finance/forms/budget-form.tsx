'use client';
import { AllocationForm } from './allocation-form';
import type { FormProps } from './types';
export function BudgetForm(props: FormProps & { month: string }) {
  return <AllocationForm {...props} budgetOnly />;
}
