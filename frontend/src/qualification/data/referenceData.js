/**
 * Data acuan untuk kualifikasi pemasok.
 *
 * ── Catatan tentang UNSPSC ──────────────────────────────────────────────
 * Daftar komoditas di bawah adalah **kurasi 42 butir yang relevan bagi
 * manufaktur kosmetik**, bukan salinan lengkap UNSPSC. Ini disengaja: daftar
 * resmi berisi lebih dari 150.000 kode dan sebagian besarnya tidak akan pernah
 * dipakai Paragon, sehingga menampilkannya seluruhnya justru menyulitkan staf
 * menemukan kategori yang tepat.
 *
 * Kode segmen dua digit mengikuti taksonomi UNSPSC resmi. Kode delapan digit
 * pada tiap komoditas **belum diverifikasi terhadap daftar resmi** — nomor
 * inilah yang akan terbawa ke sistem pengadaan dan pelaporan, jadi mintalah
 * tim master data mencocokkannya sebelum dipakai di produksi. Menambah atau
 * mengoreksi butir cukup dilakukan pada `UNSPSC_COMMODITIES`.
 * ───────────────────────────────────────────────────────────────────────
 */

/** Segmen UNSPSC yang relevan dengan pengadaan Paragon. */
export const UNSPSC_SEGMENTS = [
  { code: '10', name: 'Bahan tanaman dan hewan hidup' },
  { code: '11', name: 'Bahan mineral, tekstil, dan bahan nabati tak termakan' },
  { code: '12', name: 'Bahan kimia dan biokimia' },
  { code: '13', name: 'Resin, karet, busa, dan elastomer' },
  { code: '14', name: 'Bahan dan produk kertas' },
  { code: '24', name: 'Mesin penanganan dan penyimpanan bahan' },
  { code: '31', name: 'Komponen dan perlengkapan manufaktur' },
  { code: '41', name: 'Peralatan laboratorium dan pengujian' },
  { code: '47', name: 'Peralatan dan perlengkapan kebersihan' },
  { code: '50', name: 'Produk makanan dan minuman' },
  { code: '51', name: 'Obat dan produk farmasi' },
  { code: '53', name: 'Pakaian, tas, dan produk perawatan diri' },
  { code: '73', name: 'Jasa produksi dan manufaktur industri' },
  { code: '78', name: 'Jasa transportasi, penyimpanan, dan pos' },
  { code: '80', name: 'Jasa manajemen dan administrasi' },
  { code: '81', name: 'Jasa rekayasa dan riset teknologi' },
  { code: '82', name: 'Jasa editorial, desain, dan grafis' },
];

/**
 * Komoditas. `code` delapan digit, `family` empat digit pertama.
 * Lihat catatan di atas mengenai keabsahan kode.
 */
