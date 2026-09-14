import { Router } from 'express';
import { badRequest, conflict, notFound, wrap } from '../lib/http.js';
import { makeId, now } from '../lib/ids.js';
import { actorOf, optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import * as repo from '../repositories/questionnaireRepo.js';
import * as audit from '../repositories/auditRepo.js';
import { ROLE } from '../lib/masterData.js';

const router = Router();

const staff = [requireAuth, requireRole(ROLE.STAFF, ROLE.ADMIN, ROLE.MANAGER)];

/* ----------------------------- Template ----------------------------- */

router.get(
  '/questionnaire-templates',
  optionalAuth,
  wrap((req, res) => {
    const { type, q, owner } = req.query;
    let list = repo.listTemplates();

    if (type) list = list.filter((item) => item.type === type);
    if (owner) list = list.filter((item) => item.ownerId === owner);
    if (q) {
      const needle = String(q).toLowerCase();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(needle) || item.code.toLowerCase().includes(needle),
      );
    }

    res.json(list);
  }),
);

router.get(
  '/questionnaire-templates/:id',
  optionalAuth,
  wrap((req, res) => {
    const template = repo.findTemplate(req.params.id);
    if (!template) throw notFound('Template tidak ditemukan.');
    res.json({ ...template, versions: repo.listVersions({ templateId: template.id }) });
  }),
);

router.post(
  '/questionnaire-templates',
  ...staff,
  wrap((req, res) => {
    const body = req.body ?? {};
    if (!body.name) throw badRequest('Nama template wajib diisi.');

    const actor = actorOf(req);
    const template = repo.saveTemplate({
      id: body.id ?? makeId('tpl'),
      ownerId: actor?.id ?? '',
      ownerName: actor?.name ?? '',
      createdAt: now(),
      updatedAt: now(),
      ...body,
    });

    // Setiap template selalu punya satu versi draf sejak awal; template tanpa
    // versi tidak bisa dibuka di builder maupun ditugaskan.
    const version = repo.saveVersion({
      id: body.versionId ?? makeId('ver'),
      templateId: template.id,
      versionLabel: 'v1.0',
      status: 'draft',
      effectiveDate: null,
      expiryDate: null,
      estimatedMinutes: body.estimatedMinutes ?? null,
      scoringEnabled: Boolean(body.scoringEnabled),
      passingScore: body.passingScore ?? null,
      riskBands: body.riskBands ?? [],
      sections: [],
    });

    audit.record({
      actor,
      action: 'questionnaire.created',
      objectType: 'template',
      objectId: template.id,
      newValue: template.name,
    });

    res.status(201).json({ template, version });
  }),
);

/**
 * Upsert satu template. Front-end menyinkronkan entitas yang berubah tanpa
 * membedakan apakah itu template baru atau lama, jadi endpoint-nya harus
 * menerima keduanya — dan tidak boleh ikut membuat versi, karena versinya
 * disinkronkan terpisah.
 */
router.put(
  '/questionnaire-templates/:id',
  ...staff,
  wrap((req, res) => {
    const current = repo.findTemplate(req.params.id);
    const saved = repo.saveTemplate({
      createdAt: now(),
      ...current,
      ...req.body,
      id: req.params.id,
      updatedAt: now(),
    });
    res.status(current ? 200 : 201).json(saved);
  }),
);

router.patch(
  '/questionnaire-templates/:id',
  ...staff,
  wrap((req, res) => {
    const current = repo.findTemplate(req.params.id);
    if (!current) throw notFound('Template tidak ditemukan.');

    const saved = repo.saveTemplate({ ...current, ...req.body, id: current.id, updatedAt: now() });
    audit.record({
      actor: actorOf(req),
      action: 'questionnaire.edited',
      objectType: 'template',
      objectId: saved.id,
      newValue: JSON.stringify(req.body ?? {}),
    });
    res.json(saved);
  }),
);

/* ------------------------------ Versi ------------------------------- */

router.get(
  '/questionnaire-versions',
  optionalAuth,
  wrap((req, res) => {
    res.json(repo.listVersions({ templateId: req.query.templateId }));
  }),
);

router.get(
  '/questionnaire-versions/:id',
  optionalAuth,
  wrap((req, res) => {
    const version = repo.findVersion(req.params.id);
    if (!version) throw notFound('Versi tidak ditemukan.');
    res.json(version);
  }),
);

