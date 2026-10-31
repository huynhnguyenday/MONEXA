# Quy tắc dữ liệu MONEXA

MONEXA chỉ phục vụ một người. MongoDB dùng collection tương đương các bảng riêng; không có đăng ký, danh sách tài khoản hoặc phân quyền nhiều người. `users` là dự phòng cho cấu trúc quan hệ; người sở hữu hiện tại có ID cố định `personal`, mật khẩu vẫn lấy từ `.env.local`.

| Collection       | Dữ liệu mỗi document                                                                                                | Khóa liên kết                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `users`          | `_id`, `name`, `createdAt`                                                                                          | `_id = personal`                                        |
| `categories`     | `_id`, `userId`, `name`, `icon`, `color`, timestamps                                                                | `userId → users._id`                                    |
| `expenses`       | `_id`, `userId`, `categoryId`, `title`, `amount`, `occurredAt`, `note`, timestamps                                  | `userId → users._id`, `categoryId → categories._id`     |
| `people`         | `_id`, `userId`, `name`, timestamps                                                                                 | `userId → users._id`                                    |
| `debts`          | `_id`, `userId`, `personId`, `title`, `direction`, `amount`, `occurredAt`, `dueAt`, `settledAt`, `note`, timestamps | `userId → users._id`, `personId → people._id`           |
| `settings`       | `_id`, `userId`, `budget`, `revision`, `storageVersion`, `updatedAt`, `migratedAt` nếu chuyển từ bản cũ             | Một document cho user `personal`                        |
| `login_attempts` | `_id`, `count`, `expiresAt`                                                                                         | Collection kỹ thuật giới hạn đăng nhập, tự dọn bằng TTL |

`timestamps` là `createdAt` và `updatedAt` kiểu BSON Date. Ngày giờ nghiệp vụ lưu ISO UTC để giữ tương thích bản sao lưu. Tiền là số nguyên VND, không lưu chuỗi có dấu phân cách. `_id` là chuỗi bất biến, ánh xạ sang `id` khi trả API. Tên và icon chỉ là nội dung hiển thị, không làm khóa liên kết.

## Quy tắc đọc và ghi

- Luôn lọc `userId = personal` phía server, từ chối userId khác. Dữ liệu cũ thiếu userId được gán về user cá nhân khi kiểm tra schema.
- Kiểm tra Zod cho toàn bộ dữ liệu, ID không trùng, category/person được tham chiếu phải tồn tại cùng owner; không xóa danh mục/người còn được tham chiếu.
- Mỗi thực thể nằm trong document riêng. API vẫn trả dữ liệu tổng hợp cho dashboard và bản sao lưu, nhưng database không lưu các mảng gộp này.
- Khi lưu, chỉ insert/update/delete các document đã thay đổi; giữ nguyên `createdAt`, cập nhật `updatedAt`. Thao tác trên các collection và tăng `settings.revision` cùng nằm trong transaction. Lỗi ở bất kỳ bước nào phải rollback toàn bộ.
- GET đọc trong transaction với snapshot nhất quán. PUT yêu cầu revision khớp; revision cũ trả 409. Không chạy các thao tác trong một transaction bằng Promise.all.
- Index phục vụ owner, thời gian, categoryId, personId, trạng thái công nợ. `_id` là unique mặc định; `settings.userId` cũng unique. Tên không có unique constraint vì có thể đổi tên và không phải quan hệ.

## Chuyển dữ liệu cũ

Lần tải đầu sau nâng cấp, nếu chưa có `settings/personal`, repository đọc snapshot cũ `finance/personal`, kiểm tra dữ liệu và tách sang các collection trong một transaction. Giữ nguyên ID, số tiền, ngày giờ, revision và ngân sách; thêm userId dự phòng. Collection `finance` cũ được giữ nguyên làm bản đối chiếu, không dùng cho các lần lưu mới. Nếu chưa từng có dữ liệu, chỉ tạo user, settings và các danh mục mặc định; không tạo chi tiêu giả.

Nếu thấy dữ liệu collection mới nhưng thiếu marker settings, báo lỗi thay vì tự ghi đè. Các lần tải sau không chạy lại migration. Không xóa database hoặc reset dữ liệu khi triển khai.
