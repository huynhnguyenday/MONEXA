# MONEXA

Ứng dụng quản lý tiền cá nhân: Next.js App Router, React, TypeScript, Tailwind CSS, Chart.js, Font Awesome, Google Font Be Vietnam Pro, MongoDB và react-datepicker tiếng Việt. Bố cục 70/30 trên laptop, một cột trên điện thoại.

## Chạy trên máy

Yêu cầu Node.js 22 trở lên. Dự án chỉ dùng một file môi trường là `.env.local`, đã được cấu hình trên máy hiện tại và bị loại khỏi Git. Khi chuyển sang máy khác, sao chép riêng file `.env.local` cùng mã nguồn; không tải file này lên GitHub. Sau đó chạy:

```sh
npm ci
npm run dev
```

Mở http://localhost:3000 và dùng mật khẩu cá nhân đã chọn. Bản production: `npm run build`, sau đó `npm start`.

Mật khẩu phân biệt chữ hoa/thường; giá trị được cấu hình tại `APP_PASSWORD` trong `.env.local`. Sau khi đổi giá trị, khởi động lại server. Trên Vercel, cập nhật biến môi trường tương ứng rồi Redeploy.

## Triển khai Vercel

1. Đưa mã nguồn lên repository Git riêng và import vào Vercel. Không đưa `.env.local` lên Git.
2. Chọn framework **Next.js**, Node.js **22.x** hoặc mới hơn; giữ Build Command `npm run build`, Install Command `npm ci`, Output Directory mặc định của Next.js. `vercel.json` đã khai báo framework và lệnh.
3. Trong **Project → Settings → Environment Variables**, thêm các biến dưới đây. Giá trị nằm trong `.env.local` trên máy hiện tại; khi điền trong giao diện Vercel, không thêm dấu nháy bao quanh giá trị.

| Biến             | Nội dung                                                       |
| ---------------- | -------------------------------------------------------------- |
| `MONGODB_URI`    | Chuỗi kết nối Atlas riêng của bạn, chỉ server đọc              |
| `MONGODB_DB`     | `monexa` cho production                                        |
| `APP_PASSWORD`   | Mật khẩu đăng nhập cá nhân, tối thiểu 12 ký tự                 |
| `SESSION_SECRET` | Chuỗi ngẫu nhiên tối thiểu 32 ký tự; đã tạo trong `.env.local` |

4. MongoDB Atlas cần database user có quyền `readWrite` trên database ứng dụng và kết nối từ môi trường triển khai được phép trong **Network Access**. Khi bị timeout, kiểm tra IP Access List và cluster có đang chạy. Vercel với IP outbound động cần chính sách mạng phù hợp; dùng IP cố định khi có sẵn. Không nới quyền database user ngoài nhu cầu ứng dụng.
5. Chọn Deploy. Khi thay đổi biến môi trường, **Redeploy** để áp dụng. Dùng `monexa_preview` riêng nếu bật Preview; không dùng chung database production cho bản thử.

