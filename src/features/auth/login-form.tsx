'use client';
import { useState } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
export default function LoginForm({ missing }: { missing: string[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  return (
    <main className="login-page">
      <section className="login-card">
        <Image src="/monexa.webp" width={76} height={76} alt="MONEXA" priority />
        <div className="eyebrow">KHÔNG GIAN TÀI CHÍNH CÁ NHÂN</div>
        <h1>
          Chào mừng đến MONEXA<span>.</span>
        </h1>
        <p>Tiền bạc rõ ràng. Kế hoạch vững vàng.</p>
        {missing.length ? (
          <div className="setup-message">
            <h2>Hoàn tất cấu hình để bắt đầu</h2>
            <p>
              Thêm các biến môi trường sau trong Vercel hoặc tệp .env.local, sau đó khởi động /
              triển khai lại:
            </p>
            <code>{missing.join(', ')}</code>
            <p>
              APP_PASSWORD tối thiểu 12 ký tự; SESSION_SECRET tối thiểu 32 ký tự. Xem README.md để
              cấu hình.
            </p>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                const response = await fetch('/api/auth/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    password: String(new FormData(e.currentTarget).get('password')),
                  }),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);
                window.location.assign('/');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Không thể kết nối.');
                setBusy(false);
              }
            }}
          >
            <label htmlFor="login-password">Mật khẩu cá nhân</label>
            <div className="password-field">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                autoFocus
                required
                maxLength={200}
                disabled={busy}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-pressed={showPassword}
                aria-controls="login-password"
                disabled={busy}
                onClick={() => setShowPassword((value) => !value)}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button className="button primary full" disabled={busy}>
              {busy ? 'Đang đăng nhập…' : 'Mở MONEXA'}
            </button>
            <small className="login-hint">
              Phiên đăng nhập được giữ trong 7 ngày trên thiết bị này.
            </small>
          </form>
        )}
      </section>
    </main>
  );
}
