export default function Card({ title, subtitle, actions, children, className = '', ...rest }) {
  return (
    <section className={`card ${className}`.trim()} {...rest}>
      {(title || actions) && (
        <header className="card__head">
          <div className="row row--between">
            <div>
              {title && <h2 className="card__title">{title}</h2>}
              {subtitle && <p className="card__sub">{subtitle}</p>}
            </div>
            {actions}
          </div>
        </header>
      )}
      <div className="card__body">{children}</div>
    </section>
  );
}
