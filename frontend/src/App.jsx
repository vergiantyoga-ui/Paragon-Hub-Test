import { Navigate, Route, Routes } from 'react-router-dom';

import SupplierLogin from './pages/auth/SupplierLogin.jsx';
import StaffLogin from './pages/auth/StaffLogin.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';

import RegisterWizard from './pages/supplier/RegisterWizard.jsx';
import SupplierLayout from './components/layout/SupplierLayout.jsx';
import ChangePassword from './pages/supplier/ChangePassword.jsx';
import SupplierProfile from './pages/supplier/SupplierProfile.jsx';
import ConsentPage from './pages/supplier/ConsentPage.jsx';
import SupplierStatus from './pages/supplier/SupplierStatus.jsx';

import InternalLayout from './components/layout/InternalLayout.jsx';
import InternalHome from './pages/internal/InternalHome.jsx';
import QueueDashboard from './pages/internal/QueueDashboard.jsx';
import InternalRegistration from './pages/internal/InternalRegistration.jsx';
import PreferredQueue from './pages/internal/PreferredQueue.jsx';
import PreferredReview from './pages/internal/PreferredReview.jsx';
import DocumentVerification from './pages/internal/DocumentVerification.jsx';

import TemplateList from './questionnaire/pages/internal/TemplateList.jsx';
import TemplateDetail from './questionnaire/pages/internal/TemplateDetail.jsx';
import TemplateCreate from './questionnaire/pages/internal/TemplateCreate.jsx';
import QuestionnaireBuilder from './questionnaire/pages/internal/QuestionnaireBuilder.jsx';
import AssignmentList from './questionnaire/pages/internal/AssignmentList.jsx';
import AssignmentCreate from './questionnaire/pages/internal/AssignmentCreate.jsx';
import ReviewQueue from './questionnaire/pages/internal/ReviewQueue.jsx';
import ReviewDetail from './questionnaire/pages/internal/ReviewDetail.jsx';
import QuestionnaireDashboard from './questionnaire/pages/internal/QuestionnaireDashboard.jsx';
import NotificationList from './questionnaire/pages/internal/NotificationList.jsx';
import AuditTrail from './questionnaire/pages/internal/AuditTrail.jsx';

import QualificationList from './qualification/pages/QualificationList.jsx';
import QualificationForm from './qualification/pages/QualificationForm.jsx';
import MyQuestionnaires from './questionnaire/pages/supplier/MyQuestionnaires.jsx';
import ResponseWizard from './questionnaire/pages/supplier/ResponseWizard.jsx';

import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/masuk" replace />} />

      {/* Publik */}
      <Route path="/masuk" element={<SupplierLogin />} />
      <Route path="/daftar" element={<RegisterWizard />} />
      <Route path="/lupa-sandi" element={<ForgotPassword />} />
      <Route path="/internal/masuk" element={<StaffLogin />} />

      {/* Portal pemasok */}
      <Route path="/portal" element={<SupplierLayout />}>
        <Route index element={<Navigate to="/portal/status" replace />} />
        <Route path="ganti-sandi" element={<ChangePassword />} />
        <Route path="status" element={<SupplierStatus />} />
        <Route path="profil" element={<SupplierProfile />} />
        <Route path="persetujuan" element={<ConsentPage />} />
        <Route path="kuesioner" element={<MyQuestionnaires />} />
        <Route path="kuesioner/:responseId" element={<ResponseWizard />} />
        <Route
          path="notifikasi"
          element={<NotificationList audience="supplier" trailRoot="/portal/status" />}
        />
        {/* Tautan lama dari email undangan tetap berfungsi */}
        <Route path="profil-onboarding" element={<Navigate to="/portal/profil" replace />} />
      </Route>

      {/* Konsol internal */}
      <Route path="/internal" element={<InternalLayout />}>
        <Route index element={<Navigate to="/internal/beranda" replace />} />
        <Route path="beranda" element={<InternalHome />} />
        <Route path="antrian" element={<QueueDashboard />} />
        <Route path="registrasi/:id" element={<InternalRegistration />} />
        <Route path="preferred" element={<PreferredQueue />} />
        <Route path="preferred/:supplierId" element={<PreferredReview />} />
        <Route path="verifikasi" element={<DocumentVerification />} />
        <Route path="kualifikasi" element={<QualificationList />} />
        <Route path="kualifikasi/:supplierId" element={<QualificationForm />} />
        <Route path="questionnaire" element={<TemplateList />} />
        <Route path="questionnaire/baru" element={<TemplateCreate />} />
        <Route path="questionnaire/:templateId" element={<TemplateDetail />} />
        <Route
          path="questionnaire/:templateId/v/:versionId"
          element={<QuestionnaireBuilder />}
        />
        <Route path="penugasan" element={<AssignmentList />} />
        <Route path="penugasan/baru" element={<AssignmentCreate />} />
        <Route path="tinjauan" element={<ReviewQueue />} />
        <Route path="tinjauan/:responseId" element={<ReviewDetail />} />
        <Route path="dashboard-kuesioner" element={<QuestionnaireDashboard />} />
        <Route path="jejak-audit" element={<AuditTrail />} />
        <Route
          path="notifikasi"
          element={<NotificationList audience="internal" trailRoot="/internal/beranda" />}
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
