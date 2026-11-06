import readXlsxFile, { readSheetNames } from 'read-excel-file';

// Đọc dữ liệu điểm chuẩn (SQLite gốc hoặc file Excel người dùng tải lên) và chuyển thành cấu trúc của dashboard.
// Trả về cả danh sách lỗi để hiển thị cho người kiểm tra dữ liệu.

// thang_diem: 30 | 40 | Riêng. Các giá trị cũ vẫn đọc được và được đổi sang hệ số tương ứng.
const SCALE_MAP = {
  '30': { scale: 30 },
  '40': { scale: 40 },
  'riêng': { scale: 'custom' },
  '40 văn x2': { scale: 40, legacy: 'Ngữ văn x2' },
  '40 anh x2': { scale: 40, legacy: 'Ngoại ngữ x2' },
  '40 (tổng 50 quy đổi)': { scale: 40 }
};
// Cột mon_he_so_2: tên môn cách nhau bằng dấu phẩy. "Ngoại ngữ" tính là Tiếng Anh trong D01/D10/D15.
const SUBJECT_MAP = { 'toán': 'toan', 'ngữ văn': 'van', 'văn': 'van', 'ngoại ngữ': 'anh', 'tiếng anh': 'anh', 'anh': 'anh', 'địa lí': 'dia', 'địa lý': 'dia', 'địa': 'dia' };
const VERIFY_MAP = { 'đã kiểm chứng': 'verified', 'một phần': 'partial', 'chưa kiểm chứng': 'unverified' };
const TYPES = ['Công lập', 'Tư thục', 'Quốc tế & Liên kết'];
const BLOCK_CODES = ['D01', 'D10', 'D15', 'C04'];

const BADGES = {
  'Công lập-1': 'bg-rose-100 text-rose-800 border-rose-300',
  'Công lập-2': 'bg-slate-100 text-slate-800 border-slate-300',
  'Công lập-3': 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Quốc tế & Liên kết': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Tư thục': 'bg-teal-50 text-teal-800 border-teal-200'
};

const str = (v) => (v === undefined || v === null ? '' : String(v).trim());
const num = (v) => {
  const s = str(v).replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

// Đổi mảng dòng [header, ...rows] thành mảng object theo tên cột
const toObjects = (rows) => {
  if (!rows || !rows.length) return [];
  const header = rows[0].map((h) => str(h));
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? '']).filter(([h]) => h)));
};

