import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import AppShell from './AppShell.jsx';
import { useAppActions, useAppState, useCurrentSubmission } from '../../store/AppStore.jsx';
import { hasFinishedRegistration } from '../../lib/constants.js';
import { useQuestionnaireState } from '../../questionnaire/store/QuestionnaireStore.jsx';
import { useT } from '../../i18n/LanguageContext.jsx';

/**
 * Portal pemasok. Menu menyesuaikan tahap onboarding: pengisian profil
 * dan persetujuan disembunyikan setelah pemasok berstatus aktif.
 */
export default function SupplierLayout() {
  const t = useT();
  const { session } = useAppState();
  const submission = useCurrentSubmission();
  const questionnaireState = useQuestionnaireState();
  const { signOut } = useAppActions();
  const navigate = useNavigate();

  if (session?.kind !== 'supplier' || !submission) return <Navigate to="/masuk" replace />;

  // Portal terbuka penuh begitu dokumen lolos periksa, bukan hanya saat preferred.
  const isActive = hasFinishedRegistration(submission.status);
  const profileDone = Object.values(submission.profile.completed).every(Boolean);

  const myAssignments = questionnaireState.assignments.filter(
    (item) => item.supplierId === submission.id,
  );
  const assignedCount = myAssignments.length;
  const openCount = myAssignments.filter((item) => {
    const response = questionnaireState.responses.find((r) => r.assignmentId === item.id);
    return response && response.status !== 'submitted';
  }).length;

  const groups = [
    {
      label: t('nav.group.home'),
      items: [{ to: '/portal/status', label: t('nav.status'), icon: 'status' }],
    },
    {
      label: t('nav.group.company'),
      items: [
        { to: '/portal/profil', label: t('nav.profile'), icon: 'profile' },
        ...(!isActive && profileDone
          ? [{ to: '/portal/persetujuan', label: t('nav.consent'), icon: 'consent' }]
          : []),
      ],
    },
    // Menu kuesioner hanya muncul bila memang ada yang ditugaskan,
    // supaya pemasok tanpa penugasan tidak melihat halaman kosong.
    ...(assignedCount > 0
      ? [
          {
            label: 'Kuesioner',
            items: [
              { to: '/portal/kuesioner', label: 'Kuesioner saya', icon: 'consent', count: openCount },
              {
                to: '/portal/notifikasi',
                label: 'Notifikasi',
                icon: 'status',
                count: questionnaireState.notifications.filter(
                  (item) => item.audience === 'supplier' && !item.read,
                ).length,
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <AppShell
      groups={groups}
      user={{ name: submission.general.vendorName }}
      subtitle={submission.account?.accountId ?? t(`status.${submission.status}`)}
      onSignOut={() => {
        signOut();
        navigate('/masuk', { replace: true });
      }}
    >
      <Outlet />
    </AppShell>
  );
}
