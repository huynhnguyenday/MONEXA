export default function ExpenseTitle({ title }: { title: string }) {
  return <span className="expense-name expense-wrapped-title" title={title}>{title}</span>;
}
