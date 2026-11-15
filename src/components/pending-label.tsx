import './pending-label.css';
import LoadingSpinner from './loading-spinner';

export default function PendingLabel({ children }: { children: string }) {
  return (
    <span className="pending-label" role="status">
      <LoadingSpinner />
      <span>{children}</span>
    </span>
  );
}
