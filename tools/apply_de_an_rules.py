# Áp quy tắc tính điểm thi THPT theo ĐỀ ÁN TUYỂN SINH 2026 vào sheet Nganh (cột thang_diem, he_so_mon)
# và ghi nguồn đề án vào sheet Truong. Chạy sau tools/import_scrape.py.
# Cách chạy: python3 tools/apply_de_an_rules.py diem-chuan-2026.xlsx
import sys, re
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.datavalidation import DataValidation

XLSX = sys.argv[1]
DEAN = 'https://diemthi.tuyensinh247.com/de-an-tuyen-sinh/'
SLUG = {
 'AJC':'hoc-vien-bao-chi-va-tuyen-truyen-HBT','FTU':'dai-hoc-ngoai-thuong-co-so-phia-bac-NTH','DAV':'hoc-vien-ngoai-giao-HQT',
 'ULIS':'dai-hoc-ngoai-ngu-ha-noi-QHF','HANU':'dai-hoc-ha-noi-NHF','USSH':'dai-hoc-khoa-hoc-xa-hoi-va-nhan-van-ha-noi-QHX',
 'PTIT':'hoc-vien-cong-nghe-buu-chinh-vien-thong-phia-bac-BVH','NEU':'dai-hoc-kinh-te-quoc-dan-KHA','UEB':'dai-hoc-kinh-te-ha-noi-QHE',
 'AOF':'hoc-vien-tai-chinh-HTC','TMU':'dai-hoc-thuong-mai-TMU','HNUE':'dai-hoc-su-pham-ha-noi-SPH','HLU':'dai-hoc-luat-ha-noi-LPH',
 'BA':'hoc-vien-ngan-hang-NHH','VNU-IS':'truong-quoc-te-dai-hoc-quoc-gia-ha-noi-QHQ','TLU':'dai-hoc-thang-long-DTL',
 'PKA':'dai-hoc-phenikaa-PKA','CMC':'dai-hoc-cmc-CMC','DNU':'dai-hoc-dai-nam-DDN','PDU':'dai-hoc-phuong-dong-DPD',
 'TUU':'dai-hoc-cong-doan-LDA','HUC':'dai-hoc-van-hoa-ha-noi-VHH'}

# Tóm tắt cách tính điểm thi THPT 2026 của từng trường (đọc từ đề án; [PDF] = đã đối chiếu file PDF đề án gốc)
CACH_TINH = {
 'AJC':  'Nhóm 1 (Báo chí, Xuất bản): Ngữ văn x2, thang 40, điểm ưu tiên x4/3. Nhóm 2, 3, 4: tổng 3 môn, thang 30. [PDF]',
 'FTU':  'Chương trình tiêu chuẩn, ĐHNN&PTQT: tổng 3 môn, thang 30. CT tích hợp KHMT, AI, KHDL: Toán x2 (thang 40). CT tích hợp Ngôn ngữ thương mại: Toán + Ngữ văn x1,5 + Ngoại ngữ x1,5 (thang 40). [PDF]',
 'HANU': 'Ngoại ngữ x2 và Toán hoặc Ngữ văn x2 tùy ngành; tổng tối đa 50 quy về thang 40. Một mức điểm cho mọi tổ hợp.',
 'BA':   '(Môn chính x2 + Môn 2 + Môn 3) x 3/4, thang 30. Môn chính: Toán; ngành Luật: Ngữ văn. [PDF]',
 'HNUE': 'Thang chung 30. Ngành có môn hệ số 2 (Ngữ văn hoặc Toán) được chuyển về thang 30; điểm các tổ hợp, phương thức được quy đổi tương đương về thang chung.',
 'TLU':  'Tổng 3 môn, thang 30. Ngành KHMT, HTTT, CNTT, AI: Toán hệ số 2, (M1x2 + M2 + M3) x 3/4. [PDF]',
 'CMC':  'Thang 40: Toán x2 + 2 môn bất kỳ, hoặc Ngữ văn x2 + 2 môn bất kỳ. Các ngành Máy tính và CNTT: chỉ Toán x2. [PDF]',
 'USSH': 'Tổng 3 môn, thang 30, có độ chênh lệch giữa các tổ hợp. (Phần chữ trên Tuyensinh247 ghi môn 3 x2 nhưng PDF đề án gốc ghi tổng 3 môn không nhân hệ số.) [PDF]',
 'ULIS': 'Tổng 3 môn, thang 30 (chỉ phương thức kết hợp chứng chỉ mới nhân đôi ngoại ngữ).',
 'NEU':  'Tổng 3 môn, thang 30.', 'UEB': 'Tổng 3 môn, thang 30.', 'DAV': 'Tổng 3 môn, thang 30; C00 cao hơn 1,5.',
 'PTIT': 'Tổng 3 môn, thang 30.', 'TMU': 'Tổng 3 môn, thang 30.', 'AOF': 'Tổng 3 môn, thang 30.', 'HLU': 'Tổng 3 môn, thang 30.',
 'PKA':  'Tổng 3 môn, thang 30.', 'PDU': 'Tổng 3 môn, thang 30, không nhân hệ số, chênh lệch giữa các tổ hợp bằng 0.',
 'DNU':  'Tổng 3 môn, thang 30.', 'TUU': 'Tổng 3 môn, thang 30.', 'HUC': 'Tổng 3 môn, thang 30.', 'VNU-IS': 'Tổng 3 môn, thang 30.'}