export const UNSPSC_COMMODITIES = [
  /* 12 — Bahan kimia dan biokimia */
  { code: '12141900', segment: '12', name: 'Surfaktan anionik' },
  { code: '12142000', segment: '12', name: 'Surfaktan nonionik' },
  { code: '12161500', segment: '12', name: 'Emulsifier dan pengemulsi' },
  { code: '12161600', segment: '12', name: 'Pengental dan pembentuk gel' },
  { code: '12161700', segment: '12', name: 'Pengawet kosmetik' },
  { code: '12162000', segment: '12', name: 'Antioksidan' },
  { code: '12164000', segment: '12', name: 'Pewarna dan pigmen kosmetik' },
  { code: '12171500', segment: '12', name: 'Pelarut organik' },
  { code: '12352100', segment: '12', name: 'Bahan aktif perawatan kulit' },

  /* 10 & 11 — Bahan alam */
  { code: '10171500', segment: '10', name: 'Ekstrak tumbuhan' },
  { code: '11121800', segment: '11', name: 'Lilin nabati dan mineral' },
  { code: '11162100', segment: '11', name: 'Serat alami untuk kemasan' },

  /* 50 — Bahan turunan pangan yang lazim dipakai kosmetik */
  { code: '50151500', segment: '50', name: 'Minyak nabati' },
  { code: '50151700', segment: '50', name: 'Lemak dan minyak terhidrogenasi' },
  { code: '50202300', segment: '50', name: 'Air demineralisasi dan air proses' },

  /* 51 — Bahan farmasi */
  { code: '51102700', segment: '51', name: 'Vitamin dan turunannya' },
  { code: '51241000', segment: '51', name: 'Bahan aktif antimikroba' },

  /* 53 — Produk perawatan diri */
  { code: '53131500', segment: '53', name: 'Produk perawatan kulit jadi' },
  { code: '53131600', segment: '53', name: 'Produk perawatan rambut jadi' },
  { code: '53131700', segment: '53', name: 'Produk tata rias jadi' },
  { code: '53131800', segment: '53', name: 'Produk parfum dan pewangi' },

  /* 13, 14, 24, 31 — Kemasan */
  { code: '13111000', segment: '13', name: 'Resin plastik untuk kemasan' },
  { code: '14111500', segment: '14', name: 'Kertas dan karton kemasan' },
  { code: '14111800', segment: '14', name: 'Label dan stiker' },
  { code: '24111500', segment: '24', name: 'Botol dan wadah plastik' },
  { code: '24111800', segment: '24', name: 'Tutup, pompa, dan dispenser' },
  { code: '24112000', segment: '24', name: 'Wadah kaca' },
  { code: '24121500', segment: '24', name: 'Tube dan sachet fleksibel' },
  { code: '24141500', segment: '24', name: 'Kotak dan dus karton' },
  { code: '31201500', segment: '31', name: 'Perekat dan lem kemasan' },

  /* 41, 47 — Laboratorium dan kebersihan */
  { code: '41105300', segment: '41', name: 'Peralatan gelas laboratorium' },
  { code: '41115400', segment: '41', name: 'Instrumen analisis laboratorium' },
  { code: '41116100', segment: '41', name: 'Reagen dan bahan uji' },
  { code: '47131500', segment: '47', name: 'Bahan pembersih dan sanitasi' },

  /* 73, 78, 80, 81, 82 — Jasa */
  { code: '73152100', segment: '73', name: 'Jasa maklon dan produksi kontrak' },
  { code: '73181100', segment: '73', name: 'Jasa pengemasan ulang' },
  { code: '78101800', segment: '78', name: 'Jasa transportasi darat' },
  { code: '78131600', segment: '78', name: 'Jasa pergudangan' },
  { code: '80101500', segment: '80', name: 'Jasa konsultansi manajemen' },
  { code: '81101500', segment: '81', name: 'Jasa rekayasa proses' },
  { code: '81141600', segment: '81', name: 'Jasa pengujian dan sertifikasi' },
  { code: '82141500', segment: '82', name: 'Jasa desain kemasan' },
];

/** Nama segmen untuk sebuah kode komoditas. */
export function segmentNameOf(commodityCode) {
  const segment = UNSPSC_SEGMENTS.find((item) => item.code === commodityCode?.slice(0, 2));
  return segment?.name ?? '';
}

export function findCommodity(code) {
  return UNSPSC_COMMODITIES.find((item) => item.code === code) ?? null;
}

/** Komoditas dikelompokkan per segmen, untuk dropdown bertingkat. */
export function commoditiesBySegment() {
  return UNSPSC_SEGMENTS.map((segment) => ({
    ...segment,
    commodities: UNSPSC_COMMODITIES.filter((item) => item.segment === segment.code),
  })).filter((group) => group.commodities.length > 0);
}

/* ------------------------------------------------------------------ */
/* Negara — ISO 3166-1 alpha-2                                        */
/* ------------------------------------------------------------------ */

/**
 * Disimpan sebagai satu untai agar berkas tetap ringkas; diurai sekali
 * saat modul dimuat. Nama memakai ejaan Indonesia bila lazim dipakai.
 */
