import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { Category } from '../model';
import type { CustomIcon } from '../custom-icon-schema';
import { categoryIcons } from '../icons';
import './category-icon.css';

export default function CategoryIcon({
  category,
  assets = [],
  style,
}: {
  category: Pick<Category, 'icon' | 'customIconId'>;
  assets?: readonly CustomIcon[];
  style?: { color?: string };
}) {
  const asset = category.customIconId && assets.find((icon) => icon.id === category.customIconId);
  return asset ? (
    <img
      className="category-custom-icon"
      src={asset.image}
      alt=""
      aria-hidden="true"
      style={style}
    />
  ) : (
    <FontAwesomeIcon icon={categoryIcons[category.icon] || categoryIcons.receipt} style={style} />
  );
}
