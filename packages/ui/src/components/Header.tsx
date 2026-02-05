interface Props {
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant: 'safe' | 'caution' | 'danger' | 'primary' | 'purple';
  };
  icon?: string;
}

const badgeClasses = {
  safe: 'badge-safe',
  caution: 'badge-caution',
  danger: 'badge-danger',
  primary: 'badge-primary',
  purple: 'badge-purple'
};

export default function Header({ title, subtitle, badge, icon }: Props) {
  return (
    <header className="glass-strong px-8 py-5 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {icon && (
            <div className="w-12 h-12 rounded-xl glass flex items-center justify-center text-2xl">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-heading tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {badge && (
          <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${badgeClasses[badge.variant]}`}>
            {badge.text}
          </span>
        )}
      </div>
    </header>
  );
}
