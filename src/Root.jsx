import React, { useEffect, useRef, useState } from 'react';
import { Database, Upload, AlertTriangle, CheckCircle2, RotateCcw, ChevronDown, FileSpreadsheet } from 'lucide-react';
import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import App from './App.jsx';
import { parseSqlite, parseWorkbook } from './loadData.js';

// Nguồn 1 (mặc định): file SQLite dữ liệu gốc đi kèm trang web.
const SQLITE_URL = `${import.meta.env.BASE_URL}data/diem-chuan-2026.sqlite`;

let sqlPromise = null;
const getSql = () => (sqlPromise ??= initSqlJs({ locateFile: () => wasmUrl }));

const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};

export default function Root() {
  const [state, setState] = useState({ status: 'loading' });
  const [showIssues, setShowIssues] = useState(false);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const loadSqlite = async () => {
    setState({ status: 'loading' });
    try {
      const [SQL, res] = await Promise.all([getSql(), fetch(SQLITE_URL, { cache: 'no-cache' })]);
      if (!res.ok) throw new Error(`Không tải được ${SQLITE_URL} (mã ${res.status}).`);
      const data = parseSqlite(SQL, new Uint8Array(await res.arrayBuffer()));
      setState({ status: 'ready', data, origin: 'sqlite', fileName: 'diem-chuan-2026.sqlite' });
      setShowIssues(false);
      setVersion((v) => v + 1);
    } catch (e) {
      setState({ status: 'error', message: e.message });
    }
  };

  useEffect(() => {
    loadSqlite();
  }, []);

  // Nguồn 2 (tùy chọn): người dùng tải file Excel của họ lên.
  // File chỉ được đọc trong bộ nhớ của trình duyệt; không ghi đè file Excel hay SQLite gốc, không gửi đi đâu.
  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      if (!/\.xlsx$/i.test(file.name)) throw new Error('chỉ hỗ trợ file .xlsx');
      const data = await parseWorkbook(file);
      setState({ status: 'ready', data, origin: 'excel', fileName: file.name });
      setShowIssues(data.issues.length > 0);
      setVersion((v) => v + 1);
    } catch (err) {
      setState((s) => ({ ...s, localError: `Không đọc được "${file.name}": ${err.message}` }));
    } finally {
      setBusy(false);
    }
  };

  const picker = (
    <input
      ref={fileRef}
      type="file"
      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      className="hidden"
      onChange={onPick}
    />
  );

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 text-sm gap-2">
        <Database className="w-5 h-5 text-indigo-600 animate-pulse" /> Đang tải dữ liệu điểm chuẩn…
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl p-6 space-y-3 text-sm">
          <div className="flex items-center gap-2 font-bold text-rose-700">
            <AlertTriangle className="w-5 h-5" /> Không tải được dữ liệu gốc
          </div>
          <p className="text-slate-600">{state.message}</p>
          <div className="flex gap-2">
            <button onClick={loadSqlite} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold">Thử lại</button>
            <button onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold">
              Dùng file Excel của bạn
            </button>
          </div>
          {picker}
        </div>
      </div>
    );
  }

  const { data, origin, fileName, localError } = state;
  const n = data.issues.length;
  const isExcel = origin === 'excel';

  const dataBar = (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm text-xs">
      <div className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2 min-w-0">
          {isExcel ? <FileSpreadsheet className="w-4 h-4 text-amber-600 shrink-0" /> : <Database className="w-4 h-4 text-indigo-600 shrink-0" />}
          <span className="text-slate-600 min-w-0">
            {isExcel ? 'Đang dùng file Excel của bạn: ' : 'Dữ liệu gốc (SQLite): '}
            <strong className="text-slate-900 break-all">{fileName}</strong>
            {isExcel && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">Chỉ trong trình duyệt này</span>}
            <span className="ml-1.5 text-slate-500">
              · {data.MAJORS_DATA.length} ngành · {data.UNIVERSITIES.length} trường
              {!isExcel && data.meta?.tao_luc && <> · cập nhật {fmtTime(data.meta.tao_luc)}</>}
            </span>
          </span>
        </div>
        <button
          onClick={() => n && setShowIssues(!showIssues)}
          className={`flex items-center gap-1 font-bold ${n ? 'text-amber-700' : 'text-emerald-700'}`}
        >
          {n ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {n ? `${n} vấn đề dữ liệu` : 'Dữ liệu hợp lệ'}
          {n > 0 && <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showIssues ? 'rotate-180' : ''}`} />}
        </button>
        <div className="flex items-center gap-2 ml-auto">
          {isExcel && (
            <button onClick={loadSqlite} className="px-2.5 py-1.5 rounded-lg border border-slate-200 font-medium text-slate-600 hover:bg-slate-100 flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" /> Về dữ liệu gốc
            </button>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 disabled:opacity-60 flex items-center gap-1"
            title="Đọc file .xlsx cùng cấu trúc (sheet Truong, Nganh, DanhMuc). File chỉ được đọc trong trình duyệt, không ghi đè dữ liệu gốc."
          >
            <Upload className="w-3.5 h-3.5" /> {busy ? 'Đang đọc…' : isExcel ? 'Đổi file Excel' : 'Dùng file Excel của bạn'}
          </button>
          {picker}
        </div>
      </div>
      {localError && <div className="px-4 pb-3 text-rose-700">{localError}</div>}
      {showIssues && n > 0 && (
        <div className="border-t border-slate-100 px-4 py-3 max-h-64 overflow-y-auto">
          <ul className="space-y-1">
            {data.issues.map((it, i) => (
              <li key={i} className="text-slate-700">
                <span className="font-mono text-slate-500">{isExcel ? `Sheet ${it.sheet}` : `Bảng ${it.sheet.toLowerCase()}`} dòng {it.line}</span> · {it.msg}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );

  return <App key={version} {...data} dataBar={dataBar} />;
}
