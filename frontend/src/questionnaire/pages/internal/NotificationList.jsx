import PageHeader from '../../../components/ui/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { Link } from 'react-router-dom';
import {
  useQuestionnaireActions,
  useQuestionnaireState,
} from '../../store/QuestionnaireStore.jsx';
import { formatDateTime } from '../../../lib/format.js';
import './dashboard.css';

/**
 * Notifikasi dalam aplikasi.
 *
 * Pengiriman email berada di sisi server, jadi yang ada di sini hanya
 * peristiwanya. Ketika penyedia email disambungkan kelak, pemicunya sudah
 * lengkap dan tidak ada alur yang perlu diubah.
 */
export default function NotificationList({ audience = 'internal', trailRoot }) {
  const { notifications } = useQuestionnaireState();
  const actions = useQuestionnaireActions();

  const items = notifications.filter((item) => item.audience === audience);
  const unread = items.filter((item) => !item.read).length;

  return (
    <>
      <PageHeader
        trail={[{ label: 'Beranda', to: trailRoot }, { label: 'Notifikasi' }]}
        icon="status"
        title="Notifikasi"
        description="Peristiwa terkait kuesioner yang memerlukan perhatian Anda."
        actions={
          unread > 0 && (
            <Button variant="secondary" onClick={() => actions.markAllNotificationsRead()}>
              Tandai semua dibaca
            </Button>
          )
        }
      />

      {items.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Belum ada notifikasi"
            description="Penugasan baru, pengiriman kuesioner, dan keputusan tinjauan akan muncul di sini."
          />
        </div>
      ) : (
        <Card>
          <ul className="notiflist">
            {items.map((item) => (
              <li key={item.id} className={`notif ${item.read ? '' : 'notif--unread'}`.trim()}>
                <div className="notif__body">
                  <p className="notif__title">{item.title}</p>
                  <p className="notif__text">{item.body}</p>
                  <time className="notif__time" dateTime={item.at}>
                    {formatDateTime(item.at)}
                  </time>
                </div>

                <div className="notif__actions">
                  {item.link && (
                    <Link className="btn btn--secondary btn--sm" to={item.link}>
                      Buka
                    </Link>
                  )}
                  {!item.read && (
                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={() => actions.markNotificationRead(item.id)}
                    >
                      Tandai dibaca
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
