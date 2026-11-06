# Ghép dữ liệu bóc tách từ diemthi.tuyensinh247.com vào sheet Nganh của file Excel database.
# Cách chạy: python3 tools/import_scrape.py <thư mục c*.json> <file xlsx>
import json, re, sys, glob, unicodedata
from openpyxl import load_workbook
from openpyxl.styles import Font, Border, Side, Alignment

SCR, XLSX = sys.argv[1], sys.argv[2]
SRC_URL = {
 'AJC':'hoc-vien-bao-chi-va-tuyen-truyen-HBT','FTU':'dai-hoc-ngoai-thuong-co-so-phia-bac-NTH','DAV':'hoc-vien-ngoai-giao-HQT',
 'ULIS':'dai-hoc-ngoai-ngu-ha-noi-QHF','HANU':'dai-hoc-ha-noi-NHF','USSH':'dai-hoc-khoa-hoc-xa-hoi-va-nhan-van-ha-noi-QHX',
 'PTIT':'hoc-vien-cong-nghe-buu-chinh-vien-thong-phia-bac-BVH','NEU':'dai-hoc-kinh-te-quoc-dan-KHA','UEB':'dai-hoc-kinh-te-ha-noi-QHE',
 'AOF':'hoc-vien-tai-chinh-HTC','TMU':'dai-hoc-thuong-mai-TMU','HNUE':'dai-hoc-su-pham-ha-noi-SPH','HLU':'dai-hoc-luat-ha-noi-LPH',
 'BA':'hoc-vien-ngan-hang-NHH','VNU-IS':'truong-quoc-te-dai-hoc-quoc-gia-ha-noi-QHQ','TLU':'dai-hoc-thang-long-DTL',
 'PKA':'dai-hoc-phenikaa-PKA','CMC':'dai-hoc-cmc-CMC','DNU':'dai-hoc-dai-nam-DDN','PDU':'dai-hoc-phuong-dong-DPD',
 'TUU':'dai-hoc-cong-doan-LDA','HUC':'dai-hoc-van-hoa-ha-noi-VHH'}
HAS_HSA_TABLE = {'FTU','ULIS','USSH','PTIT','NEU','UEB','TMU','VNU-IS','TLU','PKA','DNU','PDU'}
REMOVED_UNIS = {'FTU-INT','NEU-IBD','HANU-INT'}  # không có trang riêng trong danh sách nguồn
# NEU có 4 cặp chương trình trùng tên: (điểm THPT, HSA) theo thứ tự dòng trong bảng nguồn
NEU_DUP = {'Kinh tế quốc tế':[(28.3,117),(27.2,106)], 'Quản trị khách sạn':[(26.08,98),(25.05,92)],
           '(3) Quản trị kinh doanh':[(24.83,91),(25.25,93)], 'Thẩm định giá':[(24.1,87),(24.96,92)]}

def num(s):
    s = (s or '').strip()
    return float(s) if s else None

def norm(s):
    return re.sub(r'[^\w]+', ' ', unicodedata.normalize('NFC', s or '').lower()).strip()

