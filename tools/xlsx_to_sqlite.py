"""Chuyển file Excel database (data/diem-chuan-2026.xlsx) thành SQLite (public/data/diem-chuan-2026.sqlite).

SQLite là dữ liệu gốc mà web đọc mặc định. Sửa dữ liệu trong Excel rồi chạy lại script này:

    python3 tools/xlsx_to_sqlite.py data/diem-chuan-2026.xlsx public/data/diem-chuan-2026.sqlite

Bảng trong SQLite giữ đúng tên cột của các sheet Excel (Truong, Nganh, DanhMuc) để web dùng chung
một bộ kiểm tra dữ liệu cho cả hai nguồn.
"""
import os
import sqlite3
import sys
from datetime import datetime, timezone

from openpyxl import load_workbook

SRC = sys.argv[1] if len(sys.argv) > 1 else 'data/diem-chuan-2026.xlsx'
DST = sys.argv[2] if len(sys.argv) > 2 else 'public/data/diem-chuan-2026.sqlite'

# Kiểu dữ liệu cho các cột số; cột còn lại là TEXT
NUMERIC = {'tier', 'nguong_hsa', 'D01', 'D10', 'D15', 'C04', 'diem_chung', 'HSA'}
PRIMARY = {'truong': 'ma_truong', 'nganh': 'ma_nganh'}
SHEETS = {'Truong': 'truong', 'Nganh': 'nganh', 'DanhMuc': 'danhmuc'}


def rows_of(ws):
    it = ws.iter_rows(values_only=True)
    header = [h for h in next(it) if h]
    out = []
    for r in it:
        vals = list(r[: len(header)])
        if all(v is None or str(v).strip() == '' for v in vals):
            continue
        out.append(dict(zip(header, vals)))
    return header, out


def main():
    wb = load_workbook(SRC, data_only=True)
    os.makedirs(os.path.dirname(DST) or '.', exist_ok=True)
    tmp = DST + '.tmp'
    if os.path.exists(tmp):
        os.remove(tmp)
    con = sqlite3.connect(tmp)
    cur = con.cursor()
    counts = {}
    for sheet, table in SHEETS.items():
        header, rows = rows_of(wb[sheet])
        cols = []
        for h in header:
            typ = 'REAL' if h in NUMERIC else 'TEXT'
            pk = ' PRIMARY KEY' if PRIMARY.get(table) == h else ''
            cols.append(f'"{h}" {typ}{pk}')
        cur.execute(f'CREATE TABLE {table} ({", ".join(cols)})')
        for r in rows:
            vals = []
            for h in header:
                v = r.get(h)
                if isinstance(v, str):
                    v = v.strip() or None
                if h in NUMERIC and v is not None:
                    try:
                        v = float(str(v).replace(',', '.'))
                    except ValueError:
                        pass
                vals.append(v)
            cur.execute(f'INSERT INTO {table} VALUES ({", ".join("?" * len(header))})', vals)
        counts[table] = len(rows)
    cur.execute('CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT)')
    cur.executemany('INSERT INTO meta VALUES (?, ?)', [
        ('nguon_excel', os.path.basename(SRC)),
        ('tao_luc', datetime.now(timezone.utc).isoformat(timespec='seconds')),
        ('so_truong', str(counts['truong'])),
        ('so_nganh', str(counts['nganh'])),
    ])
    con.commit()
    con.execute('VACUUM')
    con.close()
    os.replace(tmp, DST)
    print(f'{DST}: {counts}')


if __name__ == '__main__':
    main()
