/**
 * Master data bagian Data Umum.
 *
 * Seluruh pilihan di sini disimpan sebagai **kode**, bukan nama. Nama hanya
 * dipakai untuk ditampilkan. Alasannya integrasi SAP: nama dapat berubah ejaan
 * atau bahasa tanpa memengaruhi data, sedangkan kode adalah kesepakatan antar
 * sistem. Pemetaan kodenya sendiri ke SAP akan didefinisikan terpisah.
 *
 * Bentuk tiap butir: `{ code, name }`, ditambah `filterBy` pada rincian jenis
 * pasokan yang pilihannya bergantung pada jenis pasokan terpilih.
 */

/* ------------------------------------------------------------------ */
/* Status badan hukum                                                 */
/* ------------------------------------------------------------------ */

export const LEGAL_STATUSES = [
  { code: 'Z1', name: 'Perorangan' },
  { code: 'Z2', name: 'Badan' },
];

/** Bentuk badan usaha hanya berlaku bila status badan hukumnya "Badan". */
export const LEGAL_STATUS_ENTITY = 'Z2';

/* ------------------------------------------------------------------ */
/* Bentuk badan usaha                                                 */
/* ------------------------------------------------------------------ */

export const ENTITY_TYPES = [
  { code: '0001', name: 'PT' },
  { code: '0002', name: 'CV' },
  { code: '0003', name: 'CO. LTD.' },
  { code: '0004', name: 'SDN. BHD.' },
  { code: '0005', name: 'INC.' },
  { code: '0006', name: 'S.P.A.' },
  { code: '0007', name: 'S.A.' },
  { code: '0008', name: 'PVT. LTD.' },
  { code: '0009', name: 'PTY. LTD.' },
  { code: '0010', name: 'PTE. LTD.' },
  { code: '0011', name: 'PLT' },
  { code: '0012', name: 'LTD.' },
  { code: '0013', name: 'LLC.' },
  { code: '0014', name: 'AG' },
  { code: '0015', name: 'GMBH' },
  { code: '0016', name: 'CO. INC.' },
  { code: '0017', name: 'S.R.L.' },
  { code: '0018', name: 'S.L.' },
  { code: '0019', name: 'CO.' },
  { code: '0020', name: 'BVBA' },
  { code: '0021', name: 'G.P.' },
  { code: '0022', name: 'S.A.S.' },
  { code: '0023', name: 'B.V.' },
  { code: '0024', name: 'L.P.' },
  { code: '0025', name: 'PLC' },
  { code: '0026', name: 'UAB' },
  { code: '0027', name: 'S.A.U.' },
  { code: '0028', name: 'S.L.U' },
];

/* ------------------------------------------------------------------ */
/* Jenis pasokan dan rinciannya                                       */
/* ------------------------------------------------------------------ */

export const VENDOR_TYPES = [
  { code: '0001', name: 'Raw Material' },
  { code: '0002', name: 'Packaging Material' },
  { code: '0003', name: 'Indirect Material' },
];

/** `filterBy` menunjuk kode jenis pasokan yang memunculkan rincian ini. */
export const VENDOR_TYPE_DETAILS = [
  { code: '0001', name: 'Packaging Primer', filterBy: '0002' },
  { code: '0002', name: 'Packaging Sekunder', filterBy: '0002' },
  { code: '0003', name: 'Raw Material', filterBy: '0001' },
  { code: '0004', name: 'Barang Umum', filterBy: '0003' },
  { code: '0005', name: 'Zakat & CSR', filterBy: '0003' },
  { code: '0006', name: 'Media', filterBy: '0003' },
  { code: '0007', name: 'CREM', filterBy: '0003' },
];

/** Rincian yang berlaku bagi sebuah jenis pasokan. */
export function detailsForVendorType(vendorTypeCode) {
  return VENDOR_TYPE_DETAILS.filter((item) => item.filterBy === vendorTypeCode);
}

/* ------------------------------------------------------------------ */
/* Perusahaan Paragon yang dituju                                     */
/* ------------------------------------------------------------------ */

/**
 * Entitas korporat Paragon beserta nama antarmukanya.
 *
 * Antarmuka hanya menampilkan dua pilihan — Paragon Corp Indonesia dan
 * Paragon Corp Malaysia — sementara basis data menyimpan kode korporatnya.
 * Saat sebuah nama antarmuka dipilih, seluruh kode korporat di bawahnya
 * dikirim ke SAP sebagai larik.
 */
