import { Link } from 'react-router-dom';

const VARIANTS = ['primary', 'secondary', 'accent', 'success', 'danger', 'quiet'];

/**
 * Tombol tunggal untuk seluruh aplikasi.
 * Memberi prop `to` akan merender <Link> agar navigasi tetap memakai
 * anchor asli dan bisa dibuka di tab baru.
 */
export default function Button({
  variant = 'primary',
  size,
  block = false,
  to,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const safeVariant = VARIANTS.includes(variant) ? variant : 'primary';
  const classes = [
    'btn',
    `btn--${safeVariant}`,
    size === 'sm' ? 'btn--sm' : '',
    block ? 'btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
