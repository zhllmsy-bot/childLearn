interface PrivacyNoticeProps {
  compact?: boolean;
  href?: string;
}

export function PrivacyNotice({ compact = false, href }: PrivacyNoticeProps) {
  return (
    <section
      aria-label="隐私说明"
      className={`rounded-[1.5rem] bg-child-cream/90 ring-1 ring-white ${
        compact ? 'px-4 py-3' : 'px-5 py-4'
      }`}
    >
      <p className="text-sm font-black leading-relaxed text-child-moss md:text-base">
        家长须知：学习记录只用于个性化练习、家庭进度同步和家长报告。孩子名字、口令和密钥不会放进浏览器公开配置。若大模型协作暂时未接通，应用会先切回保底题库，并在家长报告中明确提示。
        {href ? (
          <>
            {' '}
            <a
              className="text-child-leaf-dark underline decoration-2 underline-offset-2"
              href={href}
              rel="noreferrer"
              target="_blank"
            >
              查看完整说明
            </a>
          </>
        ) : null}
      </p>
    </section>
  );
}