export const CORPORATE_ENTITIES = [
  { code: 'ID01', name: 'PT Paragon Universa Utama', interfaceName: 'Paragon Corp Indonesia' },
  { code: 'ID02', name: 'PT Paragon Technology And Innovation', interfaceName: 'Paragon Corp Indonesia' },
  { code: 'ID03', name: 'PT Parama Global Inspira', interfaceName: 'Paragon Corp Indonesia' },
  { code: 'ID04', name: 'PT Varcos Citra International', interfaceName: 'Paragon Corp Indonesia' },
  { code: 'ID05', name: 'PT Paranova Global Optima', interfaceName: 'Paragon Corp Indonesia' },
  { code: 'ID06', name: 'PT Alpha Global Medika', interfaceName: 'Paragon Corp Indonesia' },
  { code: 'MY01', name: 'PT Pharmacore Technology & Innovation', interfaceName: 'Paragon Corp Malaysia' },
];

/** Dua pilihan yang tampil di antarmuka. */
export const TARGET_COMPANIES = [...new Set(CORPORATE_ENTITIES.map((item) => item.interfaceName))];

/**
 * Menerjemahkan pilihan antarmuka menjadi larik kode korporat untuk SAP.
 * Memilih Paragon Corp Indonesia menghasilkan enam kode sekaligus.
 */
export function corporateCodesFor(interfaceNames = []) {
  return CORPORATE_ENTITIES.filter((item) => interfaceNames.includes(item.interfaceName)).map(
    (item) => item.code,
  );
}

/* ------------------------------------------------------------------ */
/* Rencana kerja sama dan tipe vendor                                 */
/* ------------------------------------------------------------------ */

export const OTV_STATUSES = [
  { code: 'C1', name: 'Reguler Vendor' },
  { code: 'C0', name: 'One Time Vendor' },
];

export const VENDOR_DIRECT_TYPES = [
  { code: 'Z002', name: 'Direct Transaction' },
  { code: 'Z009', name: 'Manufacturer' },
];

/* ------------------------------------------------------------------ */
/* Data pajak                                                         */
/* ------------------------------------------------------------------ */

export const TRANSACTION_TYPES = [
  { code: 'T01', name: 'Goods' },
  { code: 'T02', name: 'CSR Cash Money' },
  { code: 'T03', name: 'Rent' },
  { code: 'T04', name: 'Other' },
];

/** Jenis transaksi yang mengaktifkan e-invoice. */
export const EINVOICE_TRANSACTION_TYPE = 'T01';

/**
 * Penanda e-invoice diturunkan dari jenis transaksi, bukan diisi pengguna dan
 * bukan disimpan. Menyimpan nilai turunan membuka peluang datanya menyimpang
 * bila aturannya berubah; menghitungnya saat dibutuhkan selalu benar.
 */
export function eInvoiceFor(transactionTypeCode) {
  return transactionTypeCode === EINVOICE_TRANSACTION_TYPE ? 'Yes' : 'No';
}

/**
 * Dokumen perpajakan yang menyimpan nomor, berkas, dan masa berlaku.
 * `required` menandai dokumen yang wajib dimiliki setiap pemasok.
 */
export const TAX_DOCUMENTS = [
  { key: 'siup', label: 'SIUP', required: true },
  { key: 'pkp', label: 'PKP', required: false },
  { key: 'sbu', label: 'SBU', required: false },
  { key: 'skb', label: 'SKB', required: false },
  { key: 'suratKeteranganPp', label: 'Surat Keterangan PP', required: false },
  { key: 'codCor', label: 'COD/COR', required: false },
];

/** Bentuk kosong satu dokumen perpajakan. */
export function makeTaxDocument() {
  return { number: '', file: null, validFrom: '', validUntil: '' };
}

/** Seluruh dokumen perpajakan dalam keadaan kosong. */
export function makeTaxDocuments() {
  return TAX_DOCUMENTS.reduce((acc, item) => {
    acc[item.key] = makeTaxDocument();
    return acc;
  }, {});
}

/** Sebuah dokumen dianggap tersentuh bila salah satu kolomnya terisi. */
export function isTaxDocumentTouched(doc) {
  return Boolean(doc?.number?.trim() || doc?.file || doc?.validFrom || doc?.validUntil);
}

/* ------------------------------------------------------------------ */
/* Dokumen legalitas                                                  */
/* ------------------------------------------------------------------ */

/**
 * Dokumen legalitas yang diunggah pemasok, terbagi dua kelompok sesuai
 * rancangan formulir. `required` menandai dokumen yang wajib bagi setiap
 * pemasok; sisanya menyesuaikan bentuk badan usaha dan perizinannya.
 */