Tài liệu chính thức: [biến môi trường Vercel](https://vercel.com/docs/environment-variables), [kết nối MongoDB Atlas](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/), [IP outbound Vercel](https://vercel.com/kb/guide/how-to-allowlist-deployment-ip-address).

Chưa tự triển khai lên tài khoản Vercel trong phiên này. Không cần tài khoản hoặc dịch vụ Sites.

## Chức năng

- Thống kê tháng: tiền còn lại theo ngân sách, tổng chi, trung bình/ngày, chi theo danh mục và trung bình theo thứ. Thời gian lưu ISO UTC, thống kê và hiển thị theo múi giờ Việt Nam.
- Danh mục có tên, icon Font Awesome, màu; có thể sửa mà giữ nguyên ID. Chi tiêu có tên riêng, thời gian bằng bộ chọn ngày/giờ, số tiền, `categoryId`, ghi chú tùy chọn; hỗ trợ sửa, xóa và tìm kiếm.
- Công nợ phải thu/phải trả, người liên quan qua `personId`, ngày ghi nhận, hạn thanh toán, ghi chú, thời gian hoàn tất. Lọc đang mở/quá hạn/đã hoàn tất; có thể sửa và mở lại khoản đã thanh toán. Công nợ không tự cộng vào chi tiêu để tránh tính trùng; bản hiện tại theo dõi hoàn tất toàn khoản, chưa chia lần thanh toán.
- Dữ liệu MongoDB dùng chung giữa các thiết bị sau đăng nhập, tự tải dữ liệu mới mỗi 20 giây khi trang đang hiển thị và khi quay lại cửa sổ. Tạm ngừng tải nền khi đang nhập form hoặc lưu; không có nút/trạng thái đồng bộ thường trực. Nếu hai thiết bị cùng sửa một phiên bản, server trả 409, giữ form để người dùng tải dữ liệu mới và thử lại.
- Xuất/nhập JSON và chuyển localStorage v1. Nhập/chuyển yêu cầu xác nhận vì thay toàn bộ dữ liệu; bản local v1 được giữ lại. Chỉ đóng form khi server xác nhận đã lưu.
- Mật khẩu cá nhân; session HttpOnly/Secure/SameSite Strict, hết hạn sau 7 ngày; kiểm tra Origin khi ghi và giới hạn đăng nhập 10 lần/15 phút/IP lưu MongoDB. Thay `APP_PASSWORD` hoặc `SESSION_SECRET` sẽ vô hiệu phiên hiện có.

## Cấu trúc

```text
src/
  app/
    api/auth/        # Đăng nhập, đăng xuất
    api/finance/     # API snapshot có revision, validation và auth
    login/           # Màn hình mật khẩu
    layout.tsx       # Metadata, favicon, font và CSS chung
    page.tsx         # Bảo vệ dashboard trên server
  components/        # Dialog và bộ chọn ngày giờ dùng chung
  features/
    auth/            # Form đăng nhập
    finance/
      dashboard.tsx  # Ghép các phần giao diện, không chứa form/layout lớn
      layout/        # AppHeader và AppSidebar
      panels/        # Màn hình Tổng quan, Công nợ, Danh mục; CSS theo màn hình
      charts/        # Biểu đồ tài chính
      forms/         # Mỗi form một file, types/helper chung
      dialogs/       # Điều phối các form trong dialog
      hooks/         # State/thao tác dashboard và kết nối dữ liệu
      components/    # Thông báo lỗi và phản hồi thao tác
      model.ts       # Schema Zod, ID, dữ liệu mẫu rỗng, thống kê
      repository.ts  # Đọc/ghi collection, transaction và migration
      types.ts       # Kiểu màn hình và dialog
      icons.ts       # Bảng icon danh mục
  lib/               # MongoDB connection pool, session, HTTP helpers
public/              # Logo và favicon gốc của MONEXA
tests/               # Validation, liên kết ID, thống kê và chuyển dữ liệu
scripts/             # Kiểm thử E2E trên database tạm
docs/UX_UI_RULES.md   # Quy tắc giao diện
AGENTS.md            # Quy tắc cho coding agents
```

Dữ liệu tách thành các collection `users`, `categories`, `expenses`, `people`, `debts`, `settings`. Mỗi thực thể có document riêng và ID bất biến; chi tiêu lưu `categoryId` và `userId`. User hiện tại chỉ là bản ghi dự phòng `personal`, ứng dụng vẫn dành cho một người. Ghi nhiều collection trong transaction và dùng `settings.revision` để chống lưu dở dang / ghi đè. Snapshot cũ `finance/personal` tự chuyển khi tải lần đầu và được giữ nguyên để đối chiếu. Chi tiết ở [quy tắc dữ liệu](docs/DATA_MODEL.md).

Giao diện dùng xanh dương đậm và nền trắng sáng; màn hình mật khẩu có nút hiện/ẩn bằng icon mắt. Giới hạn API/bản sao lưu hiện tại: 100 danh mục, 5.000 khoản chi, 2.000 người liên quan, 2.000 khoản công nợ và payload 2 MB; các giới hạn này không phải giới hạn của collection MongoDB.

Dashboard bố trí vừa viewport: header một hàng với MONEXA bên trái, bộ chọn tháng react-datepicker tiếng Việt ở chính giữa, nút tạo bên phải. Điều hướng Tổng quan/Công nợ/Danh mục/Người liên quan, nhập/xuất và đăng xuất chỉ trong navbar bật/tắt được. Nền xanh xám làm nổi các bảng trắng. Bảng tự phân trang theo chiều cao và biểu đồ phân trang cột khi có nhiều danh mục. Trên điện thoại chuyển giữa tab “Chỉ số & biểu đồ” và “Chi tiêu”; không phải cuộn trang hoặc cuộn ngang bảng. Form dialog vẫn cho phép cuộn khi cần nhập liệu trên màn hình nhỏ.

Danh mục có màn hình riêng với tìm kiếm, tên/icon/màu, số khoản liên quan và tổng chi, phân trang theo viewport; tạo/sửa mở form riêng. Đổi tên/icon vẫn giữ ID. Chỉ cho xóa danh mục chưa có chi tiêu và không phải danh mục cuối. Navbar chỉ có một nút bật/tắt chính tại header, nền xanh/viền/shadow rõ; không lặp nút đóng bên trong panel, kể cả trên điện thoại.

## Kiểm tra

```sh
npm test
npm run typecheck
npm run build
npm run test:e2e
```

E2E cần `.env.local`, MongoDB truy cập được và Microsoft Edge đã cài (có thể đặt `E2E_BROWSER=chrome`). Script chạy bản production trên cổng 3101, tạo database tạm `monexa_verify_*`, kiểm tra auth/API/form/ID/công nợ/mobile và xóa database tạm khi xong. Không chạy trên database cá nhân. Ảnh kiểm tra ở `artifacts/`, đã được loại khỏi Git.

Google Fonts cần Internet; font hệ thống được dùng dự phòng. Dữ liệu không được ghi offline; khi mất mạng, giữ form và thử lại. Nên xuất bản sao lưu định kỳ.