def categorize(name):
    n = name.lower(); R = lambda p: re.search(p, n)
    if R(r'du lịch|khách sạn|lữ hành|nhà hàng|giải trí'): return 'Du lịch - Khách sạn'
    if R(r'sư phạm|giáo dục|người khuyết tật'): return 'Sư phạm'
    if R(r'^luật|^\(\d\) luật|luật (kinh|quốc|thương|học|hình|dân)'): return 'Luật'
    if R(r'truyền thông|báo chí|công chúng|xuất bản|quảng cáo|điện ảnh|thông tin đối ngoại'): return 'Báo chí - Truyền thông'
    if R(r'công nghệ thông tin|dữ liệu|trí tuệ nhân tạo|máy tính|đa phương tiện|game|phần mềm|an toàn thông tin|an ninh mạng|hệ thống thông tin|kỹ thuật|chip|vật liệu|toán tin|tin học|đồ họa|mỹ thuật số|kiến trúc|tự động hóa|văn hóa số'): return 'Công nghệ - Dữ liệu'
    if R(r'ngôn ngữ|^tiếng|tiếng .* thương mại|quốc tế học|quan hệ quốc tế|hoa kỳ học|trung quốc học|hàn quốc học|nhật bản học|đông phương|đông nam á|nghiên cứu phát triển|phát triển quốc tế|việt nam học'): return 'Ngôn ngữ - Quốc tế'
    if R(r'kinh tế|kinh doanh|tài chính|kế toán|kiểm toán|marketing|logistics|thương mại|khởi nghiệp|ngân hàng|nhân lực|công nghiệp|quản trị|bảo hiểm|thuế|đầu tư|bất động sản|thẩm định|thống kê|quản lý dự án|quản lý thị trường|quan hệ lao động|rủi ro|chuỗi cung ứng|hải quan|toán|xây dựng|bệnh viện|quản lý công|chính sách'): return 'Kinh tế - Kinh doanh - Logistics'
    return 'Khoa học xã hội - Nhân văn'

rows = []
for f in sorted(glob.glob(SCR + '/c*.json')):
    for line in json.load(open(f, encoding='utf-8')).split('\n'):
        p = line.split('\t'); p += [''] * (11 - len(p)); rows.append(p[:11])

recs, dropped = [], []
for (u, name, d01, d10, d15, c04, hsa, hsa_q, others, notes, conf) in rows:
    name = name.strip()
    sc = {k: num(v) for k, v in zip(['D01', 'D10', 'D15', 'C04'], [d01, d10, d15, c04])}
    if re.search(r'Cơ sở HCM|Cơ sở Quảng Ninh|Phân hiệu', name):
        dropped.append((u, name, 'Cơ sở/phân hiệu ngoài Hà Nội')); continue
    if re.search(r'Tổ hợp gốc: \(Toán, (Lý|Lí),', notes):
        dropped.append((u, name, 'Chỉ xét Toán + Lý/Hóa + 1 môn, không thuộc 4 tổ hợp')); continue
    if u == 'NEU' and name in NEU_DUP:
        for j, (s, h) in enumerate(NEU_DUP[name], 1):
            recs.append(dict(u=u, name=f'{name} (chương trình thứ {j} cùng tên)', scale='30', sc={'D01': s}, hsa=h, hsa_note=None,
                status='Một phần', vnote='Bảng nguồn có 2 chương trình cùng tên, không ghi mã ngành; tách theo thứ tự dòng trong bảng THPT và HSA.',
                note=None))
        continue
    scale, status, vnote = '30', 'Đã kiểm chứng', None
    nts = [x for x in notes.split(' / ') if x]
    if 'Ngữ Văn hệ số 2' in nts:
        scale = '40 Văn x2'; nts = [x for x in nts if x != 'Ngữ Văn hệ số 2']
    elif u == 'HANU':
        # Theo thông tin tuyển sinh 2026 của ĐH Hà Nội: Ngoại ngữ x2 và Toán hoặc Ngữ văn x2, tổng 50 quy về thang 40
        scale = '40 (tổng 50 quy đổi)'; nts = [x for x in nts if x != 'Thang điểm 40']
        mon = 'Ngữ văn + Ngoại ngữ' if name.startswith(('Nghiên cứu phát triển', 'Quốc tế học', 'Quan hệ quốc tế')) else 'Toán + Ngoại ngữ'
        nts = [f"Cách tính HANU 2026: Ngoại ngữ x2 và {mon.split(' + ')[0]} x2, tổng 3 môn tối đa 50 điểm quy về thang 40 (x0.8). Một mức điểm trúng tuyển cho mọi tổ hợp của ngành."] + nts
        vnote = 'Điểm chuẩn: Tuyensinh247. Cách tính hệ số: thông tin tuyển sinh 2026 của ĐH Hà Nội (https://www.hanu.vn/a/254611/Thong-tin-tuyen-sinh-dai-hoc-hinh-thuc-chinh-quy-nam-2026).'
    elif u == 'CMC' or (u == 'FTU' and max(v for v in sc.values() if v is not None) > 30):
        scale = 'Riêng'; nts = [x for x in nts if x != 'Thang 40 điểm'] + ['Thang 40 theo cách tính riêng của trường']
    hsa_v = num(hsa)
    if hsa_q: hsa_note = 'Nguồn chỉ có điểm HSA ' + hsa_q
    elif hsa_v is None: hsa_note = 'Trường không có bảng điểm HSA trên nguồn' if u not in HAS_HSA_TABLE else 'Ngành không có trong bảng HSA của nguồn'
    else: hsa_note = None
    note = ' / '.join(([f'Tổ hợp khác: {others}'] if others else []) + nts) or None
    recs.append(dict(u=u, name=name, scale=scale, sc=sc, hsa=hsa_v, hsa_note=hsa_note, status=status, vnote=vnote, note=note,
                     mon=mon if u == 'HANU' else None))

