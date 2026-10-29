import { useState, useEffect } from 'react';

export default function TelegramConnectModal({ isOpen, onClose, onConnected }) {
  const [name, setName] = useState('');
  const [telegramHandle, setTelegramHandle] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Load existing profile if any
    try {
      const saved = localStorage.getItem('salon_client_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        // If it was mistakenly saved with admin's handle, clear it
        if (parsed.username === '@ftsomrazh') {
          localStorage.removeItem('salon_client_profile');
          setName('');
          setTelegramHandle('');
          setIsSaved(false);
          return;
        }
        setName(parsed.name || '');
        setTelegramHandle(parsed.username || parsed.phone || '');
        setIsSaved(true);
      }
    } catch {
      // Ignore parse error
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleConnectAndOpenTelegram(e) {
    if (e) e.preventDefault();

    const cleanHandle = telegramHandle.trim();
    const cleanName = name.trim();

    const profile = {
      name: cleanName || (cleanHandle ? cleanHandle : 'អតិថិជន'),
      username: cleanHandle || '',
      connected_at: new Date().toISOString(),
    };

    localStorage.setItem('salon_client_profile', JSON.stringify(profile));
    localStorage.setItem('salon_telegram_modal_dismissed', 'true');
    sessionStorage.setItem('salon_telegram_modal_dismissed', 'true');

    if (onConnected) {
      onConnected(profile);
    }

    // Open salon owner's Telegram chat so client chats to admin
    window.open('https://t.me/ftsomrazh', '_blank', 'noopener,noreferrer');

    onClose();
  }

  function handleSkip() {
    sessionStorage.setItem('salon_telegram_modal_dismissed', 'true');
    localStorage.setItem('salon_telegram_modal_dismissed', 'true');
    onClose();
  }

  function handleDisconnect() {
    localStorage.removeItem('salon_client_profile');
    setName('');
    setTelegramHandle('');
    setIsSaved(false);
    if (onConnected) {
      onConnected(null);
    }
    onClose();
  }

  return (
    <div className="telegram-overlay-backdrop" onClick={handleSkip}>
      <div className="telegram-overlay-card" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          type="button"
          className="telegram-overlay-close"
          onClick={handleSkip}
          title="បិទ (រំលង)"
        >
          ✕
        </button>

        {/* Telegram Icon Header Badge */}
        <div className="telegram-badge-glow">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
            <path d="M21.9 3.6c.3-1.1-.7-2-1.7-1.6L2.4 9.3c-1.2.5-1.2 2.2.1 2.6l4.5 1.4 1.7 5.5c.3.9 1.5 1.1 2.1.3l2.5-3.1 4.6 3.4c.9.7 2.2.2 2.4-.9l3.6-14.9Zm-4.6 3.6L9.9 13.5c-.2.2-.3.5-.3.8l-.2 2.6-1.2-4 9.6-6.3c.2-.1.4.1.3.3Z" />
          </svg>
        </div>

        <h2 className="telegram-overlay-title">
          {isSaved ? 'គណនី Telegram របស់អ្នក' : 'ភ្ជាប់ទំនាក់ទំនងជាមួយ Telegram'}
        </h2>
        <p className="telegram-overlay-subtitle">
          {isSaved
            ? 'អ្នកបានភ្ជាប់ជាមួយ Telegram របស់ហាងរួចរាល់ហើយ'
            : 'ងាយស្រួលកក់ម៉ោងកាត់សក់ តាមដានប្រវត្តិ និងទទួលការបញ្ចុះតម្លៃ'}
        </p>

        {/* Compact Benefits Pills Grid */}
        {!isSaved && (
          <div className="telegram-benefits-grid">
            <div className="telegram-benefit-pill">
              <span className="benefit-icon">✂️</span>
              <span>កក់ម៉ោងរហ័ស</span>
            </div>
            <div className="telegram-benefit-pill">
              <span className="benefit-icon">🔔</span>
              <span>រំលឹកកាលវិភាគ</span>
            </div>
            <div className="telegram-benefit-pill">
              <span className="benefit-icon">🎁</span>
              <span>សន្សំពិន្ទុ & ធីប</span>
            </div>
          </div>
        )}

        {/* Input fields form */}
        <form onSubmit={handleConnectAndOpenTelegram} className="telegram-form-fields">
          <div className="telegram-input-group">
            <label>ឈ្មោះរបស់អ្នក (ជាជម្រើស)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ឧទាហរណ៍៖ សុខា / ដារ៉ា"
            />
          </div>

          <div className="telegram-input-group">
            <label>Telegram Username ឬលេខទូរស័ព្ទ (ជាជម្រើស)</label>
            <input
              type="text"
              value={telegramHandle}
              onChange={(e) => setTelegramHandle(e.target.value)}
              placeholder="ឧទាហរណ៍៖ @username ឬ 012 345 678"
            />
          </div>

          {/* Action buttons */}
          <div className="telegram-action-buttons">
            <button
              type="submit"
              className="btn btn-telegram-primary"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M21.9 3.6c.3-1.1-.7-2-1.7-1.6L2.4 9.3c-1.2.5-1.2 2.2.1 2.6l4.5 1.4 1.7 5.5c.3.9 1.5 1.1 2.1.3l2.5-3.1 4.6 3.4c.9.7 2.2.2 2.4-.9l3.6-14.9Zm-4.6 3.6L9.9 13.5c-.2.2-.3.5-.3.8l-.2 2.6-1.2-4 9.6-6.3c.2-.1.4.1.3.3Z" />
              </svg>
              <span>{isSaved ? 'បើកឆាត Telegram ឡើងវិញ' : 'ភ្ជាប់ Telegram & ឆាតកក់ម៉ោង'}</span>
            </button>

            {isSaved ? (
              <button
                type="button"
                className="btn btn-outline btn-disconnect"
                onClick={handleDisconnect}
              >
                ផ្តាច់ការភ្ជាប់ (Disconnect)
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-telegram-skip"
                onClick={handleSkip}
              >
                មើលសេវាកម្មសិន (រំលង)
              </button>
            )}
          </div>
        </form>

        <p className="telegram-privacy-note">
          🔒 មិនចាំបាច់បញ្ចូលលេខសម្ងាត់ឡើយ។ អ្នកនៅតែអាចមើលម៉ូតសក់ និងផលិតផលទាំងអស់បានដោយសេរី។
        </p>
      </div>
    </div>
  );
}

