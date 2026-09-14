import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useT } from '../../i18n/LanguageContext.jsx';
import './tile-grid.css';

/**
 * Kartu menu berbentuk petak: ikon padat di atas, label dua baris di bawah.
 * Dipakai pada halaman beranda sebagai jalan pintas ke tugas utama.
 */
export default function TileGrid({ tiles }) {
  const t = useT();
  return (
    <ul className="tiles">
      {tiles.map((tile) => (
        <li key={tile.to}>
          <Link to={tile.to} className="tile">
            <span className="tile__icon" aria-hidden="true">
              <Icon name={tile.icon} size={26} />
            </span>
            <span className="tile__label">{tile.label}</span>
            {tile.count > 0 && (
              <span className="tile__count">
                {tile.count} {t('common.waiting')}
              </span>
            )}
            {tile.count === 0 && (
              <span className="tile__count tile__count--clear">{t('common.noQueue')}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