HNUE_VAN = ('Giáo dục học', 'Giáo dục đặc biệt', 'Sư phạm Ngữ văn', 'Văn học', 'Tâm lý học', 'Hỗ trợ giáo dục người khuyết tật')
CMC_ICT = ('Trí tuệ Nhân tạo', 'Khoa học Máy tính', 'Công nghệ Thông tin', 'An ninh Mạng', 'Kỹ thuật Phần mềm')
TLU_TOAN = ('Khoa học máy tính', 'Hệ thống thông tin', 'Công nghệ thông tin', 'Trí tuệ nhân tạo')

def rule(u, name, note):
    """Trả về (thang_diem, he_so_mon) theo đề án 2026."""
    if u == 'AJC':
        return ('40', 'Ngữ văn x2') if name.startswith(('Báo chí', 'Xuất bản')) else ('30', None)
    if u == 'FTU':
        if re.match(r'CT TH (Trí tuệ nhân tạo|Khoa học dữ liệu|Khoa học máy tính)', name): return ('40', 'Toán x2')
        if re.match(r'CT TH Tiếng .* thương mại', name): return ('40', 'Ngữ văn x1.5 + Ngoại ngữ x1.5')
        return ('30', None)
    if u == 'HANU':
        van = name.startswith(('Nghiên cứu phát triển', 'Quốc tế học', 'Quan hệ quốc tế'))
        return ('40', 'Ngữ văn x2 + Ngoại ngữ x2' if van else 'Toán x2 + Ngoại ngữ x2')
    if u == 'BA':
        return ('30', 'Ngữ văn x2' if 'Môn chính: Văn' in (note or '') else 'Toán x2')
    if u == 'HNUE':
        if name.startswith('Sư phạm Toán'): return ('30', 'Toán x2')
        if name.startswith(HNUE_VAN): return ('30', 'Ngữ văn x2')
        return ('30', None)
    if u == 'TLU':
        return ('30', 'Toán x2') if name in TLU_TOAN else ('30', None)
    if u == 'CMC':
        return ('40', 'Toán x2') if name in CMC_ICT else ('40', 'Toán x2 | Ngữ văn x2')
    return ('30', None)

wb = load_workbook(XLSX)
ws, wt, dm, wh = wb['Nganh'], wb['Truong'], wb['DanhMuc'], wb['HuongDan']
F = 'Arial'; body = Font(name=F, size=10); hdr_font = Font(name=F, bold=True, color='FFFFFF', size=10); hdr_fill = PatternFill('solid', fgColor='1E293B')

# --- Nganh: đổi tên cột mon_he_so_2 -> he_so_mon
hdr = [c.value for c in ws[1]]
if 'mon_he_so_2' in hdr: ws.cell(1, hdr.index('mon_he_so_2') + 1).value = 'he_so_mon'
hdr = [c.value for c in ws[1]]
if 'he_so_mon' not in hdr:
    c = ws.cell(1, len(hdr) + 1, 'he_so_mon'); c.font = hdr_font; c.fill = hdr_fill; hdr.append('he_so_mon')
