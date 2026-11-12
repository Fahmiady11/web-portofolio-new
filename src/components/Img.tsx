import type { Picture } from '../content/types';

interface Props {
  picture: Picture;
  alt: string;
  /** CSS sizes hint for the srcset, e.g. "(max-width: 760px) 100vw, 560px". */
  sizes: string;
  className?: string;
  eager?: boolean;
}

/** A content image as AVIF/WebP with responsive widths. */
export function Img({ picture, alt, sizes, className, eager }: Props) {
  return (
    <picture>
      <source type="image/avif" srcSet={picture.avif} sizes={sizes} />
      <source type="image/webp" srcSet={picture.webp} sizes={sizes} />
      <img className={className} src={picture.src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />
    </picture>
  );
}
