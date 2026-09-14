import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import Icon from '../ui/Icon.jsx';
import { useTheme } from '../../store/ThemeContext.jsx';
import { useLanguage, useT } from '../../i18n/LanguageContext.jsx';
import LanguageMenu from '../../i18n/LanguageMenu.jsx';
import { initialsOf } from '../../lib/format.js';
import { useApiStatus } from '../../store/sync.js';
import './app-shell.css';

/**
 * Kerangka bersama portal pemasok dan konsol internal:
 * sidebar berkelompok di kiri, bilah atas berisi waktu dan identitas,
 * konten dibungkus satu permukaan putih.
 *
 * `groups` berbentuk [{ label, items: [{ to, label, icon, count }] }].
 */
export default function AppShell({ groups, user, subtitle, onSignOut, children }) {
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={`shell ${collapsed ? 'shell--collapsed' : ''}`.trim()}>
      <a className="skip-link" href="#main">
        {t('shell.skip')}
      </a>

      {mobileOpen && (
        <div className="shell__scrim" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <aside className={`shell__side ${mobileOpen ? 'shell__side--open' : ''}`.trim()}>
        <div className="shell__brand">
          <span className="shell__logo" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2.6 20.5 7v10L12 21.4 3.5 17V7L12 2.6Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path d="M8.5 14.2h7M8.5 9.8h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <span className="shell__wordmark">
            Paragon<strong>Hub</strong>
          </span>

          <button
            type="button"
            className="shell__collapse"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? t('shell.expand') : t('shell.collapse')}
          >
            <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={18} />
          </button>

          <button
            type="button"
            className="shell__close"
            onClick={() => setMobileOpen(false)}
            aria-label={t('shell.closeMenu')}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <nav className="shell__nav" aria-label={t('shell.mainNav')}>
          {groups.map((group) => (
            <div className="shell__group" key={group.label}>
              <p className="shell__group-label">{group.label}</p>
              <ul className="shell__list">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `shell__link ${isActive ? 'shell__link--active' : ''}`.trim()
                      }
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon name={item.icon} size={20} />
                      <span className="shell__link-text">{item.label}</span>
                      {item.count > 0 && (
                        <span className="shell__count" aria-label={`${item.count} ${t('common.waiting')}`}>
                          {item.count}
                        </span>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <button type="button" className="shell__link shell__signout" onClick={onSignOut}>
          <Icon name="logout" size={20} />
          <span className="shell__link-text">{t('common.signOut')}</span>
        </button>
      </aside>

      <div className="shell__body">
        <header className="shell__top">
          <button
            type="button"
            className="shell__burger"
            onClick={() => setMobileOpen(true)}
            aria-label={t('shell.openMenu')}
          >
            <Icon name="menu" size={20} />
          </button>

          <Clock />

          <ConnectionBadge />

          <LanguageMenu />

          <ThemeToggle />

          <div className="shell__user">
            <span className="shell__avatar" aria-hidden="true">
              {initialsOf(user.name)}
            </span>
            <span className="shell__identity">
              {user.name}
              <small>{subtitle}</small>
            </span>
          </div>
        </header>

        <main id="main" className="shell__main">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Nomor pekan dan waktu berjalan, seperti pada bilah atas rancangan. */
function Clock() {
  const t = useT();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const locale = { id: 'id-ID', en: 'en-GB', zh: 'zh-CN' }[useLanguage().lang] ?? 'id-ID';
  const date = now
    .toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(/ /g, '-');
  const time = now.toLocaleTimeString(locale, { hour12: false });

  return (
    <p className="shell__clock">
      <strong>
        {t('shell.week')} {isoWeek(now)}
      </strong>
      <span>
        {date} {time} WIB
      </span>
    </p>
  );
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/**
 * Penanda sambungan ke basis data.
 *
 * Hanya muncul saat sambungannya putus. Aplikasi tetap dapat dipakai —
 * reducer berjalan di memori — tetapi perubahannya tidak tersimpan, dan itu
 * hal yang harus diketahui penggunanya sebelum menutup tab, bukan ditemukan
 * kemudian saat datanya hilang.
 */
function ConnectionBadge() {
  const t = useT();
  const { online, enabled } = useApiStatus();

  if (!enabled || online) return null;

  return (
    <span className="shell__offline" role="status">
      <span className="shell__offline-dot" aria-hidden="true" />
      {t('shell.offline')}
    </span>
  );
}

function ThemeToggle() {
  const t = useT();
  const { theme, toggle } = useTheme();
  const goingDark = theme === 'light';

  return (
    <button
      type="button"
      className="shell__theme"
      onClick={toggle}
      aria-label={goingDark ? t('shell.toDark') : t('shell.toLight')}
    >
      <Icon name={goingDark ? 'moon' : 'sun'} size={18} />
    </button>
  );
}
