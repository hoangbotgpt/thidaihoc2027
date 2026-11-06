# Điểm Chuẩn Hà Nội 2026

Trang tra cứu và so sánh điểm chuẩn năm 2026 của 22 trường đại học tại Hà Nội (653 ngành) cho các tổ hợp **D01, D10, D15, C04** và điểm thi **HSA** (đánh giá năng lực ĐHQGHN).

- Nhập điểm từng môn và điểm ưu tiên, trang tự quy đổi sang thang 30/40, áp hệ số môn theo đề án 2026 của từng trường.
- Lọc liên kết (loại hình → nhóm trường → trường → nhóm ngành) và lọc/sắp xếp theo **khả năng đỗ**, ghi rõ đánh giá theo THPT hay HSA.
- Tính ngưỡng HSA tối thiểu của trường (VD FTU 100, NEU 85).
- So sánh tối đa 5 ngành cạnh nhau.

> Số liệu chỉ để tham khảo. Hãy đối chiếu với thông báo chính thức của trường trước khi đăng ký nguyện vọng.

## Nguồn dữ liệu

Trang có 2 nguồn dữ liệu, chỉ dùng **một** nguồn tại một thời điểm:

| | Nguồn | Khi nào dùng |
|---|---|---|
| 1 | `public/data/diem-chuan-2026.sqlite` (**dữ liệu gốc**) | Mặc định mỗi khi mở trang |
| 2 | File `.xlsx` người dùng tải lên | Khi bấm **"Dùng file Excel của bạn"** |

Khi dùng nguồn 2, file Excel chỉ được đọc trong bộ nhớ của trình duyệt: **không ghi đè** file Excel hay SQLite gốc, **không gửi lên** máy chủ nào. Tải lại trang hoặc bấm **"Về dữ liệu gốc"** để quay lại SQLite.

File Excel tải lên cần cùng cấu trúc với `data/diem-chuan-2026.xlsx` (sheet `Truong`, `Nganh`, tùy chọn `DanhMuc`). Sheet `HuongDan` trong file mẫu giải thích từng cột. Các dòng sai định dạng được liệt kê ở mục **"vấn đề dữ liệu"** trên trang.

## Cập nhật dữ liệu gốc

1. Sửa `data/diem-chuan-2026.xlsx`. Đây là file nguồn để biên tập.
2. Sinh lại SQLite:
   ```bash
   pip install -r requirements.txt
   npm run db
   ```
3. Commit cả hai file. Nếu đã bật GitHub Pages, trang sẽ tự build lại.

Nếu nơi lưu trữ không phục vụ được file `.sqlite`, có thể mã hóa base64 rồi build với `VITE_SQLITE_URL`:
```bash
base64 -w0 public/data/diem-chuan-2026.sqlite > public/data/diem-chuan-2026.sqlite.b64.txt
VITE_SQLITE_URL=./data/diem-chuan-2026.sqlite.b64.txt npm run build
```

## Chạy trên máy

Cần Node.js 18 trở lên.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # xuất bản tĩnh vào dist/
npm run preview   # xem thử bản build
```

## Đưa lên GitHub Pages

1. Tạo repo public trên GitHub rồi đẩy code lên nhánh `main`:
   ```bash
   git remote add origin https://github.com/hoangbotgpt/thidaihoc2027.git
   git push -u origin main
   ```
2. Trên GitHub, vào **Settings → Pages**, mục **Source** chọn **GitHub Actions**.
3. Workflow `.github/workflows/deploy.yml` sẽ build và đăng trang tại `https://hoangbotgpt.github.io/thidaihoc2027/`.

## Cấu trúc thư mục

```
data/diem-chuan-2026.xlsx          File Excel để biên tập (nguồn của SQLite)
public/data/diem-chuan-2026.sqlite Dữ liệu gốc web đọc mặc định
src/
  Root.jsx      Chọn nguồn dữ liệu (SQLite / Excel tải lên)
  loadData.js   Đọc SQLite (sql.js) và Excel (read-excel-file), kiểm tra dữ liệu
  App.jsx       Giao diện tra cứu, lọc, tính điểm, so sánh
tools/
  xlsx_to_sqlite.py      Excel → SQLite (npm run db)
  import_scrape.py       Ghép dữ liệu bóc tách từ tuyensinh247 vào Excel
  apply_de_an_rules.py   Áp quy tắc tính điểm theo đề án 2026 vào Excel
```

### Cách tính điểm

- **Thang điểm** (`thang_diem`): `30`, `40` hoặc `Riêng`.
- **Hệ số môn** (`he_so_mon`): ví dụ `Toán x2`, `Ngữ văn x1.5 + Ngoại ngữ x1.5`, `Toán x2 | Ngữ văn x2` (dấu `|` nghĩa là thí sinh được lấy cách có lợi hơn). Điểm = Σ(điểm × hệ số) × thang / (10 × Σhệ số).
- **Điểm ưu tiên** theo quy chế: nếu tổng ≥ 75% thang thì ưu tiên = (thang − tổng) / (thang/4) × ưu tiên; ở thang 40, ưu tiên được nhân 4/3.
- **Ngưỡng HSA** (`nguong_hsa` ở sheet Truong): điểm HSA dưới ngưỡng thì không đạt, dù điểm quy đổi của ngành thấp hơn.

## Nguồn số liệu

- Điểm chuẩn 2026: [diemthi.tuyensinh247.com/diem-chuan.html](https://diemthi.tuyensinh247.com/diem-chuan.html)
- Đề án tuyển sinh 2026: [diemthi.tuyensinh247.com/de-an-tuyen-sinh.html](https://diemthi.tuyensinh247.com/de-an-tuyen-sinh.html) và văn bản gốc của từng trường (link trong cột `de_an_2026_url`, sheet `Truong`).

## Tác giả

[hoangbotgpt](https://github.com/hoangbotgpt) · hoang.bot.gpt@gmail.com

## Giấy phép

Mã nguồn theo giấy phép [MIT](LICENSE). Số liệu thuộc về các nguồn nêu trên.