router.post(
  '/questionnaire-versions',
  ...staff,
  wrap((req, res) => {
    const body = req.body ?? {};
    if (!body.templateId) throw badRequest('templateId wajib diisi.');
    const version = repo.saveVersion({
      id: body.id ?? makeId('ver'),
      status: 'draft',
      riskBands: [],
      sections: [],
      ...body,
    });
    audit.record({
      actor: actorOf(req),
      action: 'questionnaire.version_created',
      objectType: 'version',
      objectId: version.id,
      newValue: version.versionLabel,
    });
    res.status(201).json(version);
  }),
);

/**
 * Menyimpan isi sebuah versi. Versi yang sudah terbit ditolak di sini —
 * aturan imutabilitas ditegakkan server, bukan hanya lewat tombol yang
 * dinonaktifkan di builder.
 */
router.put(
  '/questionnaire-versions/:id',
  ...staff,
  wrap((req, res) => {
    const current = repo.findVersion(req.params.id);

    // Versi yang belum ada dibuat di tempat — builder menyinkronkan hasil
    // "buat versi baru" lewat jalur yang sama dengan penyuntingan biasa.
    if (!current) {
      if (!req.body?.templateId) throw badRequest('templateId wajib diisi untuk versi baru.');
      const created = repo.saveVersion({
        status: 'draft',
        riskBands: [],
        sections: [],
        ...req.body,
        id: req.params.id,
      });
      return res.status(201).json(created);
    }

    const incoming = { ...current, ...req.body, id: current.id, templateId: current.templateId };
    const statusChange = incoming.status !== current.status;

    if (current.status !== 'draft' && !statusChange) {
      throw conflict(
        `Versi berstatus "${current.status}" tidak dapat disunting. Buat versi baru untuk mengubah isinya.`,
      );
    }

    const saved = repo.saveVersion(incoming);
    return res.json(saved);
  }),
);

const transition = (action, apply) =>
  wrap((req, res) => {
    const current = repo.findVersion(req.params.id);
    if (!current) throw notFound('Versi tidak ditemukan.');

    const actor = actorOf(req);
    const next = apply(current, actor);
    const saved = repo.saveVersion(next);

    audit.record({
      actor,
      action,
      objectType: 'version',
      objectId: saved.id,
      previousValue: current.status,
      newValue: saved.status,
    });

    res.json(saved);
  });

router.post(
  '/questionnaire-versions/:id/publish',
  ...staff,
  transition('questionnaire.published', (version, actor) => {
    if (version.status !== 'draft') {
      throw conflict('Hanya versi draf yang dapat diterbitkan.');
    }
    if (!version.sections.length) {
      throw badRequest('Versi tanpa seksi tidak dapat diterbitkan.');
    }
    if (version.sections.every((section) => !section.questions.length)) {
      throw badRequest('Versi tanpa pertanyaan tidak dapat diterbitkan.');
    }
    return {
      ...version,
      status: 'published',
      publishedAt: now(),
      publishedBy: actor?.name ?? '',
    };
  }),
);

router.post(
  '/questionnaire-versions/:id/unpublish',
  ...staff,
  transition('questionnaire.unpublished', (version) => {
    if (version.status !== 'published') throw conflict('Hanya versi terbit yang dapat ditarik.');
    return { ...version, status: 'unpublished' };
  }),
);

router.post(
  '/questionnaire-versions/:id/archive',
  ...staff,
  transition('questionnaire.archived', (version) => ({ ...version, status: 'archived' })),
);

/* ----------------------------- Pustaka ------------------------------ */

router.get(
  '/question-library',
  optionalAuth,
  wrap((req, res) => {
    const { category, q } = req.query;
    let list = repo.listQuestionLibrary();
    if (category) list = list.filter((item) => item.category === category);
    if (q) {
      const needle = String(q).toLowerCase();
      list = list.filter((item) => JSON.stringify(item).toLowerCase().includes(needle));
    }
    res.json(list);
  }),
);

router.post(
  '/question-library',
  ...staff,
  wrap((req, res) => {
    res.status(201).json(repo.saveQuestionLibraryItem(req.body ?? {}));
  }),
);

router.get(
  '/section-library',
  optionalAuth,
  wrap((_req, res) => {
    res.json(repo.listSectionLibrary());
  }),
);

router.post(
  '/section-library',
  ...staff,
  wrap((req, res) => {
    res.status(201).json(repo.saveSectionLibraryItem(req.body ?? {}));
  }),
);

export default router;
