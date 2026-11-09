'use client';
import { useState } from 'react';
import { usePushDevice } from '../hooks/use-push-device';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faInfo, faPaperPlane } from '@fortawesome/free-solid-svg-icons';

export default function PushNotificationSettings({
  onTest,
  onNotice,
}: {
  onTest: () => void;
  onNotice: (message: string) => void;
}) {
  const push = usePushDevice(onNotice);
  const [infoOpen, setInfoOpen] = useState(false);
  return (
    <div className="push-notification-settings" aria-busy={push.busy}>
      <div className="notification-heading">
        <div className="notification-title">
          <h2>Thông báo</h2>
          <button
            type="button"
            className="notification-compact-button notification-info-button"
            aria-label="Thông tin thông báo"
            title="Thông tin thông báo"
            aria-expanded={infoOpen}
            aria-controls="notification-info"
            onClick={() => setInfoOpen(!infoOpen)}
          >
            <span className="notification-button-face">
              <Icon icon={faInfo} />
            </span>
          </button>
        </div>
        <div className="notification-actions">
          {push.initialized ? (
            <button
              type="button"
              className="notification-switch"
              role="switch"
              aria-checked={push.subscribed}
              aria-label="Nhận thông báo trên thiết bị này"
              title={push.subscribed ? 'Tắt thông báo' : 'Bật thông báo'}
              disabled={
                push.busy ||
                !push.supported ||
                !push.configured ||
                (!push.subscribed && push.permission === 'denied')
              }
              onClick={() => void (push.subscribed ? push.disable() : push.enable())}
            >
              <span />
            </button>
          ) : (
            <span
              className="notification-switch-loading"
              role="status"
              aria-label="Đang kiểm tra thông báo"
            >
              <span />
            </span>
          )}
          <button
            type="button"
            className="notification-compact-button push-test-button"
            aria-label="Gửi thông báo thử"
            title="Gửi thử tới tất cả thiết bị đã đăng ký"
            disabled={push.busy}
            onClick={() => {
              onTest();
              void push.test();
            }}
          >
            <span className="notification-button-face">
              <Icon icon={faPaperPlane} />
            </span>
          </button>
        </div>
      </div>
      {infoOpen && (
        <div id="notification-info" className="notification-info">
          <p>
            Còn 4–10 ngày: nhắc mỗi ngày lúc 19h30. Còn 1–3 ngày và ngày đến hạn: nhắc lúc 6h30 và
            19h30 (giờ Việt Nam).
          </p>
          <p>
            Gửi thử tới tất cả thiết bị đã đăng ký, tối đa 1 lần/phút cho mỗi thiết bị. Không cần
            bật thông báo trên thiết bị bấm gửi.
          </p>
        </div>
      )}
      {push.supported === false && <p role="status">Thiết bị chưa hỗ trợ thông báo.</p>}
      {push.configured === false && <p role="status">Máy chủ chưa cấu hình thông báo.</p>}
      {push.permission === 'denied' && (
        <p role="status">Thông báo bị chặn. Hãy cấp quyền trong cài đặt trình duyệt.</p>
      )}
      {push.error && (
        <div className="notification-error" role="alert">
          {push.error}
        </div>
      )}
    </div>
  );
}
