import React from 'react';
import { OPTIMIZED_IMAGES } from '../lib/images';

export interface OptimizedPictureProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  sizes?: string;
}

/**
 * Renders a progressive <picture> element using pre-generated AVIF / WebP /
 * lossless PNG variants from `OPTIMIZED_IMAGES` with intrinsic width/height
 * attributes for zero layout shift, while preserving exact CSS class styling.
 */
export const OptimizedPicture: React.FC<OptimizedPictureProps> = ({
  src,
  sizes,
  alt = '',
  decoding = 'async',
  width,
  height,
  ...imgProps
}) => {
  const meta = OPTIMIZED_IMAGES[src];
  const resolvedSrc = meta?.fallbackSrc ?? src;
  const resolvedWidth = width ?? meta?.width;
  const resolvedHeight = height ?? meta?.height;

  if (!meta?.avifSrcSet && !meta?.webpSrcSet) {
    return (
      <img
        src={resolvedSrc}
        alt={alt}
        width={resolvedWidth}
        height={resolvedHeight}
        decoding={decoding}
        {...imgProps}
      />
    );
  }

  return (
    <picture className="contents">
      {meta.avifSrcSet && (
        <source type="image/avif" srcSet={meta.avifSrcSet} sizes={sizes} />
      )}
      {meta.webpSrcSet && (
        <source type="image/webp" srcSet={meta.webpSrcSet} sizes={sizes} />
      )}
      <img
        src={resolvedSrc}
        alt={alt}
        width={resolvedWidth}
        height={resolvedHeight}
        decoding={decoding}
        {...imgProps}
      />
    </picture>
  );
};
