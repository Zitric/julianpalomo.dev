/** The haze ridge, the far mountains with their shading, gullies and snowcaps, and the middle hills. */
export function Mountains() {
  return (
    <>
      <path
        className="land haze"
        d="M0 168 C 40 160 70 150 110 156 L170 130 L215 142 C 240 132 260 122 280 118 L330 134 L380 120 L440 132 C 520 136 560 128 600 120 L660 108 L700 116 C 740 104 760 98 790 104 L850 124 L920 112 L990 130 C 1040 122 1080 116 1120 126 L1200 136 L1200 320 L0 320 Z"
      />
      <path
        className="land far"
        d="M0 200 C 60 190 120 176 180 168 L260 150 C 300 140 330 128 360 112 L420 86 L452 70 C 460 66 468 66 476 70 L520 98 L560 120 C 590 132 620 134 650 128 L720 112 L780 98 L812 90 C 820 87 826 89 832 93 L880 122 C 920 140 960 148 1010 150 L1080 156 C 1130 160 1170 168 1200 172 L1200 320 L0 320 Z"
      />
      <path
        className="shade"
        d="M472 68 C 474 69 475 69 476 70 L520 98 L560 120 C 540 126 516 130 492 132 L486 110 Z"
      />
      <path
        className="shade"
        d="M828 90 L880 122 C 900 132 920 140 940 144 C 900 146 870 144 846 140 Z"
      />
      <path
        className="gully"
        d="M456 76 L448 96 M466 74 L470 92 M461 82 L458 104 M818 94 L813 106 M826 95 L830 108"
      />
      <path
        className="snowcap"
        d="M430 82 L452 70 C 460 66 468 66 476 70 L500 86 C 492 84 486 92 478 86 C 472 96 464 86 458 94 C 450 86 440 94 430 82 Z"
      />
      <path
        className="snowcap"
        d="M796 98 L812 90 C 820 87 826 89 832 93 L850 104 C 842 102 836 108 828 102 C 820 110 812 102 806 106 Z"
      />
      <path
        className="land mid"
        d="M300 230 C 420 216 560 214 700 220 C 800 224 860 228 920 234 L920 320 L300 320 Z"
      />
      <path
        className="land mid2"
        d="M0 232 C 80 212 160 198 240 200 C 300 202 350 212 410 228 C 430 234 440 240 446 246 L0 320 Z"
      />
      <path
        className="land mid2"
        d="M690 230 C 760 208 840 196 920 198 C 1010 200 1100 212 1200 220 L1200 320 L690 320 Z"
      />
    </>
  );
}
