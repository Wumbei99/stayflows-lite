import { useState } from 'react';
import { Star } from 'lucide-react';

export default function RatingSystem({ onRating }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex flex-col items-center">
      <p className="text-slate-300 mb-8 font-medium text-lg">Tap to rate your experience</p>
      <div className="flex gap-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            className="focus:outline-none transition-all duration-300 hover:-translate-y-1 active:scale-90 cursor-pointer"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onRating(star)}
          >
            <Star 
              className={`w-12 h-12 ${
                star <= hover 
                  ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]' 
                  : 'fill-slate-800 text-slate-700'
              } transition-all duration-300`} 
            />
          </button>
        ))}
      </div>
    </div>
  );
}
