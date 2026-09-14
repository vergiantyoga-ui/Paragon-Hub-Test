import { Router } from 'express';
import { badRequest, notFound, wrap } from '../lib/http.js';
import { now } from '../lib/ids.js';
import { actorOf, optionalAuth, requireAuth, requireOwnSupplier, requireRole } from '../middleware/auth.js';
import * as suppliers from '../repositories/supplierRepo.js';
import * as qualifications from '../repositories/qualificationRepo.js';
import * as audit from '../repositories/auditRepo.js';
import { ROLE, STATUS } from '../lib/masterData.js';

const router = Router();

const SORTABLE = new Set(['submittedAt', 'status', 'id']);

router.get(
  '/',
  optionalAuth,
  wrap((req, res) => {
    const { status, q, sort = 'submittedAt' } = req.query;
    let list = suppliers.findAll();

    if (status) {
      const wanted = String(status).split(',');
      list = list.filter((item) => wanted.includes(item.status));
    }

    if (q) {
      const needle = String(q).toLowerCase();
      list = list.filter(
        (item) =>
          item.id.toLowerCase().includes(needle) ||
          (item.general?.vendorName ?? '').toLowerCase().includes(needle) ||
          (item.contact?.email ?? '').toLowerCase().includes(needle),
      );
    }

    if (SORTABLE.has(String(sort))) {
      list = [...list].sort((a, b) => String(b[sort] ?? '').localeCompare(String(a[sort] ?? '')));
    }

    res.json(list);
  }),
);

router.get(
  '/:id',
  optionalAuth,
  wrap((req, res) => {
    const submission = suppliers.findById(req.params.id);
    if (!submission) throw notFound('Pengajuan tidak ditemukan.');
    res.json(submission);
  }),
);

/**
 * Pendaftaran pemasok — satu-satunya endpoint tulis yang terbuka tanpa token,
 * karena pemasok memang belum punya akun saat mengirimkannya.
 */
router.post(
  '/',
  wrap((req, res) => {
    const payload = req.body ?? {};
    if (!payload.general?.vendorName) throw badRequest('Nama perusahaan wajib diisi.');
    if (!payload.contact?.email) throw badRequest('Email PIC wajib diisi.');

    const id = payload.id ?? suppliers.nextSupplierId();
    const submission = suppliers.save({
      onboardingPath: null,
      account: null,
      consent: null,
      verification: null,
      profile: payload.profile ?? { completed: {} },
      timeline: [
        { at: now(), label: 'Registrasi dikirim pemasok', actor: payload.contact.name ?? '' },
      ],
      ...payload,
      id,
      status: payload.status ?? STATUS.SUPPLIER_REQUEST,
      submittedAt: payload.submittedAt ?? now(),
    });

    audit.record({
      actor: { id: null, name: payload.contact.name ?? 'Pemasok' },
      action: 'supplier.registered',
      objectType: 'supplier',
      objectId: id,
      newValue: payload.general.vendorName,
    });

    res.status(201).json(submission);
  }),
);

/**
 * Menyimpan pengajuan utuh. Front-end mengirim objek lengkap setelah setiap
 * transisi status, dan status sebelumnya ikut dicatat ke jejak audit supaya
 * perpindahannya dapat ditelusuri tanpa membandingkan dua salinan data.
 */
router.put(
  '/:id',
  requireAuth,
  requireOwnSupplier('id'),
  wrap((req, res) => {
    const incoming = req.body ?? {};
    if (incoming.id && incoming.id !== req.params.id) {
      throw badRequest('ID pada alamat dan isi permintaan tidak sama.');
    }

    const previous = suppliers.findById(req.params.id);
    const saved = suppliers.save({ ...incoming, id: req.params.id });

    if (previous && previous.status !== saved.status) {
      audit.record({
        actor: actorOf(req),
        action: 'supplier.status_changed',
        objectType: 'supplier',
        objectId: saved.id,
        previousValue: previous.status,
        newValue: saved.status,
      });
    }

    res.json(saved);
  }),
);

router.delete(
  '/:id',
  requireAuth,
  requireRole(ROLE.ADMIN),
  wrap((req, res) => {
    if (!suppliers.remove(req.params.id)) throw notFound('Pengajuan tidak ditemukan.');
    audit.record({
      actor: actorOf(req),
      action: 'supplier.deleted',
      objectType: 'supplier',
      objectId: req.params.id,
    });
    res.status(204).end();
  }),
);

/* --------------------------- Kualifikasi --------------------------- */

router.get(
  '/:id/qualification',
  optionalAuth,
  wrap((req, res) => {
    res.json(qualifications.findBySupplier(req.params.id));
  }),
);

/**
 * Kelayakan diperiksa di server juga. Antarmuka sudah menyembunyikan tombolnya,
 * tetapi aturan yang hanya hidup di antarmuka bukan aturan.
 */
const QUALIFIABLE = new Set([
  STATUS.REGISTRATION,
  STATUS.NEEDS_DOCUMENT_FIX,
  STATUS.QUALIFICATION,
  STATUS.AWAITING_PREFERRED,
  STATUS.PREFERRED,
]);

router.put(
  '/:id/qualification',
  requireAuth,
  requireRole(ROLE.STAFF, ROLE.ADMIN),
  wrap((req, res) => {
    const submission = suppliers.findById(req.params.id);
    if (!submission) throw notFound('Pemasok tidak ditemukan.');
    if (!QUALIFIABLE.has(submission.status)) {
      throw badRequest(
        `Pemasok berstatus "${submission.status}" belum layak dikualifikasi; profilnya harus sudah dikirim.`,
      );
    }

    const { lines = [], status = 'draft' } = req.body ?? {};
    if (status === 'completed') {
      const incomplete = lines.filter((line) => !line.commodityCode || !line.countryCode);
      if (incomplete.length) {
        throw badRequest('Seluruh baris harus memuat komoditas dan negara sebelum diselesaikan.');
      }
    }

    const seen = new Set();
    for (const line of lines) {
      if (!line.commodityCode || !line.countryCode) continue;
      const key = `${line.commodityCode}|${line.countryCode}`;
      if (seen.has(key)) throw badRequest('Pasangan komoditas dan negara tidak boleh berulang.');
      seen.add(key);
    }

    const actor = actorOf(req);
    const saved = qualifications.save(req.params.id, {
      lines,
      status,
      updatedBy: actor?.name ?? '',
    });

    audit.record({
      actor,
      action: status === 'completed' ? 'qualification.completed' : 'qualification.saved',
      objectType: 'supplier',
      objectId: req.params.id,
      newValue: `${saved.lines.length} baris`,
    });

    res.json(saved);
  }),
);

export default router;
