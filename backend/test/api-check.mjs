import assert from 'node:assert/strict';

process.env.DB_FILE = ':memory:';
process.env.SEED_ON_START = 'false';
process.env.JWT_SECRET = 'test-secret';

const { migrate, getDb, closeDb } = await import('../src/db/connection.js');
const { seed } = await import('../src/db/seed.js');
const { createApp } = await import('../src/app.js');

migrate(getDb());
seed({ force: true });

const server = createApp().listen(0);
const { port } = server.address();
const base = `http://127.0.0.1:${port}/api`;

/* ------------------------------------------------------------------ */

let passed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.log(`  ✗ ${name}\n      ${error.message}`);
  }
}

function group(title) {
  console.log(`\n── ${title} ──`);
}

async function call(method, path, { token, body } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

/* ------------------------------------------------------------------ */

group('Kesetiaan pemetaan objek ↔ tabel');

const { SUBMISSIONS } = await import('../../frontend/src/lib/mockData.js');
const { QUESTIONNAIRE_VERSIONS } = await import(
  '../../frontend/src/questionnaire/store/questionnaireMockData.js'
);
const { RESPONSES } = await import(
  '../../frontend/src/questionnaire/store/assignmentMockData.js'
);
const suppliers = await import('../src/repositories/supplierRepo.js');
const questionnaires = await import('../src/repositories/questionnaireRepo.js');
const responses = await import('../src/repositories/responseRepo.js');

const plain = (value) => JSON.parse(JSON.stringify(value ?? null));

/**
 * Pemetaan ke tabel ternormalisasi tidak boleh mengubah bentuk data. Ketiga
 * pemeriksaan ini menyimpan data contoh lalu membacanya kembali dan menuntut
 * hasilnya identik — kesalahan pemetaan paling sering muncul sebagai kolom
 * yang diam-diam berubah jadi string kosong atau hilang.
 */
await test('seluruh pengajuan pemasok terbaca kembali persis sama', () => {
  for (const source of SUBMISSIONS) {
    const stored = suppliers.findById(source.id);
    for (const key of [
      'status',
      'general',
      'address',
      'contact',
      'profile',
      'account',
      'consent',
      'verification',
      'preferredDecision',
      'timeline',
    ]) {
      assert.deepEqual(plain(stored[key]), plain(source[key]), `${source.id}.${key}`);
    }
  }
});

await test('versi kuesioner terbaca kembali sebagai pohon yang sama', () => {
  for (const source of QUESTIONNAIRE_VERSIONS) {
    assert.deepEqual(plain(questionnaires.findVersion(source.id)), plain(source), source.id);
  }
});

await test('respons beserta jawaban dan lampirannya terbaca kembali sama', () => {
  for (const source of RESPONSES) {
    const stored = responses.findResponse(source.id);
    for (const key of ['status', 'answers', 'attachments', 'revision', 'reviews', 'history']) {
      assert.deepEqual(plain(stored[key]), plain(source[key]), `${source.id}.${key}`);
    }
  }
});

/* ------------------------------------------------------------------ */

group('Kesehatan & master data');

await test('GET /health menjawab dengan versi skema', async () => {
  const { status, body } = await call('GET', '/health');
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.ok(body.schemaVersion);
});

await test('master data terisi untuk seluruh domain', async () => {
  const { body } = await call('GET', '/master-data');
  for (const domain of ['bank', 'entity_type', 'unspsc_commodity', 'country', 'terms_of_payment']) {
    assert.ok(body[domain]?.length > 0, `domain ${domain} kosong`);
  }
});

await test('rincian jenis pasokan tersaring menurut induknya', async () => {
  const { body } = await call('GET', '/master-data/vendor_type_detail?parent=0002');
  assert.equal(body.length, 2);
  assert.deepEqual(
    body.map((item) => item.name).sort(),
    ['Packaging Primer', 'Packaging Sekunder'],
  );
});

await test('kode BIC bank ikut terbawa sebagai atribut tambahan', async () => {
  const { body } = await call('GET', '/master-data/bank');
  const mandiri = body.find((item) => item.code === 'BMRI');
  assert.equal(mandiri.bic, 'BMRIIDJA');
});

/* ------------------------------------------------------------------ */

group('Autentikasi & otorisasi');

let staffToken;
let managerToken;

await test('staf dapat masuk dan menerima token', async () => {
  const { status, body } = await call('POST', '/auth/internal/login', {
    body: { email: 'dewi.anggraini@paragon-corp.com', password: 'apa-saja' },
  });
  assert.equal(status, 200);
  assert.equal(body.user.role, 'procurement_staff');
  assert.ok(body.token);
  staffToken = body.token;
});

await test('manager dapat masuk', async () => {
  const { body } = await call('POST', '/auth/internal/login', {
    body: { email: 'lestari.handayani@paragon-corp.com', password: 'apa-saja' },
  });
  managerToken = body.token;
  assert.equal(body.user.role, 'procurement_manager');
});

await test('email di luar domain Paragon ditolak', async () => {
  const { status } = await call('POST', '/auth/internal/login', {
    body: { email: 'orang@gmail.com', password: 'x' },
  });
  assert.equal(status, 400);
});

await test('email tak dikenal ditolak 401', async () => {
  const { status } = await call('POST', '/auth/internal/login', {
    body: { email: 'hantu@paragon-corp.com', password: 'x' },
  });
  assert.equal(status, 401);
});

await test('menulis tanpa token ditolak 401', async () => {
  const { status } = await call('PUT', '/suppliers/SUP-2026-0148', { body: {} });
  assert.equal(status, 401);
});

await test('token palsu ditolak 401', async () => {
  const { status } = await call('PUT', '/suppliers/SUP-2026-0148', {
    token: 'bukan.token.sah',
    body: {},
  });
  assert.equal(status, 401);
});

let supplierToken;
let supplierId;

await test('pemasok dapat masuk dengan ID akun', async () => {
  const { status, body } = await call('POST', '/auth/supplier/login', {
    body: { accountId: 'SUP-RAW-0118', password: 'apa-saja' },
  });
  assert.equal(status, 200);
  supplierToken = body.token;
  supplierId = body.submission.id;
  assert.equal(body.kind, 'supplier');
});

await test('pemasok tidak dapat menyunting pemasok lain', async () => {
  const other = supplierId === 'SUP-2026-0118' ? 'SUP-2026-0131' : 'SUP-2026-0118';
  const { status } = await call('PUT', `/suppliers/${other}`, {
    token: supplierToken,
    body: { status: 'preferred' },
  });
  assert.equal(status, 403);
});

/* ------------------------------------------------------------------ */

group('Pemasok');

await test('daftar pemasok memuat seluruh data contoh', async () => {
  const { body } = await call('GET', '/suppliers');
  assert.equal(body.length, 7);
});

await test('saringan status bekerja', async () => {
  const { body } = await call('GET', '/suppliers?status=supplier_request');
  assert.ok(body.length >= 1);
  assert.ok(body.every((item) => item.status === 'supplier_request'));
});

await test('pencarian nama perusahaan bekerja', async () => {
  const { body } = await call('GET', '/suppliers?q=karton');
  assert.ok(body.length >= 1);
  assert.match(body[0].general.vendorName.toLowerCase(), /karton/);
});

let newSupplierId;

await test('pendaftaran baru diterima tanpa token', async () => {
  const { status, body } = await call('POST', '/suppliers', {
    body: {
      general: {
        legalStatus: 'Z2',
        entityType: '0001',
        vendorName: 'PT Uji Coba Nusantara',
        vendorType: '0001',
        vendorTypeDetail: '0003',
        targetCompanies: ['Paragon Corp Indonesia'],
        otvStatus: 'C1',
        vendorDirectType: 'Z002',
        companyEmail: 'halo@ujicoba.co.id',
      },
      address: { street: 'Jl. Uji 1', country: 'Indonesia', city: 'Bandung' },
      contact: { name: 'Budi Santoso', email: 'budi@ujicoba.co.id', phone: '0811' },
    },
  });
  assert.equal(status, 201);
  newSupplierId = body.id;
  assert.equal(body.status, 'supplier_request');
  assert.equal(body.timeline.length, 1);
});

await test('pendaftaran tanpa nama perusahaan ditolak', async () => {
  const { status } = await call('POST', '/suppliers', { body: { contact: { email: 'a@b.c' } } });
  assert.equal(status, 400);
});

await test('memilih Paragon Corp Indonesia menyimpan enam kode korporat', async () => {
  const codes = getDb()
    .prepare('SELECT code FROM supplier_corporate_code WHERE supplier_id = ? ORDER BY code')
    .all(newSupplierId)
    .map((row) => row.code);
  assert.deepEqual(codes, ['ID01', 'ID02', 'ID03', 'ID04', 'ID05', 'ID06']);
});

await test('perubahan status tercatat pada jejak audit', async () => {
  const before = await call('GET', `/suppliers/${newSupplierId}`);
  await call('PUT', `/suppliers/${newSupplierId}`, {
    token: staffToken,
    body: { ...before.body, status: 'approved' },
  });

  const { body } = await call('GET', `/audit-logs?objectType=supplier&objectId=${newSupplierId}`);
  const entry = body.find((item) => item.action === 'supplier.status_changed');
  assert.ok(entry, 'tidak ada catatan perubahan status');
  assert.equal(entry.previousValue, 'supplier_request');
  assert.equal(entry.newValue, 'approved');
});

await test('profil bersarang tersimpan dan terbaca kembali utuh', async () => {
  const { body: before } = await call('GET', `/suppliers/${newSupplierId}`);
  const profile = {
    ...before.profile,
    tax: {
      taxName: 'PT Uji Coba Nusantara',
      npwp: '0123456789012345',
      transactionType: 'T01',
      ktpDocument: { name: 'ktp.pdf', size: 1024, type: 'application/pdf' },
      documents: {
        siup: {
          number: 'SIUP-1',
          file: { name: 'siup.pdf', size: 2048, type: 'application/pdf' },
          validFrom: '2026-01-01',
          validUntil: '2029-01-01',
        },
      },
    },
    banking: {
      currency: 'IDR',
      termsOfPayment1: 'D045',
      lines: [
        {
          id: 'bank-a',
          accountType: 'AT02',
          bankCode: 'BCA',
          accountNumber: '1234567890',
          accountHolder: 'PT Uji Coba Nusantara',
          statement: { name: 'rk.pdf', size: 4096, type: 'application/pdf' },
        },
      ],
    },
    contacts: [
      { id: 'ct-a', name: 'Sari', email: 'sari@ujicoba.co.id', isPrimary: true },
      { id: 'ct-b', name: 'Joko', email: 'joko@ujicoba.co.id', isPrimary: false },
    ],
    completed: { ...before.profile.completed, tax: true, banking: true, contacts: true },
  };

  await call('PUT', `/suppliers/${newSupplierId}`, {
    token: staffToken,
    body: { ...before, profile },
  });

  const { body: after } = await call('GET', `/suppliers/${newSupplierId}`);
  assert.deepEqual(after.profile.tax, profile.tax);
  assert.deepEqual(after.profile.banking, profile.banking);
  assert.deepEqual(after.profile.contacts, profile.contacts);
  assert.equal(after.profile.completed.tax, true);
});

await test('metadata berkas masuk ke tabel supplier_document', async () => {
  const slots = getDb()
    .prepare('SELECT slot FROM supplier_document WHERE supplier_id = ? ORDER BY slot')
    .all(newSupplierId)
    .map((row) => row.slot);
  assert.ok(slots.includes('tax.ktpDocument'));
  assert.ok(slots.includes('tax.documents.siup'));
  assert.ok(slots.includes('banking.lines.bank-a.statement'));
});

await test('menyimpan ulang tidak menggandakan baris anak', async () => {
  const { body } = await call('GET', `/suppliers/${newSupplierId}`);
  await call('PUT', `/suppliers/${newSupplierId}`, { token: staffToken, body });
  await call('PUT', `/suppliers/${newSupplierId}`, { token: staffToken, body });

  const counts = getDb()
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM supplier_contact_person WHERE supplier_id = @id) AS contacts,
         (SELECT COUNT(*) FROM supplier_bank_account WHERE supplier_id = @id) AS banks,
         (SELECT COUNT(*) FROM supplier_document WHERE supplier_id = @id) AS documents`,
    )
    .get({ id: newSupplierId });

  assert.equal(counts.contacts, 2);
  assert.equal(counts.banks, 1);
  assert.equal(counts.documents, 3);
});

/* ------------------------------------------------------------------ */

group('Kualifikasi');

await test('pemasok yang belum kirim profil ditolak', async () => {
  const { status, body } = await call('PUT', `/suppliers/${newSupplierId}/qualification`, {
    token: staffToken,
    body: { lines: [], status: 'draft' },
  });
  assert.equal(status, 400);
  assert.match(body.error.message, /belum layak/);
});

await test('draf kualifikasi tersimpan untuk pemasok yang layak', async () => {
  const { status, body } = await call('PUT', '/suppliers/SUP-2026-0135/qualification', {
    token: staffToken,
    body: {
      status: 'draft',
      lines: [
        { segmentCode: '12', commodityCode: '12141900', countryCode: 'ID', notes: 'utama' },
        { segmentCode: '', commodityCode: '', countryCode: '', notes: '' },
      ],
    },
  });
  assert.equal(status, 200);
  assert.equal(body.lines.length, 1, 'baris kosong seharusnya dibuang');
  assert.equal(body.status, 'draft');
});

await test('pasangan komoditas-negara ganda ditolak', async () => {
  const { status } = await call('PUT', '/suppliers/SUP-2026-0135/qualification', {
    token: staffToken,
    body: {
      status: 'draft',
      lines: [
        { commodityCode: '12141900', countryCode: 'ID' },
        { commodityCode: '12141900', countryCode: 'ID' },
      ],
    },
  });
  assert.equal(status, 400);
});

await test('menyelesaikan kualifikasi dengan baris tak lengkap ditolak', async () => {
  const { status } = await call('PUT', '/suppliers/SUP-2026-0135/qualification', {
    token: staffToken,
    body: { status: 'completed', lines: [{ commodityCode: '12141900', countryCode: '' }] },
  });
  assert.equal(status, 400);
});

await test('manager tidak dapat menyunting kualifikasi', async () => {
  const { status } = await call('PUT', '/suppliers/SUP-2026-0135/qualification', {
    token: managerToken,
    body: { status: 'draft', lines: [] },
  });
  assert.equal(status, 403);
});

/* ------------------------------------------------------------------ */

group('Questionnaire — template & versi');

let templateId;
let versionId;

await test('data contoh memuat tiga template', async () => {
  const { body } = await call('GET', '/questionnaire-templates');
  assert.equal(body.length, 3);
});

await test('membuat template menghasilkan versi draf sekaligus', async () => {
  const { status, body } = await call('POST', '/questionnaire-templates', {
    token: staffToken,
    body: {
      code: 'SUS-01',
      name: 'Sustainability Assessment',
      type: 'Sustainability',
      materialType: 'Both',
      scoringEnabled: true,
    },
  });
  assert.equal(status, 201);
  templateId = body.template.id;
  versionId = body.version.id;
  assert.equal(body.version.status, 'draft');
  assert.equal(body.version.versionLabel, 'v1.0');
});

await test('versi tanpa seksi tidak dapat diterbitkan', async () => {
  const { status, body } = await call('POST', `/questionnaire-versions/${versionId}/publish`, {
    token: staffToken,
  });
  assert.equal(status, 400);
  assert.match(body.error.message, /tanpa seksi/);
});

await test('seksi dan pertanyaan tersimpan sebagai pohon', async () => {
  const { body: current } = await call('GET', `/questionnaire-versions/${versionId}`);
  const { status, body } = await call('PUT', `/questionnaire-versions/${versionId}`, {
    token: staffToken,
    body: {
      ...current,
      sections: [
        {
          id: 'sec-a',
          name: 'Kebijakan lingkungan',
          description: '',
          order: 0,
          mandatory: true,
          weight: 1,
          questions: [
            {
              id: 'q-a',
              code: 'ENV-1',
              text: 'Apakah perusahaan memiliki kebijakan lingkungan tertulis?',
              guidance: '',
              type: 'yes_no',
              required: true,
              defaultValue: null,
              placeholder: '',
              helpText: '',
              weight: 2,
              order: 0,
              options: [
                { id: 'o1', label: 'Ya', value: 'yes', score: 10, excludeFromScoring: false },
                { id: 'o2', label: 'Tidak', value: 'no', score: 0, excludeFromScoring: false },
              ],
              conditions: null,
              validation: {},
              attachmentRule: {
                required: true,
                maxFiles: 2,
                maxFileSizeMb: 2,
                allowedTypes: ['application/pdf'],
                expiryDateRequired: true,
                expiryMinDays: 30,
              },
              libraryItemId: null,
            },
          ],
        },
      ],
    },
  });

  assert.equal(status, 200);
  assert.equal(body.sections[0].questions[0].options.length, 2);
  assert.equal(body.sections[0].questions[0].attachmentRule.expiryMinDays, 30);
});

await test('versi dapat diterbitkan setelah berisi pertanyaan', async () => {
  const { status, body } = await call('POST', `/questionnaire-versions/${versionId}/publish`, {
    token: staffToken,
  });
  assert.equal(status, 200);
  assert.equal(body.status, 'published');
  assert.ok(body.publishedAt);
});

await test('versi terbit tidak dapat disunting', async () => {
  const { body: current } = await call('GET', `/questionnaire-versions/${versionId}`);
  const { status, body } = await call('PUT', `/questionnaire-versions/${versionId}`, {
    token: staffToken,
    body: { ...current, sections: [] },
  });
  assert.equal(status, 409);
  assert.match(body.error.message, /tidak dapat disunting/);
});

await test('menerbitkan versi yang sudah terbit ditolak', async () => {
  const { status } = await call('POST', `/questionnaire-versions/${versionId}/publish`, {
    token: staffToken,
  });
  assert.equal(status, 409);
});

/* ------------------------------------------------------------------ */

group('Questionnaire — penugasan, pengisian, tinjauan');

let assignmentId;
let responseId;

await test('versi draf tidak dapat ditugaskan', async () => {
  const draft = getDb()
    .prepare("SELECT id FROM questionnaire_version WHERE status = 'draft' LIMIT 1")
    .get();
  const { status } = await call('POST', '/assignments', {
    token: staffToken,
    body: { versionId: draft.id, supplierId: 'SUP-2026-0118' },
  });
  assert.equal(status, 400);
});

await test('penugasan membuat respons kosong sekaligus', async () => {
  const { status, body } = await call('POST', '/assignments', {
    token: staffToken,
    body: {
      versionId,
      supplierId: 'SUP-2026-0118',
      supplierName: 'PT Kimia Prima Lestari',
      materialCategory: 'Raw Material',
      dueDate: '2026-12-31T00:00:00.000Z',
      reviewerId: 'usr-staff-1',
      reviewerName: 'Dewi Anggraini',
      priority: 'normal',
    },
  });
  assert.equal(status, 201);
  assignmentId = body.assignment.id;
  responseId = body.response.id;
  assert.equal(body.response.status, 'not_started');
});

await test('penugasan memicu notifikasi untuk pemasok', async () => {
  const { body } = await call('GET', '/notifications?audience=supplier');
  assert.ok(body.some((item) => item.event === 'assignment.created'));
});

await test('simpan draf memindahkan status ke sedang diisi', async () => {
  const { status, body } = await call('PATCH', `/responses/${responseId}/answers`, {
    token: supplierToken,
    body: {
      answers: { 'q-a': 'yes' },
      attachments: {
        'q-a': [
          {
            id: 'att-1',
            fileName: 'kebijakan.pdf',
            fileType: 'application/pdf',
            fileSize: 12345,
            expiryDate: '2027-01-01',
            uploadedAt: '2026-09-01T00:00:00.000Z',
          },
        ],
      },
    },
  });
  assert.equal(status, 200);
  assert.equal(body.status, 'in_progress');
  assert.equal(body.answers['q-a'], 'yes');
  assert.equal(body.attachments['q-a'][0].fileName, 'kebijakan.pdf');
  assert.ok(body.startedAt);
});

await test('pemasok lain tidak dapat menyunting respons ini', async () => {
  const { body: login } = await call('POST', '/auth/supplier/login', {
    body: { accountId: 'SUP-PAC-0131', password: 'x' },
  });
  const { status } = await call('PATCH', `/responses/${responseId}/answers`, {
    token: login.token,
    body: { answers: { 'q-a': 'no' } },
  });
  assert.equal(status, 403);
});

await test('pengiriman menyimpan satu putaran revisi', async () => {
  const { status, body } = await call('POST', `/responses/${responseId}/submit`, {
    token: supplierToken,
    body: { actorName: 'Hendra Wijaya', completionPercent: 100, score: 90, riskLevel: 'low' },
  });
  assert.equal(status, 200);
  assert.equal(body.status, 'submitted');
  assert.equal(body.revision, 1);

  const { body: revisions } = await call('GET', `/responses/${responseId}/revisions`);
  assert.equal(revisions.length, 1);
});

await test('minta revisi tanpa menandai pertanyaan ditolak', async () => {
  const { status } = await call('POST', `/responses/${responseId}/reviews`, {
    token: staffToken,
    body: { decision: 'request_revision', flagged: [] },
  });
  assert.equal(status, 400);
});

await test('pemasok tidak dapat meninjau kuesionernya sendiri', async () => {
  const { status } = await call('POST', `/responses/${responseId}/reviews`, {
    token: supplierToken,
    body: { decision: 'approve' },
  });
  assert.equal(status, 403);
});

await test('minta revisi menyimpan tanda beserta salinan jawaban', async () => {
  const { status, body } = await call('POST', `/responses/${responseId}/reviews`, {
    token: staffToken,
    body: {
      decision: 'request_revision',
      note: 'Lampiran perlu diperbarui.',
      flagged: [{ questionId: 'q-a', reason: 'Dokumen sudah kedaluwarsa.' }],
    },
  });

  assert.equal(status, 201);
  assert.equal(body.status, 'revision_required');
  assert.equal(body.reviews.length, 1);
  assert.equal(body.reviews[0].flagged[0].reason, 'Dokumen sudah kedaluwarsa.');
  assert.equal(body.reviews[0].answerSnapshot['q-a'], 'yes');
  assert.equal(body.reviews[0].flagged[0].attachmentSnapshot.length, 1);
});

await test('pengiriman ulang menaikkan nomor revisi', async () => {
  await call('PATCH', `/responses/${responseId}/answers`, {
    token: supplierToken,
    body: { answers: { 'q-a': 'no' } },
  });
  const { body } = await call('POST', `/responses/${responseId}/submit`, {
    token: supplierToken,
    body: { actorName: 'Hendra Wijaya' },
  });

  assert.equal(body.revision, 2);
  const { body: revisions } = await call('GET', `/responses/${responseId}/revisions`);
  assert.equal(revisions.length, 2);
});

await test('riwayat tidak pernah kehilangan putaran sebelumnya', async () => {
  const { body } = await call('GET', `/responses/${responseId}`);
  const labels = body.history.map((item) => item.label);
  assert.ok(labels.includes('Kuesioner dikirim'));
  assert.ok(labels.includes('Revisi dikirim ulang'));
  assert.ok(labels.some((label) => label.startsWith('Revisi diminta')));
});

await test('persetujuan memindahkan status ke approved', async () => {
  const { body } = await call('POST', `/responses/${responseId}/reviews`, {
    token: staffToken,
    body: { decision: 'approve', note: 'Sudah sesuai.' },
  });
  assert.equal(body.status, 'approved');
  assert.equal(body.reviews.length, 2);
});

/* ------------------------------------------------------------------ */

group('Dashboard, bootstrap, dan galat');

await test('KPI dihitung dari basis data', async () => {
  const { body } = await call('GET', '/questionnaire-dashboard/kpi');
  assert.equal(body.templates, 4);
  assert.ok(body.responses >= 5);
  assert.ok(body.overdue >= 1, 'penugasan lewat tenggat seharusnya terhitung');
  assert.ok(body.responseRate > 0 && body.responseRate <= 1);
  assert.ok(body.byStatus.approved >= 1);
});

await test('bootstrap mengembalikan seluruh keadaan awal', async () => {
  const { body } = await call('GET', '/bootstrap');
  assert.equal(body.internalUsers.length, 3);
  assert.ok(body.submissions.length >= 7);
  assert.ok(body.questionnaire.templates.length >= 3);
  assert.ok(body.questionnaire.versions.length >= 3);
  assert.ok(body.questionnaire.assignments.length >= 4);
  assert.ok(body.questionnaire.responses.length >= 4);
  assert.ok(body.questionnaire.auditLog.length > 0);
  assert.ok(body.qualifications['SUP-2026-0135']);
});

await test('rute tak dikenal menjawab 404 dengan bentuk galat yang sama', async () => {
  const { status, body } = await call('GET', '/tidak-ada');
  assert.equal(status, 404);
  assert.ok(body.error.message);
});

await test('data yang tidak ada menjawab 404', async () => {
  const { status } = await call('GET', '/suppliers/SUP-TIDAK-ADA');
  assert.equal(status, 404);
});

await test('notifikasi dapat ditandai sudah dibaca', async () => {
  const { body: before } = await call('GET', '/notifications?unread=true');
  assert.ok(before.length > 0);

  await call('POST', '/notifications/read-all', {
    token: staffToken,
    body: { audience: 'supplier' },
  });

  const { body: after } = await call('GET', '/notifications?audience=supplier&unread=true');
  assert.equal(after.length, 0);
});

/* ------------------------------------------------------------------ */

server.close();
closeDb();

console.log(`\n${passed} pemeriksaan lolos, ${failures.length} gagal.`);
if (failures.length) {
  console.error('\nGagal:');
  for (const failure of failures) console.error(`  - ${failure.name}: ${failure.error.message}`);
  process.exit(1);
}
