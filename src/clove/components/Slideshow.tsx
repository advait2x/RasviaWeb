import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Manual slideshow — starts on a random slide each mount; no auto-advance. */
export function Slideshow({
  images,
  className = "",
  aspectClass = "aspect-[16/10]",
}: {
  images: string[];
  className?: string;
  aspectClass?: string;
}) {
  const count = images.length;
  const [index, setIndex] = useState(() =>
    count > 0 ? Math.floor(Math.random() * count) : 0,
  );

  if (count === 0) return null;

  const go = (next: number) => {
    setIndex((next + count) % count);
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-border ${aspectClass} ${className}`}
    >
      <div
        className="flex h-full w-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((src, i) => (
          <img
            key={src + i}
            src={src}
            alt=""
            className="h-full w-full flex-shrink-0 object-cover"
            style={{ width: "100%" }}
            loading={i === index ? "eager" : "lazy"}
          />
        ))}
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous image"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-2 opacity-0 transition-opacity group-hover:opacity-100"
            style={{
              border: "1px solid rgba(255,255,255,0.3)",
              backgroundColor: "rgba(0,0,0,0.45)",
              color: "#ffffff",
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next image"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 opacity-0 transition-opacity group-hover:opacity-100"
            style={{
              border: "1px solid rgba(255,255,255,0.3)",
              backgroundColor: "rgba(0,0,0,0.45)",
              color: "#ffffff",
            }}
          >
            <ChevronRight size={16} />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((src, i) => (
              <button
                key={src + i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to image ${i + 1}`}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === index ? "1rem" : "0.375rem",
                  backgroundColor:
                    i === index ? "#ffffff" : "rgba(255,255,255,0.55)",
                }}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
