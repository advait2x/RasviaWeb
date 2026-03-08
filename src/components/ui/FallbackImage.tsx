import { ImgHTMLAttributes, useState } from "react";

interface FallbackImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc: string;
}

export default function FallbackImage({ src, fallbackSrc, alt, ...props }: FallbackImageProps) {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);

  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={() => setImgSrc(fallbackSrc)}
      {...props}
    />
  );
}