ix = {h: i + 1 for i, h in enumerate(hdr)}
ws.column_dimensions[ws.cell(1, ix['he_so_mon']).column_letter].width = 30
counts = {}
for r in range(2, ws.max_row + 1):
    u = ws.cell(r, ix['ma_truong']).value
    if not u: continue
    name = ws.cell(r, ix['ten_nganh']).value or ''
    thang, hs = rule(u, name, ws.cell(r, ix['ghi_chu']).value)
    ws.cell(r, ix['thang_diem']).value = thang
    ws.cell(r, ix['he_so_mon']).value = hs
    ws.cell(r, ix['he_so_mon']).font = body
    if hs: counts[u] = counts.get(u, 0) + 1
    # ghi chú: bỏ dòng cách tính cũ, thêm nguồn đề án cho dòng có hệ số
    note = ws.cell(r, ix['ghi_chu']).value or ''
    parts = [p for p in note.split(' / ') if p and not p.startswith(('Cách tính HANU', 'Thang 40 theo cách tính riêng', 'Cách tính theo đề án'))]
    if hs: parts.insert(0, f'Cách tính theo đề án 2026: {hs}, thang {thang}')
    ws.cell(r, ix['ghi_chu']).value = ' / '.join(parts) or None
    vn = ws.cell(r, ix['ghi_chu_kiem_chung']).value or ''
    if hs:
        vn = re.sub(r'Cách tính hệ số:.*', '', vn).strip()
        vn = (vn + ' ' if vn else 'Điểm chuẩn: Tuyensinh247. ') + f'Cách tính hệ số: đề án tuyển sinh 2026 ({DEAN}{SLUG[u]}.html).'
        ws.cell(r, ix['ghi_chu_kiem_chung']).value = vn.strip()

# --- Validation
for dv in ws.data_validations.dataValidation:
    s = str(dv.sqref)
    if s.startswith('E2'): dv.formula1 = 'DanhMuc!$A$2:$A$4'
    if s.startswith('T2'): dv.formula1 = None
ws.data_validations.dataValidation = [dv for dv in ws.data_validations.dataValidation if dv.formula1]
L = ws.cell(1, ix['he_so_mon']).column_letter
dv = DataValidation(type='list', formula1=f'DanhMuc!$F$2:$F$9', allow_blank=True, showErrorMessage=False)
ws.add_data_validation(dv); dv.add(f'{L}2:{L}2000')

# --- DanhMuc: thang_diem chỉ còn 30 / 40 / Riêng; thêm danh sách gợi ý he_so_mon ở cột F
for r in range(2, 12): dm.cell(r, 1).value = None
for i, v in enumerate(['30', '40', 'Riêng'], 2): dm.cell(i, 1, v).font = body
dm.cell(1, 6, 'he_so_mon (gợi ý)').font = hdr_font; dm.cell(1, 6).fill = hdr_fill; dm.column_dimensions['F'].width = 34
for i, v in enumerate(['Toán x2', 'Ngữ văn x2', 'Ngoại ngữ x2', 'Toán x2 + Ngoại ngữ x2', 'Ngữ văn x2 + Ngoại ngữ x2',
                       'Ngữ văn x1.5 + Ngoại ngữ x1.5', 'Toán x2 | Ngữ văn x2'], 2):
    dm.cell(i, 6, v).font = body

# --- Truong: thêm cột cách tính và link đề án
th = [c.value for c in wt[1]]
for col in ('cach_tinh_thpt_2026', 'de_an_2026_url'):
    if col not in th:
        c = wt.cell(1, len(th) + 1, col); c.font = hdr_font; c.fill = hdr_fill; th.append(col)
tx = {h: i + 1 for i, h in enumerate(th)}
wt.column_dimensions[wt.cell(1, tx['cach_tinh_thpt_2026']).column_letter].width = 80
wt.column_dimensions[wt.cell(1, tx['de_an_2026_url']).column_letter].width = 60
for r in range(2, wt.max_row + 1):
    u = wt.cell(r, 1).value
    if u in CACH_TINH:
        wt.cell(r, tx['cach_tinh_thpt_2026'], CACH_TINH[u]).font = body
        wt.cell(r, tx['cach_tinh_thpt_2026']).alignment = Alignment(wrap_text=True, vertical='top')
        wt.cell(r, tx['de_an_2026_url'], f'{DEAN}{SLUG[u]}.html').font = body