wb = load_workbook(XLSX)
ws = wb['Nganh']
hdr = [c.value for c in ws[1]]; ix = {h: i for i, h in enumerate(hdr)}
old = [r for r in ws.iter_rows(min_row=2, values_only=True) if r[0]]
fee_name, fee_uni = {}, {}
for r in old:
    key = (r[ix['ma_truong']], norm(r[ix['ten_nganh']]))
    if r[ix['hoc_phi']] or r[ix['hoc_bong']]:
        fee_name[key] = (r[ix['hoc_phi']], r[ix['hoc_bong']])
        fee_uni.setdefault(r[ix['ma_truong']], (r[ix['hoc_phi']], None))
old_count = len(old)

ws.delete_rows(2, ws.max_row)
order = [r[0] for r in wb['Truong'].iter_rows(min_row=2, values_only=True) if r[0] and r[0] not in REMOVED_UNIS]
recs.sort(key=lambda r: order.index(r['u']))
cnt = {}
font = Font(name='Arial', size=10); thin = Border(bottom=Side(style='thin', color='CBD5E1'))
for r in recs:
    u = r['u']; cnt[u] = cnt.get(u, 0) + 1
    fee, sch = fee_name.get((u, norm(r['name'])), fee_uni.get(u, (None, None)))
    ws.append([f'{u}-{cnt[u]:03d}', u, r['name'], categorize(r['name']), r['scale'],
               r['sc'].get('D01'), r['sc'].get('D10'), r['sc'].get('D15'), r['sc'].get('C04'), None,
               r['hsa'], r['hsa_note'], r['status'], r['vnote'], fee, sch, r['note'],
               'Tuyensinh247 – bảng điểm chuẩn 2026', f'https://diemthi.tuyensinh247.com/diem-chuan/{SRC_URL[u]}.html',
               r.get('mon')])
for row in ws.iter_rows(min_row=2, max_row=ws.max_row):
    for c in row:
        c.font = font; c.border = thin
        if 6 <= c.column <= 11: c.number_format = '0.00' if c.column < 11 else '0.##'; c.alignment = Alignment(horizontal='center')
ws.auto_filter.ref = f'A1:S{ws.max_row}'

# Bỏ 3 chương trình liên kết không có trang riêng trên nguồn
wt = wb['Truong']
for i in range(wt.max_row, 1, -1):
    if wt.cell(i, 1).value in REMOVED_UNIS: wt.delete_rows(i)

wb.save(XLSX)
by_uni = {}
for r in recs: by_uni[r['u']] = by_uni.get(r['u'], 0) + 1
json.dump({'old_rows': old_count, 'new_rows': len(recs), 'by_uni': by_uni, 'dropped': dropped},
          open(SCR + '/import_report.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(old_count, '->', len(recs)); print(by_uni); print(len(dropped), 'dropped')
