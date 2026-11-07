import './pending-label.css';

export default function PendingLabel({ children }: { children: string }) {
  return (
    <span className="pending-label" role="status">
      <span>{children}</span>
      <span className="pending-dots" aria-hidden="true">
        <span>.</span><span>.</span><span>.</span>
      </span>
    </span>
  );
}
