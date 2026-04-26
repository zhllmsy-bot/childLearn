import { AnimatePresence, motion } from 'framer-motion';
import { Delete, ShieldCheck, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { SPRING } from '../../theme/springs';
import { PrivacyNotice } from '../PrivacyNotice/PrivacyNotice';

interface ParentGateProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  privacyHref?: string;
}

function createChallenge() {
  const left = Math.floor(Math.random() * 8) + 11;
  const right = Math.floor(Math.random() * 7) + 6;
  return { answer: left + right, left, right };
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const;

export function ParentGate({
  open,
  onClose,
  onSuccess,
  privacyHref,
}: ParentGateProps) {
  const [challenge, setChallenge] = useState(createChallenge);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    setChallenge(createChallenge());
    setInput('');
    setError('');
  }, [open]);

  const title = useMemo(
    () => `${challenge.left} + ${challenge.right} = ?`,
    [challenge.left, challenge.right],
  );

  const handleAppendDigit = (digit: string) => {
    setInput((current) => (current.length >= 2 ? current : `${current}${digit}`));
    if (error) {
      setError('');
    }
  };

  const handleSubmit = () => {
    if (Number(input) === challenge.answer) {
      onSuccess();
      setInput('');
      setError('');
      return;
    }

    setInput('');
    setError('再试一次，这个入口只给家长打开。');
    setChallenge(createChallenge());
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-emerald-950/35 px-4 py-6 backdrop-blur-sm"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
        >
          <motion.section
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-[2rem] bg-white px-5 py-5 shadow-2xl shadow-emerald-900/25 ring-2 ring-white"
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={SPRING.enter}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-child-mint px-3 py-2 text-sm font-black text-child-leaf-dark ring-1 ring-child-mint-deep">
                  <ShieldCheck size={16} strokeWidth={3} />
                  家长入口
                </div>
                <h2 className="mt-3 text-3xl font-black text-child-ink">请先完成一道大人题</h2>
              </div>
              <button
                aria-label="关闭家长入口"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-child-cream text-child-moss ring-1 ring-white"
                onClick={onClose}
                type="button"
              >
                <X size={22} strokeWidth={3} />
              </button>
            </div>

            <div className="mt-4 rounded-[1.75rem] bg-child-cream px-4 py-4 text-center ring-1 ring-white">
              <div className="text-sm font-black text-child-moss">家长请算一算</div>
              <div className="mt-2 text-4xl font-black text-child-ink">{title}</div>
              <div className="mt-4 rounded-[1.4rem] bg-white px-4 py-3 text-3xl font-black text-child-leaf-dark ring-2 ring-child-mint-deep">
                {input || '___'}
              </div>
              {error ? (
                <p className="mt-3 text-sm font-black text-orange-700">{error}</p>
              ) : (
                <p className="mt-3 text-sm font-black text-child-moss">
                  通过后才能查看家长报告和隐私说明。
                </p>
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {DIGITS.slice(0, 9).map((digit) => (
                <button
                  key={digit}
                  className="rounded-[1.5rem] bg-child-mint px-4 py-4 text-2xl font-black text-child-leaf-dark ring-1 ring-child-mint-deep"
                  onClick={() => handleAppendDigit(digit)}
                  type="button"
                >
                  {digit}
                </button>
              ))}
              <button
                className="rounded-[1.5rem] bg-child-cream px-4 py-4 text-lg font-black text-child-moss ring-1 ring-white"
                onClick={() => {
                  setInput('');
                  setError('');
                }}
                type="button"
              >
                清空
              </button>
              <button
                className="rounded-[1.5rem] bg-child-mint px-4 py-4 text-2xl font-black text-child-leaf-dark ring-1 ring-child-mint-deep"
                onClick={() => handleAppendDigit('0')}
                type="button"
              >
                0
              </button>
              <button
                aria-label="删除一位"
                className="flex items-center justify-center rounded-[1.5rem] bg-child-cream px-4 py-4 text-child-moss ring-1 ring-white"
                onClick={() => setInput((current) => current.slice(0, -1))}
                type="button"
              >
                <Delete size={22} strokeWidth={3} />
              </button>
            </div>

            <button
              className="mt-4 w-full rounded-[1.75rem] bg-child-leaf px-5 py-4 text-xl font-black text-white shadow-[0_12px_24px_rgba(62,160,45,.22)]"
              onClick={handleSubmit}
              type="button"
            >
              进入家长报告
            </button>

            <div className="mt-4">
              <PrivacyNotice compact href={privacyHref} />
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
