import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import './page-header.css';

/**
 * Kepala halaman: jejak navigasi, ikon berlatar biru muda, judul, lalu garis pemisah.
 * `trail` berbentuk [{ label, to }] — item terakhir ditampilkan sebagai posisi kini.
 */
export default function PageHeader({ trail = [], icon, title, description, actions }) {
  return (
    <header className="page-header">
      {trail.length > 0 && (
        <nav aria-label="Jejak navigasi">
          <ol className="crumbs">
            {trail.map((item, index) => {
              const isLast = index === trail.length - 1;
              return (
                <li key={item.label} className="crumbs__item">
                  {isLast || !item.to ? (
                    <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>
                  ) : (
                    <Link to={item.to}>{item.label}</Link>
                  )}
                  {!isLast && (
                    <Icon name="chevronRight" size={14} className="crumbs__sep" />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="page-header__row">
        <div className="page-header__title">
          {icon && (
            <span className="page-header__icon" aria-hidden="true">
              <Icon name={icon} size={22} />
            </span>
          )}
          <div>
            <h1>{title}</h1>
            {description && <p className="page-header__desc">{description}</p>}
          </div>
        </div>
        {actions && <div className="row">{actions}</div>}
      </div>
    </header>
  );
}