# --- HuongDan
for row in wh.iter_rows():
    if row[0].value == 'thang_diem':
        row[1].value = '30 | 40 | Riêng. Thang điểm mà trường công bố điểm chuẩn. "Riêng": trang không tự đánh giá khả năng đỗ.'
    if row[0].value in ('mon_he_so_2', 'he_so_mon'):
        row[0].value = 'he_so_mon'
        row[1].value = ('Môn nhân hệ số theo đề án, để trống nếu cộng 3 môn bình thường. Viết "Môn xHệ số", nối bằng dấu +, '
                        'VD: "Toán x2", "Ngữ văn x1.5 + Ngoại ngữ x1.5", "Toán x2 + Ngoại ngữ x2". Nếu thí sinh được chọn một trong hai cách, '
                        'nối bằng dấu |, VD: "Toán x2 | Ngữ văn x2". Điểm được quy về thang ở cột thang_diem: '
                        'tổng có hệ số x thang / (10 x tổng hệ số). Ngoại ngữ được tính là Tiếng Anh trong D01, D10, D15.')
# --- Ngưỡng HSA tối thiểu (điều kiện nộp hồ sơ) theo đề án 2026
NGUONG_HSA = {'FTU': 100, 'NEU': 85, 'TMU': 80, 'PTIT': 75, 'PDU': 50}
th = [c.value for c in wt[1]]
if 'nguong_hsa' not in th:
    c = wt.cell(1, len(th) + 1, 'nguong_hsa'); c.font = hdr_font; c.fill = hdr_fill; th.append('nguong_hsa')
tx = {h: i + 1 for i, h in enumerate(th)}
wt.column_dimensions[wt.cell(1, tx['nguong_hsa']).column_letter].width = 12
for r in range(2, wt.max_row + 1):
    u = wt.cell(r, 1).value
    wt.cell(r, tx['nguong_hsa']).value = NGUONG_HSA.get(u)
    wt.cell(r, tx['nguong_hsa']).font = body
# FTU: công thức quy đổi HSA và giải thích các số dưới ngưỡng
low = 0
for r in range(2, ws.max_row + 1):
    if ws.cell(r, ix['ma_truong']).value != 'FTU': continue
    hsa = ws.cell(r, ix['HSA']).value
    thang = ws.cell(r, ix['thang_diem']).value
    f = '[27 + (HSA − 100) × 3/50] × 4/3 (thang 40)' if thang == '40' else '27 + (HSA − 100) × 3/50 (thang 30)'
    note = f'Ngưỡng nộp hồ sơ HSA ≥ 100. Điểm HSA quy đổi = {f}, xét chung một điểm chuẩn với các phương thức khác.'
    if isinstance(hsa, (int, float)) and hsa < 100:
        note += f' Nguồn ghi {hsa:g} là điểm chuẩn tính ngược theo công thức, thấp hơn ngưỡng nên mức HSA thực tế cần đạt là 100.'
        low += 1
    ws.cell(r, ix['ghi_chu_HSA']).value = note

# --- HuongDan: mô tả cột nguong_hsa
labels = [r[0].value for r in wh.iter_rows()]
if 'nguong_hsa (sheet Truong)' not in labels:
    i = labels.index('he_so_mon') + 2
    wh.insert_rows(i)
    wh.cell(i, 1, 'nguong_hsa (sheet Truong)').font = Font(name=F, bold=True, size=10)
    wh.cell(i, 2, 'Điểm HSA tối thiểu để nộp hồ sơ theo đề án. Nếu điểm HSA của một ngành thấp hơn ngưỡng (do nguồn tính ngược từ điểm chuẩn), trang dùng ngưỡng làm điểm HSA cần đạt.').font = body
    for c in (wh.cell(i, 1), wh.cell(i, 2)): c.alignment = Alignment(wrap_text=True, vertical='top')

wb.save(XLSX)
print('weighted rows by uni:', counts, '| FTU HSA below floor:', low)
