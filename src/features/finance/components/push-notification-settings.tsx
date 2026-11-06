'use client';
import { usePushDevice } from '../hooks/use-push-device';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';

export default function PushNotificationSettings() {
  const push = usePushDevice();
  return <div className="push-notification-settings" aria-busy={push.busy}>
    <p>Nhắc trước hạn một ngày lúc 9 giờ sáng; ngày đến hạn nhắc lúc 9 giờ sáng và 9 giờ tối, theo giờ Việt Nam. Giờ nhận có thể trễ trong khoảng một giờ.</p>
    <p>Android: mở menu trình duyệt → Cài đặt ứng dụng hoặc Thêm vào màn hình chính, rồi bật thông báo tại đây.</p>
    {push.supported === false && <p>Thiết bị cần trình duyệt hỗ trợ Web Push và kết nối HTTPS. iPhone cần iOS 16.4 trở lên, thêm MONEXA vào màn hình chính và mở từ biểu tượng đó.</p>}
    {push.configured === false && <p>Thông báo từ máy chủ chưa được cấu hình.</p>}
    {push.supported && push.configured && <>
      {push.permission === 'denied' && <p>Quyền thông báo đang bị chặn. Hãy cho phép thông báo trong cài đặt của trình duyệt và điện thoại rồi thử lại.</p>}
      {!push.subscribed ? <button type="button" className="button primary" disabled={push.busy || push.permission === 'denied'} onClick={() => void push.enable()}>
        {push.busy ? 'Đang kiểm tra…' : 'Bật thông báo trên thiết bị này'}
      </button> : <>
        <p>Đã đăng ký nhận thông báo trên thiết bị này.</p>
        <div className="push-device-actions">
          <button type="button" className="button secondary" disabled={push.busy} onClick={() => void push.disable()}>Tắt trên thiết bị này</button>
        </div>
      </>}
    </>}
    <button type="button" className="button primary push-test-button" disabled={push.busy || !push.subscribed}
      title={push.subscribed ? 'Gửi thử khoản công nợ có hạn sớm nhất trên thiết bị này' : 'Bật thông báo trên thiết bị này trước khi gửi thử'}
      onClick={() => void push.test()}><FontAwesomeIcon icon={faPaperPlane} /> Gửi thông báo thử</button>
    <p>{push.subscribed ? 'Gửi thử tối đa 1 lần/phút/thiết bị; không giới hạn tổng số lần theo ngày.' : 'Bật thông báo trên thiết bị này để sử dụng nút gửi thử.'}</p>
    {push.error && <p role="alert">{push.error}</p>}
    {push.notice && <p role="status">{push.notice}</p>}
  </div>;
}
