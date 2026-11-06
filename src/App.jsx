import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Scale,
  Calculator,
  Award,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  Sparkles,
  ArrowUpDown,
  X,
  Plus,
  Check,
  Layers,
  GraduationCap,
  ChevronRight,
  RotateCcw,
  DollarSign
} from 'lucide-react';


const BLOCKS = [
  { code: 'D01', name: 'Toán - Văn - Anh', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  { code: 'D10', name: 'Toán - Địa - Anh', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { code: 'D15', name: 'Văn - Địa - Anh', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  { code: 'C04', name: 'Toán - Văn - Địa', badge: 'bg-amber-50 text-amber-800 border-amber-200' }
];

export default function App({ UNIVERSITIES, MAJORS_DATA, CATEGORIES, dataBar = null }) {
  // States cho Bộ lọc
  const [selectedType, setSelectedType] = useState('ALL'); // 'ALL' | 'Công lập' | 'Tư thục' | 'Quốc tế & Liên kết'
  const [selectedTier, setSelectedTier] = useState('ALL'); // 'ALL' | '1' | '2' | '3'
  const [selectedUni, setSelectedUni] = useState('ALL');
  const [selectedBlocks, setSelectedBlocks] = useState(['D01', 'D10', 'D15', 'C04']);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [onlyHSA, setOnlyHSA] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPass, setSelectedPass] = useState('ALL'); // 'ALL' | 'safe' | 'match' | 'danger' | 'none'
  const [sortBy, setSortBy] = useState('tier-asc'); // 'tier-asc', 'score-desc', 'score-asc', 'hsa-desc'

  // States cho Máy tính điểm (Score Simulator)
  const [showSimulator, setShowSimulator] = useState(true);
  const [subjectScores, setSubjectScores] = useState({
    toan: 8.5,
    van: 8.5,
    anh: 9.0,
    dia: 8.75,
    priority: 0,
    hsa: 100
  });

  // States cho So sánh ngành
  const [compareList, setCompareList] = useState(() =>
    [
      ['AJC', 'Truyền thông đa phương tiện'],
      ['NEU', 'Kinh doanh quốc tế'],
      ['PTIT', 'Truyền thông đa phương tiện']
    ]
      .map(([u, n]) => MAJORS_DATA.find((x) => x.uniId === u && x.majorName === n)?.id)
      .filter(Boolean)
  );
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('majors'); // 'majors' | 'tiers-overview'

  // Tự động tính điểm 4 tổ hợp (Thang 30, Thang 40 Anh, Thang 40 Văn)
  const calculatedUserScores = useMemo(() => {
    const clamp = (val, max) => Math.min(Math.max(parseFloat(val) || 0, 0), max);
    const t = clamp(subjectScores.toan, 10);
    const v = clamp(subjectScores.van, 10);
    const a = clamp(subjectScores.anh, 10);
    const d = clamp(subjectScores.dia, 10);
    const p = clamp(subjectScores.priority, 2.75);

    // Quy chế tuyển sinh từ 2025: nếu tổng điểm (quy về thang 30) đạt từ 22.5 trở lên,
    // điểm ưu tiên thực = [(30 - tổng điểm) / 7.5] x mức ưu tiên.
    // Thang 40 quy đổi tương đương: ngưỡng 30, công thức [(40 - tổng) / 10] x (mức ưu tiên x 4/3).
    const withPriority = (raw, maxScale) => {
      const pMax = maxScale === 40 ? (p * 4) / 3 : p;
      const threshold = maxScale * 0.75;
      const pEff = raw >= threshold ? ((maxScale - raw) / (maxScale / 4)) * pMax : pMax;
      return +(raw + pEff).toFixed(2);
    };

    return {
      scale30: {
        D01: withPriority(t + v + a, 30),
        D10: withPriority(t + d + a, 30),
        D15: withPriority(v + d + a, 30),
        C04: withPriority(t + v + d, 30)
      },
      hsa: clamp(subjectScores.hsa, 150),
      // Điểm theo đề án: mỗi môn một hệ số (mặc định 1), quy về thang 30 hoặc 40:
      //   điểm = tổng (điểm môn x hệ số) x thang / (10 x tổng hệ số), rồi cộng điểm ưu tiên quy về cùng thang.
      // weights: danh sách các cách tính thay thế, VD [{toan: 2}, {van: 2}]; lấy cách có lợi nhất áp dụng được cho tổ hợp.
      weighted: (block, scale, weights = []) => {
        const subj = { D01: { toan: t, van: v, anh: a }, D10: { toan: t, dia: d, anh: a }, D15: { van: v, dia: d, anh: a }, C04: { toan: t, van: v, dia: d } }[block];
        if (!subj) return null;
        const calc = (w) => {
          let raw = 0, sumW = 0;
          Object.entries(subj).forEach(([k, x]) => { const k2 = w[k] ?? 1; raw += x * k2; sumW += k2; });
          return withPriority(+((raw * scale) / (10 * sumW)).toFixed(4), scale);
        };
        // chỉ dùng cách tính có môn nhân hệ số nằm trong tổ hợp; nếu không có cách nào hợp lệ thì cộng thường
        const usable = weights.filter((w) => Object.keys(w).every((k) => k in subj));
        if (!usable.length) return weights.length ? null : calc({});
        return Math.max(...usable.map(calc));
      }
    };
  }, [subjectScores]);

  // Đánh giá khả năng đỗ
  const STATUS_STYLE = {
    safe: { label: 'Đỗ an toàn', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', rank: 3 },
    match: { label: 'Cạnh tranh / Vừa sức', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200', rank: 2 },
    danger: { label: 'Thử thách cao', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200', rank: 1 },
    none: { label: 'Chưa đủ dữ liệu để đánh giá', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200', rank: 0 },
    unverified: { label: 'Chưa kiểm chứng', badgeClass: 'bg-slate-100 text-slate-500 border-dashed border-slate-300', rank: 0 }
  };

  // Đánh giá riêng THPT và HSA, kết luận lấy phương thức có lợi hơn
  const evaluateMajorStatus = (major) => {
    let bestDiff = null;
    let bestBlock = null;
    let userScoreForBest = 0;
    let cutoffForBest = 0;

    if (major.scale !== 'custom') {
      Object.entries(major.scores).forEach(([block, cutoff]) => {
        if (!selectedBlocks.includes(block)) return;
        const userScore = calculatedUserScores.weighted(block, major.scale, major.weights);
        if (userScore === null) return;

        const isScale40 = major.scale === 40;
        const normalizedDiff = isScale40 ? ((userScore - cutoff) * 3) / 4 : userScore - cutoff;
        if (bestDiff === null || normalizedDiff > bestDiff) {
          bestDiff = normalizedDiff;
          bestBlock = block;
          userScoreForBest = userScore;
          cutoffForBest = cutoff;
        }
      });
    }

    const hsaDiff = major.hsaScore ? +(calculatedUserScores.hsa - major.hsaScore).toFixed(2) : null;

    const thptStatus = bestDiff === null ? null : bestDiff >= 0.75 ? 'safe' : bestDiff >= -0.5 ? 'match' : 'danger';
    // Ngành có điểm chuẩn HSA thấp hơn ngưỡng nộp hồ sơ: đạt ngưỡng là đủ điểm (điểm quy đổi đã vượt điểm chuẩn), dưới ngưỡng là không đủ điều kiện
    const floored = major.hsaScore && major.hsaRaw !== null && major.hsaRaw < major.hsaScore;
    const hsaStatus =
      hsaDiff === null ? null : floored ? (hsaDiff >= 0 ? 'safe' : 'danger') : hsaDiff >= 4 ? 'safe' : hsaDiff >= -2 ? 'match' : 'danger';

    let status;
    let basis = null; // 'THPT' | 'HSA' | 'THPT & HSA'
    // Biên an toàn quy về thang 30 để so sánh và sắp xếp: HSA 150 điểm ~ 30 điểm THPT
    const thptMargin = bestDiff === null ? null : bestDiff;
    const hsaMargin = hsaDiff === null ? null : hsaDiff / 5;
    if (major.verify === 'unverified') status = 'unverified';
    else if (!thptStatus && !hsaStatus) status = 'none';
    else {
      const rT = thptStatus ? STATUS_STYLE[thptStatus].rank : -1;
      const rH = hsaStatus ? STATUS_STYLE[hsaStatus].rank : -1;
      if (rT > rH) { status = thptStatus; basis = 'THPT'; }
      else if (rH > rT) { status = hsaStatus; basis = 'HSA'; }
      else { status = thptStatus; basis = 'THPT & HSA'; }
    }
    const margin =
      basis === 'THPT' ? thptMargin : basis === 'HSA' ? hsaMargin : basis ? Math.max(thptMargin, hsaMargin) : null;
    const sortKey = STATUS_STYLE[status].rank * 1000 + (margin ?? -999);

    return {
      status,
      basis,
      margin,
      sortKey,
      ...STATUS_STYLE[status],
      thptStatus,
      hsaStatus,
      bestBlock,
      bestDiff: bestDiff === null ? 0 : +bestDiff.toFixed(2),
      rawDiff: +(userScoreForBest - cutoffForBest).toFixed(2),
      userScoreForBest,
      cutoffForBest,
      hsaDiff
    };
  };

  const toggleBlock = (code) => {
    if (selectedBlocks.includes(code)) {
      if (selectedBlocks.length > 1) {
        setSelectedBlocks(selectedBlocks.filter((b) => b !== code));
      }
    } else {
      setSelectedBlocks([...selectedBlocks, code]);
    }
  };

  const toggleCompare = (majorId) => {
    if (compareList.includes(majorId)) {
      setCompareList(compareList.filter((id) => id !== majorId));
    } else {
      if (compareList.length < 5) {
        setCompareList([...compareList, majorId]);
      }
    }
  };

  // Bộ lọc liên kết: mỗi tiêu chí là một "facet"; danh sách lựa chọn của một facet
  // được tính từ dữ liệu đã lọc theo TẤT CẢ các facet còn lại.
  const matches = (item, skip = null) => {
    if (skip !== 'type' && selectedType !== 'ALL' && item.type !== selectedType) return false;
    if (skip !== 'tier' && selectedTier !== 'ALL' && item.tier !== Number(selectedTier)) return false;
    if (skip !== 'uni' && selectedUni !== 'ALL' && item.uniId !== selectedUni) return false;
    if (skip !== 'cat' && selectedCategory !== 'Tất cả' && item.category !== selectedCategory) return false;
    if (skip !== 'hsa' && onlyHSA && !item.hsaScore) return false;
    if (skip !== 'pass' && selectedPass !== 'ALL') {
      const st = evaluateMajorStatus(item).status;
      if ((st === 'unverified' ? 'none' : st) !== selectedPass) return false;
    }
    if (skip !== 'verified' && onlyVerified && item.verify === 'unverified') return false;
    if (skip !== 'blocks') {
      const blockKeys = Object.keys(item.scores);
      // Ngành chưa xác nhận tổ hợp vẫn hiển thị, không lọc theo tổ hợp
      if (blockKeys.length > 0 && !blockKeys.some((b) => selectedBlocks.includes(b))) return false;
    }
    if (skip !== 'search' && searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const hit =
        item.majorName.toLowerCase().includes(q) ||
        item.uniName.toLowerCase().includes(q) ||
        item.uniId.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  };

  const facets = useMemo(() => {
    const count = (skip, keyFn) => {
      const c = {};
      MAJORS_DATA.forEach((m) => {
        if (!matches(m, skip)) return;
        [].concat(keyFn(m)).forEach((k) => (c[k] = (c[k] || 0) + 1));
      });
      return c;
    };
    return {
      type: count('type', (m) => m.type),
      tier: count('tier', (m) => String(m.tier)),
      uni: count('uni', (m) => m.uniId),
      cat: count('cat', (m) => m.category),
      blocks: count('blocks', (m) => Object.keys(m.scores)),
      hsa: count('hsa', (m) => (m.hsaScore ? 'yes' : 'no')).yes || 0,
      pass: count('pass', (m) => {
        const st = evaluateMajorStatus(m).status;
        return st === 'unverified' ? 'none' : st;
      })
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, selectedTier, selectedUni, selectedBlocks, selectedCategory, onlyHSA, onlyVerified, searchQuery, selectedPass, calculatedUserScores, MAJORS_DATA]);

  const facetTotal = (obj) => Object.values(obj).reduce((x, y) => x + y, 0);
  const typeOptions = ['Công lập', 'Tư thục', 'Quốc tế & Liên kết'].filter((t) => facets.type[t] || selectedType === t);
  const tierOptions = ['1', '2', '3'].filter((t) => facets.tier[t] || selectedTier === t);
  const uniOptions = UNIVERSITIES.filter((u) => facets.uni[u.id] || selectedUni === u.id);
  const catOptions = CATEGORIES.filter((c) => c === 'Tất cả' || facets.cat[c] || selectedCategory === c);

  // Khi lựa chọn hiện tại không còn ngành nào khớp với các bộ lọc khác, tự trả về "Tất cả"
  React.useEffect(() => {
    if (selectedUni !== 'ALL' && !facets.uni[selectedUni]) setSelectedUni('ALL');
    if (selectedType !== 'ALL' && !facets.type[selectedType]) setSelectedType('ALL');
    if (selectedTier !== 'ALL' && !facets.tier[selectedTier]) setSelectedTier('ALL');
    if (selectedCategory !== 'Tất cả' && !facets.cat[selectedCategory]) setSelectedCategory('Tất cả');
    if (selectedPass !== 'ALL' && !facets.pass[selectedPass]) setSelectedPass('ALL');
  }, [facets]);

  // Lọc ngành
  const filteredMajors = useMemo(() => {
    return MAJORS_DATA.filter((item) => matches(item)).sort((a, b) => {
      const getNormalizedScore = (m) => {
        const firstScore = Object.values(m.scores)[0] ?? m.baseScore ?? 0;
        if (m.scale === 'custom') return -1; // thang riêng, xếp cuối khi sắp theo điểm
        const isScale40 = m.scale === 40;
        return isScale40 ? (firstScore * 3) / 4 : firstScore;
      };

      if (sortBy === 'tier-asc') {
        if (a.tier !== b.tier) return a.tier - b.tier;
        return getNormalizedScore(b) - getNormalizedScore(a);
      }
      if (sortBy === 'score-desc') {
        return getNormalizedScore(b) - getNormalizedScore(a);
      }
      if (sortBy === 'score-asc') {
        return getNormalizedScore(a) - getNormalizedScore(b);
      }
      if (sortBy === 'pass-desc' || sortBy === 'pass-asc') {
        const d = evaluateMajorStatus(b).sortKey - evaluateMajorStatus(a).sortKey;
        if (d !== 0) return sortBy === 'pass-desc' ? d : -d;
        return a.tier - b.tier;
      }
      if (sortBy === 'hsa-desc') {
        return (b.hsaScore || 0) - (a.hsaScore || 0);
      }
      return 0;
    });
  }, [selectedType, selectedTier, selectedUni, selectedBlocks, selectedCategory, onlyHSA, onlyVerified, searchQuery, sortBy, selectedPass, calculatedUserScores]);

  const comparedMajorsData = useMemo(() => {
    return compareList.map((id) => MAJORS_DATA.find((m) => m.id === id)).filter(Boolean);
  }, [compareList]);

  React.useEffect(() => {
    if (!isCompareModalOpen) return;
    const onKey = (e) => e.key === 'Escape' && setIsCompareModalOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isCompareModalOpen]);

  const resetFilters = () => {
    setSelectedType('ALL');
    setSelectedTier('ALL');
    setSelectedUni('ALL');
    setSelectedBlocks(['D01', 'D10', 'D15', 'C04']);
    setSelectedCategory('Tất cả');
    setOnlyHSA(false);
    setOnlyVerified(false);
    setSearchQuery('');
    setSortBy('tier-asc');
    setSelectedPass('ALL');
  };

  const VERIFY_BADGE = {
    verified: { text: 'Đã kiểm chứng', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    partial: { text: 'Kiểm chứng một phần', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
    unverified: { text: 'Chưa kiểm chứng', cls: 'bg-slate-100 text-slate-500 border-dashed border-slate-300' }
  };
  const scaleLabel = (scale) =>
    scale === 'custom' ? 'Thang riêng' : null;
  const methodLabel = (m) =>
    m.scale === 'custom' ? 'Thang riêng' : `Thang ${m.scale}` + (m.weightLabel ? ` · ${m.weightLabel}` : '');
  const fmtDiff = (d) => (d > 0 ? `+${d}` : `${d}`);
  const diffColor = (st) =>
    st === 'safe' ? 'text-emerald-700' : st === 'match' ? 'text-amber-700' : st === 'danger' ? 'text-rose-700' : 'text-slate-500';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-28">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-slate-800 sticky z-30 shadow-md" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300 shrink-0">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                  Dashboard Điểm Chuẩn Đại Học Hà Nội 2026
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-medium">
                  Toán • Văn • Anh • Địa & HSA
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                {MAJORS_DATA.length} ngành · {UNIVERSITIES.length} trường · nguồn Tuyensinh247, cập nhật 06/11/2026
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
            <button
              onClick={() => setActiveTab('majors')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'majors'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              Tra cứu & Lọc ngành ({filteredMajors.length})
            </button>
            <button
              onClick={() => setActiveTab('tiers-overview')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'tiers-overview'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Layers className="w-4 h-4" />
              Tổng Quan Trường
            </button>
            <button
              onClick={() => setShowSimulator(!showSimulator)}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 border ${
                showSimulator
                  ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">Máy tính điểm</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {dataBar}
        {/* SCORE SIMULATOR (MÁY TÍNH ĐIỂM) */}
        {showSimulator && (
          <section className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-slate-50 px-5 py-3.5 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-slate-800 text-sm sm:text-base">
                  Mô phỏng Điểm Thi của Bạn (Tự động quy đổi D01, D10, D15, C04 cả Thang 30 & Thang 40)
                </h2>
              </div>
              <span className="text-xs text-slate-500">
                Nhập điểm dự kiến để hệ thống tự động so sánh độ an toàn với từng ngành bên dưới
              </span>
            </div>

            <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Điểm Toán</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="10"
                    value={subjectScores.toan}
                    onChange={(e) => setSubjectScores({ ...subjectScores, toan: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Điểm Ngữ văn</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="10"
                    value={subjectScores.van}
                    onChange={(e) => setSubjectScores({ ...subjectScores, van: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Điểm Tiếng Anh</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="10"
                    value={subjectScores.anh}
                    onChange={(e) => setSubjectScores({ ...subjectScores, anh: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Điểm Địa lí</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="10"
                    value={subjectScores.dia}
                    onChange={(e) => setSubjectScores({ ...subjectScores, dia: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Điểm Ưu tiên</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2.75"
                    value={subjectScores.priority}
                    onChange={(e) => setSubjectScores({ ...subjectScores, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-indigo-700 mb-1">Điểm HSA (/150)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="150"
                    value={subjectScores.hsa}
                    onChange={(e) => setSubjectScores({ ...subjectScores, hsa: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-indigo-300 bg-white text-indigo-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-bold text-sm"
                  />
                </div>
              </div>

              <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {BLOCKS.map((b) => (
                  <div key={b.code} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                        {b.code}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">{b.name}</span>
                    </div>
                    <div className="mt-2">
                      <div className="text-lg font-extrabold text-slate-900">
                        {calculatedUserScores.scale30[b.code]}
                        <span className="text-xs font-normal text-slate-500">/30</span>
                      </div>
                      <div className="mt-1 space-y-0.5 text-[11px] text-slate-600 border-t border-slate-200/80 pt-1">
                        {[
                          { label: 'Toán x2', scale: 30, w: [{ toan: 2 }], cls: 'text-indigo-700', tip: 'Toán hệ số 2, quy về thang 30 (VD: HV Ngân hàng, Thăng Long, ĐHSP)' },
                          { label: 'Văn x2', scale: 30, w: [{ van: 2 }], cls: 'text-amber-700', tip: 'Ngữ văn hệ số 2, quy về thang 30 (VD: ĐHSP, ngành Luật HV Ngân hàng)' },
                          { label: 'Văn x2', scale: 40, w: [{ van: 2 }], cls: 'text-amber-700', tip: 'Ngữ văn hệ số 2, thang 40 (VD: Báo chí, Xuất bản AJC)' },
                          { label: 'Toán+Anh x2', scale: 40, w: [{ toan: 2, anh: 2 }], cls: 'text-purple-700', tip: 'Toán và Ngoại ngữ hệ số 2, tổng 50 quy về thang 40 (ĐH Hà Nội)' }
                        ].map((o) => {
                          const val = calculatedUserScores.weighted(b.code, o.scale, o.w);
                          if (val === null) return null;
                          return (
                            <div key={o.label + o.scale} className="flex justify-between gap-1" title={o.tip}>
                              <span>{o.label}:</span>
                              <strong className={o.cls}>{val}/{o.scale}</strong>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* TAB TỔNG QUAN TRƯỜNG */}
        {activeTab === 'tiers-overview' && (
          <div className="space-y-6">
            {[
              {
                title: 'Nhóm Công lập Tier 1 (Hàng đầu)',
                subtitle: 'Ngoại thương, Ngoại giao, Ngoại ngữ ĐHQGHN, ĐH Hà Nội, Báo chí AJC, KHXH&NV, Bưu chính Viễn thông',
                headerBg: 'bg-gradient-to-r from-rose-600 to-indigo-700 text-white'
              },
              {
                title: 'Nhóm Công lập Tier 2 & Quốc tế Liên kết',
                subtitle: 'Kinh tế Quốc dân, Kinh tế ĐHQGHN, Tài chính, Thương mại, Sư phạm HN, Luật, Ngân hàng và các hệ Quốc tế (VNU-IS, FTU-INT, NEU-IBD, HANU-INT)',
                headerBg: 'bg-gradient-to-r from-slate-800 to-slate-700 text-white'
              },
              {
                title: 'Nhóm Tư thục & Công lập Tầm trung (Tier 3)',
                subtitle: 'Đại học Thăng Long, Phenikaa, CMC, Đại Nam, Phương Đông, Công đoàn, Văn hóa Hà Nội',
                headerBg: 'bg-gradient-to-r from-teal-700 to-emerald-700 text-white'
              }
            ].map((group, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className={`px-6 py-4 ${group.headerBg}`}>
                  <h3 className="text-base sm:text-lg font-bold">{group.title}</h3>
                  <p className="text-xs sm:text-sm opacity-90 mt-0.5">{group.subtitle}</p>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {UNIVERSITIES.filter((u) => {
                    if (idx === 0) return u.tier === 1 && u.type === 'Công lập';
                    if (idx === 1) return (u.tier === 2 && u.type === 'Công lập') || u.type === 'Quốc tế & Liên kết';
                    return u.tier === 3 || u.type === 'Tư thục';
                  }).map((uni) => {
                    const uniMajors = MAJORS_DATA.filter((m) => m.uniId === uni.id);
                    return (
                      <div key={uni.id} className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between bg-slate-50/50">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${uni.badge}`}>
                              {uni.id}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {uni.type}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base">{uni.fullName}</h4>
                          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{uni.note}</p>
                        </div>
                        {uniMajors.length > 0 ? (
                          <button
                            onClick={() => {
                              resetFilters();
                              setSelectedUni(uni.id);
                              setActiveTab('majors');
                            }}
                            className="mt-4 w-full py-2 px-3 rounded-lg bg-white border border-slate-300 hover:border-indigo-500 hover:text-indigo-600 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1 transition-colors"
                          >
                            Xem điểm chuẩn {uni.id} ({uniMajors.length} ngành)
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <div className="mt-4 w-full py-2 px-3 rounded-lg bg-slate-100 border border-dashed border-slate-300 text-xs font-medium text-slate-500 text-center">
                            Chưa có dữ liệu ngành
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB TRA CỨU NGÀNH */}
        {activeTab === 'majors' && (
          <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Ô tìm kiếm */}
              <div className="md:col-span-3 relative">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Tìm kiếm ngành hoặc trường
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="VD: PR, Logistics, FTU, Thăng Long..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Lọc theo Loại hình */}
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Loại hình đào tạo
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">Tất cả loại hình ({facetTotal(facets.type)})</option>
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t} ({facets.type[t] || 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Lọc theo Tier */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Nhóm trường
                </label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">Tất cả tier ({facetTotal(facets.tier)})</option>
                  {tierOptions.map((t) => (
                    <option key={t} value={t}>
                      Tier {t} ({facets.tier[t] || 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Lọc theo Trường cụ thể */}
              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Trường / Học viện
                </label>
                <select
                  value={selectedUni}
                  onChange={(e) => setSelectedUni(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">Tất cả {uniOptions.length} trường ({facetTotal(facets.uni)} ngành)</option>
                  {uniOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      [{u.id}] {u.name} · {facets.uni[u.id] || 0} ngành
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Hàng lọc tổ hợp & Sắp xếp */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 mr-1">Tổ hợp xét tuyển:</span>
                {BLOCKS.map((b) => {
                  const active = selectedBlocks.includes(b.code);
                  return (
                    <button
                      key={b.code}
                      onClick={() => toggleBlock(b.code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {active && <Check className="w-3.5 h-3.5" />}
                      {b.code}
                      <span className={`font-medium tabular-nums ${active ? 'text-indigo-100' : 'text-slate-400'}`}>{facets.blocks[b.code] || 0}</span>
                    </button>
                  );
                })}

                <button
                  onClick={() => setOnlyHSA(!onlyHSA)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    onlyHSA
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {onlyHSA && <Check className="w-3.5 h-3.5" />}
                  Có điểm HSA
                  <span className={`font-medium tabular-nums ${onlyHSA ? 'text-emerald-100' : 'text-slate-400'}`}>{facets.hsa}</span>
                </button>

                <button
                  onClick={() => setOnlyVerified(!onlyVerified)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    onlyVerified
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {onlyVerified && <Check className="w-3.5 h-3.5" />}
                  Ẩn số liệu chưa kiểm chứng
                </button>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-xs text-slate-800"
                  >
                    <option value="tier-asc">Ưu tiên Tier 1 → Tier 3</option>
                    <option value="score-desc">Điểm chuẩn THPT: Cao → Thấp</option>
                    <option value="score-asc">Điểm chuẩn THPT: Thấp → Cao</option>
                    <option value="hsa-desc">Điểm chuẩn HSA: Cao → Thấp</option>
                    <option value="pass-desc">Khả năng đỗ: Cao → Thấp</option>
                    <option value="pass-asc">Khả năng đỗ: Thấp → Cao</option>
                  </select>
                </div>
                <button
                  onClick={resetFilters}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Đặt lại
                </button>
              </div>
            </div>

            {/* Lọc theo khả năng đỗ */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 mr-1">Khả năng đỗ:</span>
              {[
                { v: 'ALL', label: 'Tất cả', on: 'bg-slate-900 text-white border-slate-900' },
                { v: 'safe', label: 'Đỗ an toàn', on: 'bg-emerald-600 text-white border-emerald-600', off: 'text-emerald-700' },
                { v: 'match', label: 'Cạnh tranh / Vừa sức', on: 'bg-amber-500 text-white border-amber-500', off: 'text-amber-800' },
                { v: 'danger', label: 'Thử thách cao', on: 'bg-rose-600 text-white border-rose-600', off: 'text-rose-700' },
                { v: 'none', label: 'Chưa đủ dữ liệu', on: 'bg-slate-500 text-white border-slate-500', off: 'text-slate-500' }
              ].map((o) => {
                const n = o.v === 'ALL' ? facetTotal(facets.pass) : facets.pass[o.v] || 0;
                const active = selectedPass === o.v;
                if (!n && !active && o.v !== 'ALL') return null;
                return (
                  <button
                    key={o.v}
                    onClick={() => setSelectedPass(o.v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      active ? o.on + ' shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50 ' + (o.off || 'text-slate-600')
                    }`}
                  >
                    {o.label}
                    <span className={`font-medium tabular-nums ${active ? 'text-white/80' : 'text-slate-400'}`}>{n}</span>
                  </button>
                );
              })}
              <span className="text-[11px] text-slate-400">Theo điểm bạn nhập ở trên, lấy kết quả tốt hơn giữa THPT và HSA</span>
            </div>

            {/* Nhóm ngành Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {catOptions.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}{' '}
                  <span className={`tabular-nums ${selectedCategory === cat ? 'text-slate-300' : 'text-slate-400'}`}>
                    {cat === 'Tất cả' ? facetTotal(facets.cat) : facets.cat[cat] || 0}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* DANH SÁCH NGÀNH (CARDS GRID) */}
        {activeTab === 'majors' && (
          filteredMajors.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <Search className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Không tìm thấy ngành phù hợp</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Hãy thử nới lỏng bộ lọc tổ hợp hoặc chọn lại loại hình đào tạo.
              </p>
              <button onClick={resetFilters} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700">
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMajors.map((major) => {
                const evalResult = evaluateMajorStatus(major);
                const isCompared = compareList.includes(major.id);
                const typeBadge =
                  major.type === 'Công lập'
                    ? 'bg-slate-900 text-white'
                    : major.type === 'Tư thục'
                    ? 'bg-teal-700 text-white'
                    : 'bg-indigo-600 text-white';

                return (
                  <div
                    key={major.id}
                    className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden ${
                      isCompared
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                        : 'border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div className="p-5 space-y-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${typeBadge}`}>
                            {major.type}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                            {major.uniId}
                          </span>
                          {(major.scale !== 30 || major.weightLabel) && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200" title="Cách tính điểm thi THPT theo đề án tuyển sinh 2026">
                              {methodLabel(major)}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${VERIFY_BADGE[major.verify].cls}`}>
                            {VERIFY_BADGE[major.verify].text}
                          </span>
                        </div>

                        <button
                          onClick={() => toggleCompare(major.id)}
                          disabled={!isCompared && compareList.length >= 5}
                          title={!isCompared && compareList.length >= 5 ? 'Tối đa 5 ngành trong bảng so sánh' : undefined}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                            isCompared
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'
                          }`}
                        >
                          {isCompared ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          {isCompared ? 'Đã chọn' : 'So sánh'}
                        </button>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {major.uniName}
                        </div>
                        <h3 className="font-bold text-slate-900 text-base mt-0.5 leading-snug">
                          {major.majorName}
                        </h3>
                        <span className="inline-block mt-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {major.category}
                        </span>
                      </div>

                      {/* Điểm chuẩn THPT */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                          <span>ĐIỂM CHUẨN THPT 2026</span>
                          {evalResult.bestBlock && (
                            <span className="text-indigo-600 font-bold">
                              Tối ưu: {evalResult.bestBlock} ({evalResult.rawDiff >= 0 ? `+${evalResult.rawDiff}` : evalResult.rawDiff})
                            </span>
                          )}
                        </div>
                        {Object.keys(major.scores).length === 0 && major.baseScore ? (
                          <div className="p-2 rounded-lg bg-white border border-slate-300 flex items-baseline justify-between gap-2">
                            <span className="text-[11px] text-slate-500">Điểm chung (tổ hợp chưa xác minh)</span>
                            <span className="text-base font-extrabold text-slate-900 tabular-nums">{major.baseScore.toFixed(2)}</span>
                          </div>
                        ) : (
                        <div className="grid grid-cols-4 gap-1.5">
                          {BLOCKS.map((b) => {
                            const score = major.scores[b.code];
                            const isSelected = selectedBlocks.includes(b.code);
                            return (
                              <div
                                key={b.code}
                                className={`p-2 rounded-lg text-center border ${
                                  score
                                    ? isSelected
                                      ? 'bg-white border-slate-300 shadow-sm'
                                      : 'bg-slate-100 border-slate-200 opacity-50'
                                    : 'bg-slate-100/60 border-dashed border-slate-200 text-slate-300'
                                }`}
                              >
                                <div className="text-[10px] font-bold text-slate-500">{b.code}</div>
                                <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                                  {score ? score.toFixed(2) : '—'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        )}
                      </div>

                      {/* Điểm chuẩn HSA */}
                      <div className="rounded-xl p-3 border border-indigo-200/70 bg-white flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-slate-500">ĐIỂM CHUẨN HSA (/150)</div>
                          {major.hsaScore ? (
                            <>
                              <div className="text-lg font-extrabold text-indigo-900 tabular-nums">
                                {major.hsaScore}
                                {major.hsaRaw !== major.hsaScore && (
                                  <span className="ml-1.5 text-[11px] font-semibold text-amber-700">ngưỡng tối thiểu</span>
                                )}
                              </div>
                              {major.hsaRaw !== major.hsaScore && (
                                <div className="text-[11px] text-slate-500 leading-snug">
                                  Nguồn ghi {major.hsaRaw}, thấp hơn ngưỡng nộp hồ sơ HSA ≥ {major.hsaFloor} của trường
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-xs text-slate-500 mt-0.5">{major.hsaNote || 'Trường không công bố điểm HSA cho ngành này'}</div>
                          )}
                        </div>
                        {evalResult.hsaDiff !== null && (
                          <div className="text-right shrink-0">
                            <div className="text-[11px] text-slate-500">Bạn: {calculatedUserScores.hsa}</div>
                            <div className={`text-sm font-bold tabular-nums ${diffColor(evalResult.hsaStatus)}`}>{fmtDiff(evalResult.hsaDiff)}</div>
                          </div>
                        )}
                      </div>

                      {/* Học phí & Học bổng */}
                      <div className="space-y-1.5 text-xs bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 flex items-center gap-1 font-medium">
                            <DollarSign className="w-3.5 h-3.5 text-indigo-600" /> Học phí (tham khảo):
                          </span>
                          <strong className="text-indigo-900">{major.tuitionNote}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 flex items-center gap-1 font-medium">
                            <Award className="w-3.5 h-3.5 text-emerald-600" /> Học bổng:
                          </span>
                          <strong className="text-emerald-800 truncate max-w-[170px]" title={major.scholarshipNote}>
                            {major.scholarshipNote}
                          </strong>
                        </div>
                      </div>

                      {major.detailNote && <p className="text-xs text-slate-500 leading-relaxed">{major.detailNote}</p>}
                      {major.verifyNote && (
                        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 leading-relaxed">
                          {major.verifyNote}
                        </p>
                      )}
                      {major.source && (
                        <a href={major.source.url} target="_blank" rel="noopener noreferrer" className="block text-[11px] text-indigo-700 hover:underline truncate">
                          Nguồn: {major.source.label}
                        </a>
                      )}
                    </div>

                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500 font-medium min-w-0">
                        Khả năng đỗ
                        {evalResult.basis && (
                          <span className="block text-[11px] text-slate-500 font-normal">
                            Theo{' '}
                            <strong className="font-bold text-slate-800">
                              {evalResult.basis === 'THPT'
                                ? `điểm thi THPT (${evalResult.bestBlock} ${fmtDiff(evalResult.rawDiff)})`
                                : evalResult.basis === 'HSA'
                                ? `điểm HSA (${fmtDiff(evalResult.hsaDiff)})`
                                : `THPT (${evalResult.bestBlock} ${fmtDiff(evalResult.rawDiff)}) và HSA (${fmtDiff(evalResult.hsaDiff)})`}
                            </strong>
                          </span>
                        )}
                        {evalResult.thptStatus && evalResult.hsaStatus && evalResult.basis !== 'THPT & HSA' && (
                          <span className="block text-[10px] text-slate-400">
                            {evalResult.basis === 'HSA' ? 'THPT' : 'HSA'}: {STATUS_STYLE[evalResult.basis === 'HSA' ? evalResult.thptStatus : evalResult.hsaStatus].label.toLowerCase()}
                          </span>
                        )}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${evalResult.badgeClass}`}>
                        {evalResult.status === 'safe' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {evalResult.status === 'match' && <AlertTriangle className="w-3.5 h-3.5" />}
                        {evalResult.status === 'danger' && <XCircle className="w-3.5 h-3.5" />}
                        {evalResult.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </main>

      {/* FLOATING COMPARISON BAR */}
      {compareList.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-md text-white border-t border-slate-700 shadow-2xl" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 shrink-0 mr-2">
                <Scale className="w-4 h-4" />
                <span>Bàn cân so sánh ({compareList.length}/5):</span>
              </div>
              {comparedMajorsData.map((m) => (
                <div key={m.id} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap">
                  <span className="font-bold text-amber-300">{m.uniId}</span>
                  <span className="text-slate-200 max-w-[130px] truncate">{m.majorName}</span>
                  <button onClick={() => toggleCompare(m.id)} className="text-slate-400 hover:text-white ml-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button onClick={() => setCompareList([])} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800">
                Xóa hết
              </button>
              <button
                onClick={() => setIsCompareModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs sm:text-sm font-bold shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Scale className="w-4 h-4" />
                Mở bảng so sánh ({compareList.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SO SÁNH */}
      {isCompareModalOpen && comparedMajorsData.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Scale className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base sm:text-lg">Bảng So Sánh Ngành Trực Tiếp (2026)</h3>
              </div>
              <button onClick={() => setIsCompareModalOpen(false)} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[720px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500 bg-slate-50 w-44">Tiêu chí</th>
                    {comparedMajorsData.map((m) => (
                      <th key={m.id} className="py-3 px-4 bg-slate-50 border-l border-slate-200 align-top">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                            {m.type} • {m.uniId}
                          </span>
                          <button onClick={() => toggleCompare(m.id)} className="text-slate-400 hover:text-rose-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="font-bold text-slate-900 text-sm">{m.majorName}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-700 bg-slate-50/60">Thang điểm</td>
                    {comparedMajorsData.map((m) => (
                      <td key={m.id} className="py-3 px-4 border-l border-slate-200 text-xs font-medium text-slate-700">
                        {methodLabel(m)}
                      </td>
                    ))}
                  </tr>
                  {BLOCKS.map((b) => (
                    <tr key={b.code}>
                      <td className="py-3 px-4 font-semibold text-slate-700 bg-slate-50/60">Khối {b.code}</td>
                      {comparedMajorsData.map((m) => {
                        const cutoff = m.scores[b.code];
                        return (
                          <td key={m.id} className="py-3 px-4 border-l border-slate-200">
                            {cutoff ? (
                              <span className="text-base font-extrabold text-slate-900 tabular-nums">{cutoff.toFixed(2)}</span>
                            ) : Object.keys(m.scores).length === 0 && m.baseScore ? (
                              <span className="text-xs text-slate-500 italic">Chưa rõ (điểm chung {m.baseScore.toFixed(2)})</span>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Không xét</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-700 bg-slate-50/60">Chênh lệch THPT của bạn</td>
                    {comparedMajorsData.map((m) => {
                      const ev = evaluateMajorStatus(m);
                      return (
                        <td key={m.id} className="py-3 px-4 border-l border-slate-200">
                          {ev.thptStatus ? (
                            <span className={`text-sm font-bold tabular-nums ${diffColor(ev.thptStatus)}`}>
                              {ev.bestBlock}: {ev.userScoreForBest} ({fmtDiff(ev.rawDiff)})
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Không so được</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="bg-indigo-50/40">
                    <td className="py-3 px-4 font-semibold text-indigo-900 bg-indigo-50/70">Điểm chuẩn HSA (/150)</td>
                    {comparedMajorsData.map((m) => (
                      <td key={m.id} className="py-3 px-4 border-l border-slate-200">
                        {m.hsaScore ? (
                          <span className="text-base font-extrabold text-indigo-900 tabular-nums">
                            {m.hsaScore}
                            {m.hsaRaw !== m.hsaScore && <span className="block text-[11px] font-medium text-amber-700">ngưỡng tối thiểu (nguồn ghi {m.hsaRaw})</span>}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 italic">{m.hsaNote || 'Không công bố'}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-indigo-50/40">
                    <td className="py-3 px-4 font-semibold text-indigo-900 bg-indigo-50/70">
                      Chênh lệch HSA của bạn
                      <span className="block text-[11px] font-normal text-slate-500">Điểm của bạn: {calculatedUserScores.hsa}</span>
                    </td>
                    {comparedMajorsData.map((m) => {
                      const ev = evaluateMajorStatus(m);
                      return (
                        <td key={m.id} className="py-3 px-4 border-l border-slate-200">
                          {ev.hsaDiff !== null ? (
                            <span className={`text-sm font-bold tabular-nums ${diffColor(ev.hsaStatus)}`}>{fmtDiff(ev.hsaDiff)}</span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-700 bg-slate-50/60">Học phí dự kiến</td>
                    {comparedMajorsData.map((m) => (
                      <td key={m.id} className="py-3 px-4 border-l border-slate-200 text-xs font-bold text-indigo-900">
                        {m.tuitionNote}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-700 bg-slate-50/60">Chính sách học bổng</td>
                    {comparedMajorsData.map((m) => (
                      <td key={m.id} className="py-3 px-4 border-l border-slate-200 text-xs text-emerald-800 font-medium">
                        {m.scholarshipNote}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-700 bg-slate-50/60">Đánh giá khả năng đỗ</td>
                    {comparedMajorsData.map((m) => {
                      const ev = evaluateMajorStatus(m);
                      return (
                        <td key={m.id} className="py-3 px-4 border-l border-slate-200">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${ev.badgeClass}`}>
                            {ev.label}
                          </span>
                          {ev.basis && <span className="block mt-1 text-[11px] text-slate-500">Theo {ev.basis === 'THPT' ? 'điểm thi THPT' : ev.basis === 'HSA' ? 'điểm HSA' : 'cả THPT và HSA'}</span>}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-700 bg-slate-50/60">Kiểm chứng dữ liệu</td>
                    {comparedMajorsData.map((m) => (
                      <td key={m.id} className="py-3 px-4 border-l border-slate-200 align-top">
                        <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded border ${VERIFY_BADGE[m.verify].cls}`}>
                          {VERIFY_BADGE[m.verify].text}
                        </span>
                        {m.verifyNote && <p className="mt-1 text-[11px] text-slate-500 leading-snug">{m.verifyNote}</p>}
                        {m.source && (
                          <a href={m.source.url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-[11px] text-indigo-700 hover:underline">
                            {m.source.label}
                          </a>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-bold hover:bg-slate-800"
              >
                Đóng bảng so sánh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
