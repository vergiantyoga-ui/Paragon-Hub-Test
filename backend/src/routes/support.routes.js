import { Router } from 'express';
import { notFound, wrap } from '../lib/http.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/connection.js';
import * as users from '../repositories/userRepo.js';
import * as suppliers from '../repositories/supplierRepo.js';
import * as qualifications from '../repositories/qualificationRepo.js';
import * as questionnaires from '../repositories/questionnaireRepo.js';
import * as responses from '../repositories/responseRepo.js';
import * as notifications from '../repositories/notificationRepo.js';
import * as audit from '../repositories/auditRepo.js';

const router = Router();

/* ---------------------------- Master data --------------------------- */

router.get(
  '/master-data',
  wrap((_req, res) => {
    const out = {};
    for (const domain of users.listDomains()) out[domain] = users.listMaster(domain);
    res.json(out);
  }),
);

router.get(
  '/master-data/:domain',
  wrap((req, res) => {
    const list = users.listMaster(req.params.domain, { parentCode: req.query.parent });
    if (!list.length && !users.listDomains().includes(req.params.domain)) {
      throw notFound(`Domain master data "${req.params.domain}" tidak dikenal.`);
    }
    res.json(list);
  }),
);

/* --------------------------- Notifikasi ----------------------------- */

router.get(
  '/notifications',
  optionalAuth,
  wrap((req, res) => {
    res.json(
      notifications.list({
        audience: req.query.audience,
        unreadOnly: req.query.unread === 'true',
      }),
    );
  }),
);

router.post(
  '/notifications',
  requireAuth,
  wrap((req, res) => {
    res.status(201).json(notifications.save(req.body ?? {}));
  }),
);

router.post(
  '/notifications/:id/read',
  requireAuth,
  wrap((req, res) => {
    if (!notifications.markRead(req.params.id)) throw notFound('Notifikasi tidak ditemukan.');
    res.json({ ok: true });
  }),
);

router.post(
  '/notifications/read-all',
  requireAuth,
  wrap((req, res) => {
    res.json({ updated: notifications.markAllRead(req.body?.audience) });
  }),
);

/* ----------------------------- Audit -------------------------------- */

router.get(
  '/audit-logs',
  optionalAuth,
  wrap((req, res) => {
    res.json(
      audit.list({
        objectType: req.query.objectType,
        objectId: req.query.objectId,
        action: req.query.action,
        limit: req.query.limit,
      }),
    );
  }),
);

router.post(
  '/audit-logs',
  requireAuth,
  wrap((req, res) => {
    const body = req.body ?? {};
    res.status(201).json(
      audit.record({
        id: body.id,
        at: body.at,
        actor: { id: body.actorId ?? req.auth.sub, name: body.actorName ?? req.auth.name },
        action: body.action,
        objectType: body.objectType,
        objectId: body.objectId,
        previousValue: body.previousValue,
        newValue: body.newValue,
      }),
    );
  }),
);

/* --------------------------- Dashboard ------------------------------ */

/**
 * KPI dihitung dengan SQL, bukan dengan menarik seluruh respons ke aplikasi
 * lalu menjumlahkannya. Selisihnya belum terasa pada data contoh, tetapi
 * inilah bentuk yang tetap berlaku saat respons sudah ribuan.
 */
router.get(
  '/questionnaire-dashboard/kpi',
  optionalAuth,
  wrap((_req, res) => {
    const db = getDb();
    const today = new Date().toISOString();

    const byStatus = db
      .prepare('SELECT status, COUNT(*) AS total FROM questionnaire_response GROUP BY status')
      .all()
      .reduce((acc, row) => ({ ...acc, [row.status]: row.total }), {});

    const byRisk = db
      .prepare(
        `SELECT COALESCE(risk_level, 'unknown') AS risk, COUNT(*) AS total
         FROM questionnaire_response GROUP BY risk`,
      )
      .all()
      .reduce((acc, row) => ({ ...acc, [row.risk]: row.total }), {});

    const byType = db
      .prepare(
        `SELECT COALESCE(t.type, 'Lainnya') AS type, COUNT(*) AS total
         FROM questionnaire_assignment a
         JOIN questionnaire_template t ON t.id = a.template_id
         GROUP BY type`,
      )
      .all();

    const totals = db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM questionnaire_template) AS templates,
           (SELECT COUNT(*) FROM questionnaire_version WHERE status = 'published') AS publishedVersions,
           (SELECT COUNT(*) FROM questionnaire_assignment) AS assignments,
           (SELECT COUNT(*) FROM questionnaire_response) AS responses,
           (SELECT COUNT(*) FROM questionnaire_response WHERE submitted_at IS NOT NULL) AS submitted,
           (SELECT AVG(score) FROM questionnaire_response WHERE score IS NOT NULL) AS averageScore,
           (SELECT AVG(completion_percent) FROM questionnaire_response
             WHERE completion_percent IS NOT NULL) AS averageCompletion`,
      )
      .get();

    const overdue = db
      .prepare(
        `SELECT COUNT(*) AS total
         FROM questionnaire_assignment a
         JOIN questionnaire_response r ON r.assignment_id = a.id
         WHERE a.due_date < ? AND r.submitted_at IS NULL`,
      )
      .get(today).total;

    res.json({
      ...totals,
      overdue,
      responseRate: totals.assignments ? totals.submitted / totals.assignments : 0,
      byStatus,
      byRisk,
      byType,
      generatedAt: today,
    });
  }),
);

/* ---------------------------- Bootstrap ----------------------------- */

/**
 * Satu panggilan untuk memuat seluruh keadaan awal aplikasi. Front-end
 * memuatnya sekali saat dibuka; memecahnya jadi delapan permintaan hanya
 * menambah waktu tunggu tanpa menambah apa pun.
 */
router.get(
  '/bootstrap',
  optionalAuth,
  wrap((_req, res) => {
    res.json({
      internalUsers: users.listUsers(),
      submissions: suppliers.findAll(),
      qualifications: qualifications.findAll(),
      questionnaire: {
        templates: questionnaires.listTemplates(),
        versions: questionnaires.listVersions(),
        questionLibrary: questionnaires.listQuestionLibrary(),
        sectionLibrary: questionnaires.listSectionLibrary(),
        assignments: responses.listAssignments(),
        responses: responses.listResponses(),
        notifications: notifications.list(),
        auditLog: audit.list({ limit: 500 }),
      },
      serverTime: new Date().toISOString(),
    });
  }),
);

export default router;
