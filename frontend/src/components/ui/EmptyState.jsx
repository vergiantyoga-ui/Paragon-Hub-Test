/** Layar kosong menawarkan langkah berikutnya, bukan sekadar "tidak ada data". */
export default function EmptyState({ title, description, action }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