const COUNTRY_SOURCE = [
  'ID:Indonesia', 'MY:Malaysia', 'SG:Singapura', 'TH:Thailand', 'VN:Vietnam',
  'PH:Filipina', 'BN:Brunei Darussalam', 'KH:Kamboja', 'LA:Laos', 'MM:Myanmar',
  'TL:Timor Leste', 'CN:Tiongkok', 'HK:Hong Kong', 'TW:Taiwan', 'JP:Jepang',
  'KR:Korea Selatan', 'KP:Korea Utara', 'IN:India', 'PK:Pakistan', 'BD:Bangladesh',
  'LK:Sri Lanka', 'NP:Nepal', 'BT:Bhutan', 'MV:Maladewa', 'AF:Afghanistan',
  'AU:Australia', 'NZ:Selandia Baru', 'PG:Papua Nugini', 'FJ:Fiji',
  'AE:Uni Emirat Arab', 'SA:Arab Saudi', 'QA:Qatar', 'KW:Kuwait', 'BH:Bahrain',
  'OM:Oman', 'YE:Yaman', 'IQ:Irak', 'IR:Iran', 'JO:Yordania', 'LB:Lebanon',
  'SY:Suriah', 'IL:Israel', 'TR:Turki', 'CY:Siprus',
  'DE:Jerman', 'FR:Prancis', 'IT:Italia', 'ES:Spanyol', 'PT:Portugal',
  'NL:Belanda', 'BE:Belgia', 'LU:Luksemburg', 'GB:Britania Raya', 'IE:Irlandia',
  'CH:Swiss', 'AT:Austria', 'SE:Swedia', 'NO:Norwegia', 'DK:Denmark',
  'FI:Finlandia', 'IS:Islandia', 'PL:Polandia', 'CZ:Ceko', 'SK:Slowakia',
  'HU:Hungaria', 'RO:Rumania', 'BG:Bulgaria', 'GR:Yunani', 'HR:Kroasia',
  'SI:Slovenia', 'RS:Serbia', 'BA:Bosnia dan Herzegovina', 'AL:Albania',
  'MK:Makedonia Utara', 'ME:Montenegro', 'UA:Ukraina', 'BY:Belarus',
  'RU:Rusia', 'LT:Lituania', 'LV:Latvia', 'EE:Estonia', 'MD:Moldova',
  'US:Amerika Serikat', 'CA:Kanada', 'MX:Meksiko', 'BR:Brasil', 'AR:Argentina',
  'CL:Cile', 'CO:Kolombia', 'PE:Peru', 'VE:Venezuela', 'EC:Ekuador',
  'UY:Uruguay', 'PY:Paraguay', 'BO:Bolivia', 'CR:Kosta Rika', 'PA:Panama',
  'GT:Guatemala', 'DO:Republik Dominika', 'CU:Kuba', 'JM:Jamaika',
  'ZA:Afrika Selatan', 'EG:Mesir', 'MA:Maroko', 'TN:Tunisia', 'DZ:Aljazair',
  'LY:Libya', 'NG:Nigeria', 'KE:Kenya', 'TZ:Tanzania', 'UG:Uganda',
  'ET:Etiopia', 'GH:Ghana', 'CI:Pantai Gading', 'SN:Senegal', 'CM:Kamerun',
  'ZW:Zimbabwe', 'ZM:Zambia', 'MZ:Mozambik', 'AO:Angola', 'MU:Mauritius',
  'MG:Madagaskar', 'KZ:Kazakhstan', 'UZ:Uzbekistan', 'AZ:Azerbaijan',
  'GE:Georgia', 'AM:Armenia', 'MN:Mongolia',
];

export const COUNTRIES = COUNTRY_SOURCE.map((entry) => {
  const [code, name] = entry.split(':');
  return { code, name };
}).sort((a, b) => a.name.localeCompare(b.name, 'id'));

export function findCountry(code) {
  return COUNTRIES.find((item) => item.code === code) ?? null;
}