export const LEGAL_DOCUMENTS = [
  /* Kelompok 1 — Document upload */
  { key: 'aktaPendirian', label: 'Akta Pendirian', group: 'upload', required: true },
  { key: 'skPendirian', label: 'SK Pendirian MENKUMHAM', group: 'upload', required: true },
  { key: 'aktaPerubahan', label: 'Akta Perubahan SK/SP MENKUMHAM', group: 'upload', required: false },
  {
    key: 'aktaSusunanDireksi',
    label: 'Akta Susunan Direksi dan Komisaris SK MENKUMHAM',
    group: 'upload',
    required: false,
  },
  { key: 'nib', label: 'NIB', group: 'upload', required: true },
  {
    key: 'suratIzinUsaha',
    label: 'Surat Izin Usaha / Sertifikat Standar',
    group: 'upload',
    required: false,
  },
  { key: 'izinLokasi', label: 'Izin Lokasi', group: 'upload', required: false },
  { key: 'pkkpr', label: 'PKKPR', group: 'upload', required: false },
  { key: 'suratKuasa', label: 'Surat Kuasa', group: 'upload', required: false },

  /* Kelompok 2 — Other documents */
  { key: 'conflictOfInterest', label: 'Conflict of Interest', group: 'other', required: true },
  {
    key: 'othersDocuments',
    label: 'Others documents (SPK, PU, dll)',
    group: 'other',
    required: false,
  },
  {
    key: 'deedOfEstablishment',
    label: 'Deed of Establishment (DoE)',
    group: 'other',
    required: false,
  },
  { key: 'businessLicense', label: 'Business License', group: 'other', required: true },
];

export const LEGAL_DOCUMENT_GROUPS = [
  { id: 'upload', label: 'Document upload' },
  { id: 'other', label: 'Other documents' },
];

export function legalDocumentsOf(groupId) {
  return LEGAL_DOCUMENTS.filter((item) => item.group === groupId);
}

/** Seluruh berkas legalitas dalam keadaan kosong. */
export function makeLegalDocuments() {
  return LEGAL_DOCUMENTS.reduce((acc, item) => {
    acc[item.key] = null;
    return acc;
  }, {});
}

/* ------------------------------------------------------------------ */
/* Pembayaran dan tagihan                                             */
/* ------------------------------------------------------------------ */

/** Sakelar set agreement rate pada tingkat header. */
export const AGREEMENT_RATE_OPTIONS = [
  { code: 'active', name: 'Active' },
  { code: 'inactive', name: 'Inactive' },
];

export const TERMS_OF_PAYMENT = [
  { code: 'D007', name: '7 Days' },
  { code: 'D014', name: '14 Days' },
  { code: 'D015', name: '15 Days' },
  { code: 'D045', name: '45 Days' },
  { code: 'D060', name: '60 Days' },
  { code: 'D090', name: '90 Days' },
  { code: 'D120', name: '120 Days' },
];

export const FISCAL_POSITIONS = [
  { code: 'FP01', name: 'Absolut (PRM)' },
  { code: 'FP02', name: 'Absolut (PTI)' },
  { code: 'FP03', name: 'Free Trade Zone' },
  { code: 'FP04', name: 'Has NPWP no PKP' },
  { code: 'FP05', name: 'Individual non NPWP' },
];

export const ACCOUNT_TYPES = [
  { code: 'AT01', name: 'Virtual Account' },
  { code: 'AT02', name: 'Bank Account' },
  { code: 'AT03', name: 'Batch Upload' },
  { code: 'AT04', name: 'Billing ID' },
];

/**
 * Daftar bank beserta kode BIC/SWIFT dan negaranya.
 *
 * Memilih bank mengisi sendiri kode BIC dan negaranya, sehingga pemasok tidak
 * perlu menghafal kode dan tidak ada peluang salah ketik. Keduanya diturunkan
 * dari kode bank saat ditampilkan, bukan disimpan ulang pada tiap baris —
 * menyimpan nilai turunan membuka peluang datanya menyimpang bila daftar bank
 * diperbarui.
 *
 * ⚠️ Tiga puluh bank ini kurasi awal untuk keperluan demo, dan kode BIC-nya
 * **belum dicocokkan dengan direktori SWIFT resmi**. Mintalah tim master data
 * memverifikasinya sebelum dipakai untuk pembayaran sungguhan.
 */