// Nguồn 1 (mặc định): file SQLite dữ liệu gốc. Bảng truong / nganh / danhmuc có cùng tên cột với các sheet Excel.
export function parseSqlite(SQL, buffer) {
  const db = new SQL.Database(buffer);
  try {
    const table = (name) => {
      const res = db.exec(`SELECT * FROM ${name}`);
      if (!res.length) return [];
      const { columns, values } = res[0];
      return values.map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i] ?? ''])));
    };
    const has = (name) => db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`).length > 0;
    if (!has('truong') || !has('nganh')) throw new Error('File SQLite thiếu bảng "truong" hoặc "nganh".');
    const meta = has('meta') ? Object.fromEntries(table('meta').map((r) => [r.key, r.value])) : {};
    return { ...parseTables({ Truong: table('truong'), Nganh: table('nganh'), DanhMuc: has('danhmuc') ? table('danhmuc') : null }), meta };
  } finally {
    db.close();
  }
}

// Nguồn 2 (tùy chọn): file Excel người dùng tải lên. Chỉ đọc trong bộ nhớ trình duyệt, không ghi lại ở đâu cả.
export async function parseWorkbook(file) {
  const names = await readSheetNames(file);
  const read = async (name) => (names.includes(name) ? toObjects(await readXlsxFile(file, { sheet: name })) : null);
  const truong = await read('Truong');
  const nganh = await read('Nganh');
  if (!truong || !nganh) {
    throw new Error('File thiếu sheet "Truong" hoặc "Nganh". Kiểm tra lại tên sheet.');
  }
  return parseTables({ Truong: truong, Nganh: nganh, DanhMuc: await read('DanhMuc') });
}

// Kiểm tra và chuyển các dòng dữ liệu (dù từ SQLite hay Excel) thành cấu trúc dùng trong dashboard
function parseTables({ Truong: truong, Nganh: nganh, DanhMuc: danhmuc }) {
  const issues = [];

  const universities = [];
  const uniIds = new Set();
  truong.forEach((r, i) => {
    const line = i + 2;
    const id = str(r.ma_truong);
    if (!id) return;
    if (uniIds.has(id)) issues.push({ sheet: 'Truong', line, msg: `Mã trường ${id} bị trùng` });
    const tier = Number(r.tier);
    const type = str(r.loai_hinh);
    if (![1, 2, 3].includes(tier)) issues.push({ sheet: 'Truong', line, msg: `${id}: tier phải là 1, 2 hoặc 3` });
    if (!TYPES.includes(type)) issues.push({ sheet: 'Truong', line, msg: `${id}: loại hình "${type}" không hợp lệ` });
    uniIds.add(id);
    universities.push({
      id,
      name: str(r.ten_ngan) || id,
      fullName: str(r.ten_day_du) || str(r.ten_ngan) || id,
      tier: [1, 2, 3].includes(tier) ? tier : 3,
      type: TYPES.includes(type) ? type : 'Công lập',
      note: str(r.ghi_chu),
      hsaFloor: num(r.nguong_hsa) > 0 ? num(r.nguong_hsa) : null,
      badge: BADGES[type === 'Công lập' ? `${type}-${tier}` : type] || BADGES['Công lập-2']
    });
  });
  const uniById = Object.fromEntries(universities.map((u) => [u.id, u]));

  const majors = [];
  const majorIds = new Set();
  const categories = [];
  nganh.forEach((r, i) => {
    const line = i + 2;
    const id = str(r.ma_nganh);
    const name = str(r.ten_nganh);
    if (!id && !name) return; // dòng trống
    const label = id || `dòng ${line}`;
    if (!id) issues.push({ sheet: 'Nganh', line, msg: `Thiếu ma_nganh (${name})` });
    if (id && majorIds.has(id)) issues.push({ sheet: 'Nganh', line, msg: `Mã ngành ${id} bị trùng` });
    majorIds.add(id);

    const uni = uniById[str(r.ma_truong)];
    if (!uni) {
      issues.push({ sheet: 'Nganh', line, msg: `${label}: mã trường "${str(r.ma_truong)}" không có trong sheet Truong, dòng bị bỏ qua` });
      return;
    }
    const scaleInfo = SCALE_MAP[str(r.thang_diem).toLowerCase()];
    if (scaleInfo === undefined) issues.push({ sheet: 'Nganh', line, msg: `${label}: thang điểm "${str(r.thang_diem)}" không hợp lệ, tạm dùng thang 30` });
    const scale = scaleInfo ? scaleInfo.scale : 30;
    const max = scale === 30 ? 30 : 40;
    // he_so_mon: "Toán x2", "Ngữ văn x1.5 + Ngoại ngữ x1.5", "Toán x2 | Ngữ văn x2" (| = thí sinh được chọn cách có lợi hơn)
    const weightRaw = str(r.he_so_mon) || str(r.mon_he_so_2) || (scaleInfo && scaleInfo.legacy) || '';
    const weights = [];
    if (weightRaw) {
      weightRaw.split('|').forEach((alt) => {
        const w = {};
        alt.split(/[+,;&]/).forEach((part) => {
          const m = part.trim().match(/^(.+?)\s*(?:[x×*]\s*([\d.,]+))?$/i);
          if (!m) return;
          const key = SUBJECT_MAP[m[1].trim().toLowerCase()];
          const k = m[2] ? parseFloat(m[2].replace(',', '.')) : 2;
          if (!key || !(k > 0)) {
            issues.push({ sheet: 'Nganh', line, msg: `${label}: không hiểu "${part.trim()}" ở cột he_so_mon (VD đúng: "Toán x2")` });
            return;
          }
          w[key] = k;
        });
        if (Object.keys(w).length) weights.push(w);
      });
    }

    const scores = {};
    BLOCK_CODES.forEach((b) => {
      const v = num(r[b]);
      if (v === null) return;
      if (Number.isNaN(v) || v < 0 || v > max) {
        issues.push({ sheet: 'Nganh', line, msg: `${label}: điểm ${b} "${str(r[b])}" không hợp lệ (0–${max})` });
        return;
      }
      scores[b] = v;
    });
    const base = num(r.diem_chung);
    const hsa = num(r.HSA);
    if (hsa !== null && (Number.isNaN(hsa) || hsa < 0 || hsa > 150)) issues.push({ sheet: 'Nganh', line, msg: `${label}: HSA "${str(r.HSA)}" không hợp lệ (0–150)` });
    if (Object.keys(scores).length === 0 && (base === null || Number.isNaN(base)) && hsa === null) {
      issues.push({ sheet: 'Nganh', line, msg: `${label}: chưa có điểm tổ hợp, điểm chung hay HSA` });
    }
    const verify = VERIFY_MAP[str(r.trang_thai).toLowerCase()];
    if (!verify) issues.push({ sheet: 'Nganh', line, msg: `${label}: trạng thái "${str(r.trang_thai)}" không hợp lệ, tạm coi là Chưa kiểm chứng` });

    const category = str(r.nhom_nganh) || 'Khác';
    if (!categories.includes(category)) categories.push(category);

    majors.push({
      id: id || `row-${line}`,
      uniId: uni.id,
      uniName: uni.fullName,
      tier: uni.tier,
      type: uni.type,
      majorName: name || '(chưa có tên)',
      category,
      scale,
      weights,
      weightLabel: weightRaw.replace(/\s*\|\s*/g, ' hoặc '),
      scores,
      baseScore: base !== null && !Number.isNaN(base) ? base : null,
      hsaScore: hsa !== null && !Number.isNaN(hsa) && hsa > 0 ? (uni.hsaFloor && hsa < uni.hsaFloor ? uni.hsaFloor : hsa) : null,
      hsaRaw: hsa !== null && !Number.isNaN(hsa) && hsa > 0 ? hsa : null,
      hsaFloor: uni.hsaFloor,
      hsaNote: str(r.ghi_chu_HSA) || null,
      verify: verify || 'unverified',
      verifyNote: str(r.ghi_chu_kiem_chung) || null,
      source: str(r.nguon_url) ? { label: str(r.nguon_ten) || str(r.nguon_url), url: str(r.nguon_url) } : null,
      tuitionNote: str(r.hoc_phi) || 'Chưa cập nhật',
      scholarshipNote: str(r.hoc_bong) || 'Chưa cập nhật',
      detailNote: str(r.ghi_chu)
    });
  });

  // Thứ tự nhóm ngành theo sheet DanhMuc nếu có
  const order = danhmuc ? danhmuc.map((r) => str(r.nhom_nganh)).filter(Boolean) : [];
  categories.sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });

  return { UNIVERSITIES: universities, MAJORS_DATA: majors, CATEGORIES: ['Tất cả', ...categories], issues };
}
