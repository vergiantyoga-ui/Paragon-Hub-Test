import { Router } from 'express';
import { config } from '../config.js';
import { badRequest, unauthorized, wrap } from '../lib/http.js';
import { verifyPassword, hashPassword } from '../lib/password.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import * as users from '../repositories/userRepo.js';
import * as suppliers from '../repositories/supplierRepo.js';
import { getDb } from '../db/connection.js';
import * as audit from '../repositories/auditRepo.js';

const router = Router();

/**
 * Mode demo (`DEMO_AUTH=true`) menerima kata sandi apa pun asal identitasnya
 * cocok, persis seperti front-end tanpa backend. Dengan mode itu dimatikan,
 * kata sandi diperiksa terhadap hash scrypt di basis data.
 */
function passwordOk(plain, storedHash) {
  if (config.demoAuth) return true;
  return verifyPassword(plain ?? '', storedHash);
}

router.post(
  '/internal/login',
  wrap((req, res) => {
    const { email, password } = req.body ?? {};
    if (!email) throw badRequest('Email wajib diisi.');

    const normalized = String(email).trim().toLowerCase();
    if (!normalized.endsWith('@paragon-corp.com')) {
      throw badRequest('Gunakan email kerja Paragon yang berakhiran @paragon-corp.com.');
    }

    const user = users.findUserByEmail(normalized);
    if (!user) throw unauthorized('Akun tidak ditemukan pada direktori Paragon.');
    if (!passwordOk(password, user.password_hash)) throw unauthorized('Kata sandi tidak cocok.');

    const profile = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = signToken({
      sub: user.id,
      kind: 'internal',
      name: user.name,
      email: user.email,
      role: user.role,
    });

    audit.record({ actor: profile, action: 'auth.login', objectType: 'user', objectId: user.id });
    res.json({ token, user: profile, kind: 'internal' });
  }),
);

router.post(
  '/supplier/login',
  wrap((req, res) => {
    const { accountId, password } = req.body ?? {};
    if (!accountId) throw badRequest('ID akun wajib diisi.');

    const submission = suppliers.findByAccountId(String(accountId).trim());
    if (!submission) {
      throw unauthorized('ID akun belum terdaftar atau undangan belum dikirim.');
    }

    const row = getDb()
      .prepare('SELECT password_hash, temporary_password, password_changed FROM supplier_account WHERE supplier_id = ?')
      .get(submission.id);

    // Sebelum kata sandi sementara diganti, yang berlaku adalah sandi itu.
    const stored = row?.password_changed ? row.password_hash : null;
    if (!config.demoAuth) {
      const okTemporary =
        !row?.password_changed && password && password === row?.temporary_password;
      if (!okTemporary && !verifyPassword(password ?? '', stored)) {
        throw unauthorized('Kata sandi tidak cocok.');
      }
    }

    const token = signToken({
      sub: submission.account.accountId,
      kind: 'supplier',
      name: submission.contact?.name ?? submission.general?.vendorName ?? '',
      email: submission.contact?.email ?? '',
      role: 'supplier',
      supplierId: submission.id,
    });

    audit.record({
      actor: { id: submission.account.accountId, name: submission.contact?.name },
      action: 'auth.login',
      objectType: 'supplier',
      objectId: submission.id,
    });

    res.json({
      token,
      kind: 'supplier',
      user: {
        accountId: submission.account.accountId,
        name: submission.contact?.name ?? '',
        email: submission.contact?.email ?? '',
      },
      submission,
    });
  }),
);

/** Mengganti kata sandi sementara. Sandi baru selalu disimpan sebagai hash. */
router.post(
  '/supplier/change-password',
  requireAuth,
  wrap((req, res) => {
    const { newPassword } = req.body ?? {};
    if (req.auth.kind !== 'supplier') throw unauthorized('Hanya untuk akun pemasok.');
    if (!newPassword || String(newPassword).length < 8) {
      throw badRequest('Kata sandi baru minimal 8 karakter.');
    }

    getDb()
      .prepare(
        `UPDATE supplier_account
         SET password_hash = ?, password_changed = 1, temporary_password = NULL
         WHERE supplier_id = ?`,
      )
      .run(hashPassword(String(newPassword)), req.auth.supplierId);

    audit.record({
      actor: { id: req.auth.sub, name: req.auth.name },
      action: 'auth.password_changed',
      objectType: 'supplier',
      objectId: req.auth.supplierId,
    });

    res.json({ ok: true });
  }),
);

router.get(
  '/me',
  requireAuth,
  wrap((req, res) => {
    res.json({
      kind: req.auth.kind,
      id: req.auth.sub,
      name: req.auth.name,
      email: req.auth.email,
      role: req.auth.role,
      ...(req.auth.supplierId ? { supplierId: req.auth.supplierId } : {}),
    });
  }),
);

/** Direktori akun internal — dipakai layar masuk untuk menampilkan akun demo. */
router.get(
  '/internal/users',
  wrap((_req, res) => {
    res.json(users.listUsers());
  }),
);

export default router;
