import { Router } from 'express';
import { badRequest, forbidden, notFound, wrap } from '../lib/http.js';
import { makeId, now } from '../lib/ids.js';
import { actorOf, optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import * as repo from '../repositories/responseRepo.js';
import * as questionnaires from '../repositories/questionnaireRepo.js';
import * as notifications from '../repositories/notificationRepo.js';
import * as audit from '../repositories/auditRepo.js';
import { ROLE } from '../lib/masterData.js';

const router = Router();
const staff = [requireAuth, requireRole(ROLE.STAFF, ROLE.ADMIN, ROLE.MANAGER)];

/* ---------------------------- Penugasan ----------------------------- */

router.get(
  '/assignments',
  optionalAuth,
  wrap((req, res) => {
    res.json(
      repo.listAssignments({
        supplierId: req.query.supplier,
        reviewerId: req.query.reviewer,
      }),
    );
  }),
);

router.get(
  '/assignments/:id',
  optionalAuth,
  wrap((req, res) => {
    const assignment = repo.findAssignment(req.params.id);
    if (!assignment) throw notFound('Penugasan tidak ditemukan.');
    res.json(assignment);
  }),
);

/**
 * Membuat penugasan sekaligus respons kosongnya. Keduanya dibuat bersama
 * supaya portal pemasok tidak pernah menemui penugasan tanpa tempat mengisi.
 */
router.post(
  '/assignments',
  ...staff,
  wrap((req, res) => {
    const body = req.body ?? {};
    if (!body.versionId) throw badRequest('versionId wajib diisi.');
    if (!body.supplierId) throw badRequest('supplierId wajib diisi.');

    const version = questionnaires.findVersion(body.versionId);
    if (!version) throw notFound('Versi kuesioner tidak ditemukan.');
    if (version.status !== 'published') {
      throw badRequest('Hanya versi terbit yang dapat ditugaskan kepada pemasok.');
    }

    const actor = actorOf(req);
    const assignment = repo.saveAssignment({
      id: body.id ?? makeId('asg'),
      templateId: version.templateId,
      ...body,
      assignedBy: actor?.name ?? '',
      assignedAt: now(),
    });

    const response = repo.saveResponse({
      id: body.responseId ?? makeId('res'),
      assignmentId: assignment.id,
      status: 'not_started',
      startedAt: null,
      submittedAt: null,
      answers: {},
      attachments: {},
      revision: 1,
      reviews: [],
      history: [],
    });

    audit.record({
      actor,
      action: 'questionnaire.assigned',
      objectType: 'assignment',
      objectId: assignment.id,
      newValue: assignment.supplierName,
    });

    notifications.save({
      event: 'assignment.created',
      audience: 'supplier',
      title: 'Kuesioner baru ditugaskan',
      body: `${assignment.supplierName} menerima penugasan dengan tenggat ${assignment.dueDate ?? '-'}.`,
      link: '/portal/kuesioner',
      read: false,
    });

    res.status(201).json({ assignment, response });
  }),
);

/* ----------------------------- Respons ------------------------------ */

router.get(
  '/responses',
  optionalAuth,
  wrap((req, res) => {
    res.json(repo.listResponses({ status: req.query.status, supplierId: req.query.supplier }));
  }),
);

router.get(
  '/responses/:id',
  optionalAuth,
  wrap((req, res) => {
    const response = repo.findResponse(req.params.id);
    if (!response) throw notFound('Respons tidak ditemukan.');
    res.json(response);
  }),
);

/** Pemasok hanya boleh menyentuh respons yang ditugaskan kepadanya. */
function assertResponseAccess(req, response) {
  if (req.auth.kind === 'internal') return;
  const assignment = repo.findAssignment(response.assignmentId);
  if (assignment?.supplierId !== req.auth.supplierId) {
    throw forbidden('Respons ini bukan milik perusahaan Anda.');
  }
}

router.put(
  '/responses/:id',
  requireAuth,
  wrap((req, res) => {
    const current = repo.findResponse(req.params.id);
    if (current) assertResponseAccess(req, current);
    if (!current && !req.body?.assignmentId) {
      throw badRequest('assignmentId wajib diisi untuk respons baru.');
    }

    const saved = repo.saveResponse({
      status: 'not_started',
      answers: {},
      attachments: {},
      revision: 1,
      reviews: [],
      history: [],
      ...current,
      ...req.body,
      id: req.params.id,
    });

    res.status(current ? 200 : 201).json(saved);
  }),
);

/** Upsert penugasan — pasangan dari PUT /responses/:id untuk sinkronisasi. */
router.put(
  '/assignments/:id',
  ...staff,
  wrap((req, res) => {
    const current = repo.findAssignment(req.params.id);
    if (!current && !req.body?.versionId) {
      throw badRequest('versionId wajib diisi untuk penugasan baru.');
    }
    const saved = repo.saveAssignment({ ...current, ...req.body, id: req.params.id });
    res.status(current ? 200 : 201).json(saved);
  }),
);

/** Simpan draf — jawaban sebagian, tanpa mengubah status selain ke in_progress. */
router.patch(
  '/responses/:id/answers',
  requireAuth,
  wrap((req, res) => {
    const current = repo.findResponse(req.params.id);
    if (!current) throw notFound('Respons tidak ditemukan.');
    assertResponseAccess(req, current);

    const { answers = {}, attachments = {}, replace = false } = req.body ?? {};
    const saved = repo.saveResponse({
      ...current,
      answers: replace ? answers : { ...current.answers, ...answers },
      attachments: replace ? attachments : { ...current.attachments, ...attachments },
      status: current.status === 'not_started' ? 'in_progress' : current.status,
      startedAt: current.startedAt ?? now(),
    });

    res.json(saved);
  }),
);

router.post(
  '/responses/:id/submit',
  requireAuth,
  wrap((req, res) => {
    const current = repo.findResponse(req.params.id);
    if (!current) throw notFound('Respons tidak ditemukan.');
    assertResponseAccess(req, current);

    const isResubmission = (current.reviews ?? []).length > 0;
    const revision = isResubmission ? (current.revision ?? 1) + 1 : (current.revision ?? 1);
    const actorName = req.body?.actorName ?? req.auth.name ?? '';

    // Setiap putaran disimpan sebagai rekaman utuh sebelum status berpindah.
    repo.recordRevision(current.id, revision, {
      answers: current.answers,
      attachments: current.attachments,
      submittedAt: now(),
    });

    const saved = repo.saveResponse({
      ...current,
      status: 'submitted',
      submittedAt: now(),
      revision,
      completionPercent: req.body?.completionPercent ?? current.completionPercent,
      score: req.body?.score ?? current.score,
      riskLevel: req.body?.riskLevel ?? current.riskLevel,
      history: [
        ...(current.history ?? []),
        {
          at: now(),
          label: isResubmission ? 'Revisi dikirim ulang' : 'Kuesioner dikirim',
          actor: actorName,
        },
      ],
    });

    audit.record({
      actor: actorOf(req),
      action: 'response.submitted',
      objectType: 'response',
      objectId: saved.id,
      previousValue: current.status,
      newValue: saved.status,
    });

    notifications.save({
      event: 'response.submitted',
      audience: 'internal',
      title: isResubmission ? 'Revisi kuesioner diterima' : 'Kuesioner dikirim pemasok',
      body: `${actorName} mengirimkan kuesioner untuk ditinjau.`,
      link: '/internal/tinjauan',
      read: false,
    });

    res.json(saved);
  }),
);

const DECISION_STATUS = {
  approve: 'approved',
  reject: 'rejected',
  request_revision: 'revision_required',
};

router.post(
  '/responses/:id/reviews',
  ...staff,
  wrap((req, res) => {
    const current = repo.findResponse(req.params.id);
    if (!current) throw notFound('Respons tidak ditemukan.');

    const { decision, flagged = [], comments = [], note = '' } = req.body ?? {};
    const status = DECISION_STATUS[decision];
    if (!status) throw badRequest('Keputusan harus approve, reject, atau request_revision.');
    if (decision === 'request_revision' && flagged.length === 0) {
      throw badRequest('Sebutkan pertanyaan mana yang perlu diperbaiki.');
    }

    const actor = actorOf(req);
    const review = {
      id: makeId('rev'),
      revision: current.revision ?? 1,
      decision,
      note,
      reviewerId: actor?.id ?? null,
      reviewerName: actor?.name ?? '',
      decidedAt: now(),
      flagged: flagged.map((item) => ({
        ...item,
        attachmentSnapshot: current.attachments[item.questionId] ?? [],
      })),
      comments,
      answerSnapshot: { ...current.answers },
    };

    const label =
      decision === 'approve'
        ? 'Kuesioner disetujui'
        : decision === 'reject'
          ? 'Kuesioner ditolak'
          : `Revisi diminta untuk ${flagged.length} pertanyaan`;

    const saved = repo.saveResponse({
      ...current,
      status,
      reviews: [...(current.reviews ?? []), review],
      history: [...(current.history ?? []), { at: now(), label, actor: actor?.name ?? '' }],
    });

    audit.record({
      actor,
      action: `review.${decision}`,
      objectType: 'response',
      objectId: saved.id,
      previousValue: current.status,
      newValue: status,
    });

    notifications.save({
      event: `review.${decision}`,
      audience: 'supplier',
      title: label,
      body:
        decision === 'request_revision'
          ? 'Sebagian jawaban perlu diperbaiki. Buka kuesioner untuk melihat catatannya.'
          : note || 'Buka kuesioner untuk melihat rinciannya.',
      link: '/portal/kuesioner',
      read: false,
    });

    res.status(201).json(saved);
  }),
);

router.get(
  '/responses/:id/revisions',
  optionalAuth,
  wrap((req, res) => {
    res.json(repo.listRevisions(req.params.id));
  }),
);

export default router;
