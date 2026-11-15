import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import './loading-spinner.css';

export default function LoadingSpinner() {
  return <FontAwesomeIcon icon={faSpinner} spin className="loading-spinner" aria-hidden="true" />;
}
