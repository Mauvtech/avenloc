interface Props {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}

export default function Avatar({ src, name, size = 36, className = '' }: Props) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className={`flex-none rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className={`flex flex-none items-center justify-center rounded-full bg-brand-tint font-bold text-brand-fg ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initials || '?'}
    </span>
  );
}
