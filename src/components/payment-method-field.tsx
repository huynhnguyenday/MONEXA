'use client';
import TwoOptionField from './two-option-field';
export default function PaymentMethodField({
  value,
  onChange,
  legend = 'Hình thức thanh toán',
  cashDescription,
  bankDescription,
  className,
}: {
  value: 'cash' | 'bank';
  onChange: (value: 'cash' | 'bank') => void;
  legend?: string;
  cashDescription?: string;
  bankDescription?: string;
  className?: string;
}) {
  return (
    <TwoOptionField
      name="paymentMethod"
      legend={legend}
      value={value}
      onChange={onChange}
      className={className}
      options={[
        { value: 'cash', label: 'Tiền mặt', description: cashDescription },
        { value: 'bank', label: 'Chuyển khoản', description: bankDescription },
      ]}
    />
  );
}