export const BANKS = [
  /* Indonesia */
  { code: 'BMRI', name: 'Bank Mandiri', bic: 'BMRIIDJA', country: 'Indonesia' },
  { code: 'BCA', name: 'Bank Central Asia', bic: 'CENAIDJA', country: 'Indonesia' },
  { code: 'BNI', name: 'Bank Negara Indonesia', bic: 'BNINIDJA', country: 'Indonesia' },
  { code: 'BRI', name: 'Bank Rakyat Indonesia', bic: 'BRINIDJA', country: 'Indonesia' },
  { code: 'BNIA', name: 'Bank CIMB Niaga', bic: 'BNIAIDJA', country: 'Indonesia' },
  { code: 'BDIN', name: 'Bank Danamon', bic: 'BDINIDJA', country: 'Indonesia' },
  { code: 'BBBA', name: 'Bank Permata', bic: 'BBBAIDJA', country: 'Indonesia' },
  { code: 'PINB', name: 'Bank Panin', bic: 'PINBIDJA', country: 'Indonesia' },
  { code: 'IBBK', name: 'Bank Maybank Indonesia', bic: 'IBBKIDJA', country: 'Indonesia' },
  { code: 'NISP', name: 'Bank OCBC NISP', bic: 'NISPIDJA', country: 'Indonesia' },
  { code: 'BSMD', name: 'Bank Syariah Indonesia', bic: 'BSMDIDJA', country: 'Indonesia' },

  /* Malaysia */
  { code: 'MBBE', name: 'Maybank', bic: 'MBBEMYKL', country: 'Malaysia' },
  { code: 'CIBB', name: 'CIMB Bank Berhad', bic: 'CIBBMYKL', country: 'Malaysia' },
  { code: 'PBBE', name: 'Public Bank Berhad', bic: 'PBBEMYKL', country: 'Malaysia' },
  { code: 'RHBB', name: 'RHB Bank Berhad', bic: 'RHBBMYKL', country: 'Malaysia' },
  { code: 'HLBB', name: 'Hong Leong Bank', bic: 'HLBBMYKL', country: 'Malaysia' },

  /* Singapura */
  { code: 'DBSS', name: 'DBS Bank', bic: 'DBSSSGSG', country: 'Singapura' },
  { code: 'OCBC', name: 'OCBC Bank', bic: 'OCBCSGSG', country: 'Singapura' },
  { code: 'UOVB', name: 'United Overseas Bank', bic: 'UOVBSGSG', country: 'Singapura' },

  /* Global */
  { code: 'HBUK', name: 'HSBC Bank', bic: 'HBUKGB4B', country: 'Britania Raya' },
  { code: 'SCBL', name: 'Standard Chartered Bank', bic: 'SCBLGB2L', country: 'Britania Raya' },
  { code: 'BARC', name: 'Barclays Bank', bic: 'BARCGB22', country: 'Britania Raya' },
  { code: 'CITI', name: 'Citibank', bic: 'CITIUS33', country: 'Amerika Serikat' },
  { code: 'CHAS', name: 'JPMorgan Chase Bank', bic: 'CHASUS33', country: 'Amerika Serikat' },
  { code: 'BOFA', name: 'Bank of America', bic: 'BOFAUS3N', country: 'Amerika Serikat' },
  { code: 'DEUT', name: 'Deutsche Bank', bic: 'DEUTDEFF', country: 'Jerman' },
  { code: 'BNPA', name: 'BNP Paribas', bic: 'BNPAFRPP', country: 'Prancis' },
  { code: 'BOTK', name: 'MUFG Bank', bic: 'BOTKJPJT', country: 'Jepang' },
  { code: 'SMBC', name: 'Sumitomo Mitsui Banking Corporation', bic: 'SMBCJPJT', country: 'Jepang' },
  { code: 'BKCH', name: 'Bank of China', bic: 'BKCHCNBJ', country: 'Tiongkok' },
];

export function findBank(code) {
  return BANKS.find((item) => item.code === code) ?? null;
}

let bankLineCounter = 0;

/** Satu baris rekening pada bagian pembayaran. */
export function makeBankLine(overrides = {}) {
  bankLineCounter += 1;
  return {
    id: `bank_${Date.now().toString(36)}${bankLineCounter.toString(36)}`,
    accountType: '',
    bankCode: '',
    accountNumber: '',
    accountHolder: '',
    statement: null,
    ...overrides,
  };
}

/** Baris dianggap tersentuh bila salah satu kolomnya terisi. */
export function isBankLineTouched(line) {
  return Boolean(
    line?.accountType ||
      line?.bankCode ||
      line?.accountNumber?.trim() ||
      line?.accountHolder?.trim() ||
      line?.statement,
  );
}

/* ------------------------------------------------------------------ */
/* Pembantu tampilan                                                  */
/* ------------------------------------------------------------------ */

/** Nama untuk sebuah kode; mengembalikan kodenya sendiri bila tidak dikenal. */
export function labelOf(list, code) {
  if (!code) return '';
  return list.find((item) => item.code === code)?.name ?? code;
}

/** Bentuk `{ value, label }` untuk komponen SelectField. */
export function asOptions(list) {
  return list.map((item) => ({ value: item.code, label: item.name }));
}

/** Nama disertai kodenya, dipakai pada layar tinjauan agar mudah dicocokkan. */
export function labelWithCode(list, code) {
  if (!code) return '';
  const found = list.find((item) => item.code === code);
  return found ? `${found.name} (${found.code})` : code;
}
