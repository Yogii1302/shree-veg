import React from 'react';

/**
 * Signature Marigold Toran Garland (झेंडूचे तोरण व आम्रपल्लव)
 * Lightweight vector SVG decoration. Zero external network requests.
 * Colors: Festive Marigold #F2A900, Deep Saffron #D97706, Sacred Leaf Tulsi #2E7D5B, Sacred Thread #C8382E.
 */
export function MarigoldToran({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`w-full overflow-hidden select-none pointer-events-none ${className}`}
    >
      <svg
        viewBox="0 0 720 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-7 sm:h-8"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Red and gold sacred thread (नाडी / मौली धागा) */}
        <path
          d="M0,8 Q90,18 180,8 Q270,18 360,8 Q450,18 540,8 Q630,18 720,8"
          stroke="#C8382E"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M0,8 Q90,18 180,8 Q270,18 360,8 Q450,18 540,8 Q630,18 720,8"
          stroke="#F2A900"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Units: 8 Toran garlands across 720px width (every 90px) */}
        {[45, 135, 225, 315, 405, 495, 585, 675].map((x, i) => (
          <g key={i} transform={`translate(${x}, 0)`}>
            {/* Sacred Mango Leaf (आम्रपल्लव) */}
            <path
              d="M-4,12 C-7,22 -2,32 0,36 C2,32 7,22 4,12 Z"
              fill="#2E7D5B"
              stroke="#25664A"
              strokeWidth="0.8"
            />
            <path d="M0,13 L0,34" stroke="#3EA87C" strokeWidth="0.6" opacity="0.8" />

            {/* Alternating Marigold Flower (झेंडू फूल) - Golden Yellow & Deep Saffron */}
            {i % 2 === 0 ? (
              // Marigold Golden Yellow (#F2A900)
              <g transform="translate(0, 14)">
                <circle cx="0" cy="0" r="7.5" fill="#F2A900" />
                <circle cx="0" cy="0" r="5.5" fill="#FFBE2E" />
                {/* Petal texture */}
                <circle cx="-3" cy="-3" r="2.2" fill="#D99600" opacity="0.6" />
                <circle cx="3" cy="-3" r="2.2" fill="#D99600" opacity="0.6" />
                <circle cx="-3" cy="3" r="2.2" fill="#D99600" opacity="0.6" />
                <circle cx="3" cy="3" r="2.2" fill="#D99600" opacity="0.6" />
                <circle cx="0" cy="0" r="2.5" fill="#B87B00" />
              </g>
            ) : (
              // Marigold Deep Orange (#D97706)
              <g transform="translate(0, 14)">
                <circle cx="0" cy="0" r="7.5" fill="#D97706" />
                <circle cx="0" cy="0" r="5.5" fill="#F59E0B" />
                {/* Petal texture */}
                <circle cx="-3" cy="-3" r="2.2" fill="#B45309" opacity="0.6" />
                <circle cx="3" cy="-3" r="2.2" fill="#B45309" opacity="0.6" />
                <circle cx="-3" cy="3" r="2.2" fill="#B45309" opacity="0.6" />
                <circle cx="3" cy="3" r="2.2" fill="#B45309" opacity="0.6" />
                <circle cx="0" cy="0" r="2.5" fill="#92400E" />
              </g>
            )}
          </g>
        ))}

        {/* Small hanging toran buds between garlands (every 90px at node dips) */}
        {[0, 90, 180, 270, 360, 450, 540, 630, 720].map((x, i) => (
          <g key={`bud-${i}`} transform={`translate(${x}, 8)`}>
            <circle cx="0" cy="1" r="3" fill="#C59B27" />
            <circle cx="0" cy="1" r="1.5" fill="#FEF3C7" />
          </g>
        ))}
      </svg>
    </div>
  );
}
