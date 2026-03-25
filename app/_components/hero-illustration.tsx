export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 540 170"
      fill="none"
      className="wg-illust mx-auto w-full max-w-[600px]"
      role="img"
      aria-label="Design styles transferring between two websites"
    >
      <defs>
        <style>{`
          /* 8s loop: 0-35% source colored → 40-55% transfer → 55-85% target colored → reset */

          /* Source drains */
          .wg-illust .sa { animation: sa 8s ease-in-out infinite; }
          @keyframes sa {
            0%,35%{fill:#1f6b53}48%,78%{fill:#3a3632}92%,100%{fill:#1f6b53}
          }
          .wg-illust .sb { animation: sb 8s ease-in-out infinite; }
          @keyframes sb {
            0%,35%{fill:#b87333}48%,78%{fill:#3a3632}92%,100%{fill:#b87333}
          }
          .wg-illust .sc { animation: sc 8s ease-in-out infinite; }
          @keyframes sc {
            0%,35%{fill:#2a8a6a}48%,78%{fill:#3a3632}92%,100%{fill:#2a8a6a}
          }
          .wg-illust .sd { animation: sd 8s ease-in-out infinite; }
          @keyframes sd {
            0%,35%{fill:#2a7a8a}48%,78%{fill:#3a3632}92%,100%{fill:#2a7a8a}
          }
          .wg-illust .st { animation: st 8s ease-in-out infinite; }
          @keyframes st {
            0%,35%{opacity:.5}48%,78%{opacity:.12}92%,100%{opacity:.5}
          }

          /* Target fills (inverse) */
          .wg-illust .ta { animation: ta 8s ease-in-out infinite; }
          @keyframes ta {
            0%,35%{fill:#3a3632}48%,78%{fill:#1f6b53}92%,100%{fill:#3a3632}
          }
          .wg-illust .tb { animation: tb 8s ease-in-out infinite; }
          @keyframes tb {
            0%,35%{fill:#3a3632}48%,78%{fill:#b87333}92%,100%{fill:#3a3632}
          }
          .wg-illust .tc { animation: tc 8s ease-in-out infinite; }
          @keyframes tc {
            0%,35%{fill:#3a3632}48%,78%{fill:#2a8a6a}92%,100%{fill:#3a3632}
          }
          .wg-illust .td { animation: td 8s ease-in-out infinite; }
          @keyframes td {
            0%,35%{fill:#3a3632}48%,78%{fill:#2a7a8a}92%,100%{fill:#3a3632}
          }
          .wg-illust .tt { animation: tt 8s ease-in-out infinite; }
          @keyframes tt {
            0%,35%{opacity:.12}48%,78%{opacity:.5}92%,100%{opacity:.12}
          }

          /* Particles */
          .wg-illust .pk {
            opacity: 0;
            transform-box: fill-box;
            transform-origin: center;
          }
          .wg-illust .p1{animation:f1 8s ease-in-out infinite}
          .wg-illust .p2{animation:f2 8s ease-in-out infinite}
          .wg-illust .p3{animation:f3 8s ease-in-out infinite}
          .wg-illust .p4{animation:f4 8s ease-in-out infinite}
          .wg-illust .p5{animation:f5 8s ease-in-out infinite}
          .wg-illust .p6{animation:f6 8s ease-in-out infinite}

          @keyframes f1 {
            0%,34%{opacity:0;transform:translate(0,0) scale(1)}
            37%{opacity:1;transform:translate(0,0) scale(1)}
            50%{opacity:0;transform:translate(120px,-10px) scale(.15)}
            100%{opacity:0}
          }
          @keyframes f2 {
            0%,36%{opacity:0;transform:translate(0,0) scale(1)}
            39%{opacity:1;transform:translate(0,0) scale(1)}
            52%{opacity:0;transform:translate(125px,8px) scale(.12)}
            100%{opacity:0}
          }
          @keyframes f3 {
            0%,38%{opacity:0;transform:translate(0,0) scale(1)}
            41%{opacity:1;transform:translate(0,0) scale(1)}
            54%{opacity:0;transform:translate(115px,-18px) scale(.2)}
            100%{opacity:0}
          }
          @keyframes f4 {
            0%,35%{opacity:0;transform:translate(0,0) scale(1)}
            38%{opacity:1;transform:translate(0,0) scale(1)}
            51%{opacity:0;transform:translate(128px,14px) scale(.15)}
            100%{opacity:0}
          }
          @keyframes f5 {
            0%,40%{opacity:0;transform:translate(0,0) scale(1)}
            43%{opacity:1;transform:translate(0,0) scale(1)}
            56%{opacity:0;transform:translate(118px,-5px) scale(.18)}
            100%{opacity:0}
          }
          @keyframes f6 {
            0%,37%{opacity:0;transform:translate(0,0) scale(1)}
            40%{opacity:.8;transform:translate(0,0) scale(1)}
            53%{opacity:0;transform:translate(122px,10px) scale(.14)}
            100%{opacity:0}
          }
        `}</style>

        <filter id="wg-sh" x="-5%" y="-5%" width="112%" height="120%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="8"
            floodColor="#000"
            floodOpacity="0.15"
          />
        </filter>
        <clipPath id="wg-bc">
          <rect width="200" height="140" rx="8" />
        </clipPath>
      </defs>

      {/* Left browser (source) */}
      <g transform="translate(10,15)" filter="url(#wg-sh)">
        <g clipPath="url(#wg-bc)">
          <rect width="200" height="140" rx="8" fill="#1c1a17" />
          <rect width="200" height="22" fill="#26231e" rx="8" />
          <rect y="8" width="200" height="14" fill="#26231e" />
          <circle cx="12" cy="11" r="3" fill="#ff5f57" />
          <circle cx="22" cy="11" r="3" fill="#febc2e" />
          <circle cx="32" cy="11" r="3" fill="#28c840" />
          <rect x="46" y="6" width="100" height="10" rx="3" fill="#13110e" />

          {/* Hero */}
          <rect x="8" y="28" width="184" height="36" rx="5" className="sa" />
          <rect
            x="14"
            y="36"
            width="80"
            height="5"
            rx="2"
            fill="#fff"
            className="st"
          />
          <rect
            x="14"
            y="46"
            width="55"
            height="4"
            rx="2"
            fill="#fff"
            className="st"
          />

          {/* Button */}
          <rect x="8" y="70" width="44" height="14" rx="4" className="sa" />
          <rect
            x="14"
            y="75"
            width="28"
            height="4"
            rx="1.5"
            fill="#fff"
            opacity="0.8"
          />

          {/* Cards */}
          <rect x="8" y="92" width="56" height="40" rx="4" fill="#26231e" />
          <rect x="10" y="94" width="52" height="20" rx="3" className="sb" />
          <rect
            x="10"
            y="118"
            width="32"
            height="3"
            rx="1"
            fill="#fff"
            className="st"
          />
          <rect
            x="10"
            y="124"
            width="24"
            height="3"
            rx="1"
            fill="#fff"
            opacity=".06"
          />

          <rect x="72" y="92" width="56" height="40" rx="4" fill="#26231e" />
          <rect x="74" y="94" width="52" height="20" rx="3" className="sc" />
          <rect
            x="74"
            y="118"
            width="28"
            height="3"
            rx="1"
            fill="#fff"
            className="st"
          />
          <rect
            x="74"
            y="124"
            width="20"
            height="3"
            rx="1"
            fill="#fff"
            opacity=".06"
          />

          <rect x="136" y="92" width="56" height="40" rx="4" fill="#26231e" />
          <rect x="138" y="94" width="52" height="20" rx="3" className="sd" />
          <rect
            x="138"
            y="118"
            width="30"
            height="3"
            rx="1"
            fill="#fff"
            className="st"
          />
          <rect
            x="138"
            y="124"
            width="22"
            height="3"
            rx="1"
            fill="#fff"
            opacity=".06"
          />
        </g>
      </g>

      {/* Subtle flow line */}
      <path
        d="M 218 85 Q 270 72 322 85"
        stroke="#6b665f"
        strokeWidth="1"
        strokeDasharray="4 4"
        opacity="0.15"
      />

      {/* Particles */}
      <g transform="translate(205,55)">
        <rect
          x="0"
          y="0"
          width="8"
          height="8"
          rx="2"
          fill="#1f6b53"
          className="pk p1"
        />
        <circle cx="5" cy="22" r="4" fill="#b87333" className="pk p2" />
        <rect
          x="10"
          y="38"
          width="6"
          height="6"
          rx="1.5"
          fill="#2a7a8a"
          className="pk p3"
        />
        <circle cx="0" cy="50" r="3.5" fill="#2a8a6a" className="pk p4" />
        <rect
          x="8"
          y="60"
          width="7"
          height="7"
          rx="2"
          fill="#d4a855"
          className="pk p5"
        />
        <circle cx="3" cy="12" r="3" fill="#1f6b53" className="pk p6" />
      </g>

      {/* Right browser (target) */}
      <g transform="translate(330,15)" filter="url(#wg-sh)">
        <g clipPath="url(#wg-bc)">
          <rect width="200" height="140" rx="8" fill="#1c1a17" />
          <rect width="200" height="22" fill="#26231e" rx="8" />
          <rect y="8" width="200" height="14" fill="#26231e" />
          <circle cx="12" cy="11" r="3" fill="#ff5f57" />
          <circle cx="22" cy="11" r="3" fill="#febc2e" />
          <circle cx="32" cy="11" r="3" fill="#28c840" />
          <rect x="46" y="6" width="100" height="10" rx="3" fill="#13110e" />

          {/* Hero */}
          <rect x="8" y="28" width="184" height="36" rx="5" className="ta" />
          <rect
            x="14"
            y="36"
            width="80"
            height="5"
            rx="2"
            fill="#fff"
            className="tt"
          />
          <rect
            x="14"
            y="46"
            width="55"
            height="4"
            rx="2"
            fill="#fff"
            className="tt"
          />

          {/* Button */}
          <rect x="8" y="70" width="44" height="14" rx="4" className="ta" />
          <rect
            x="14"
            y="75"
            width="28"
            height="4"
            rx="1.5"
            fill="#fff"
            opacity="0.8"
          />

          {/* Cards */}
          <rect x="8" y="92" width="56" height="40" rx="4" fill="#26231e" />
          <rect x="10" y="94" width="52" height="20" rx="3" className="tb" />
          <rect
            x="10"
            y="118"
            width="32"
            height="3"
            rx="1"
            fill="#fff"
            className="tt"
          />
          <rect
            x="10"
            y="124"
            width="24"
            height="3"
            rx="1"
            fill="#fff"
            opacity=".06"
          />

          <rect x="72" y="92" width="56" height="40" rx="4" fill="#26231e" />
          <rect x="74" y="94" width="52" height="20" rx="3" className="tc" />
          <rect
            x="74"
            y="118"
            width="28"
            height="3"
            rx="1"
            fill="#fff"
            className="tt"
          />
          <rect
            x="74"
            y="124"
            width="20"
            height="3"
            rx="1"
            fill="#fff"
            opacity=".06"
          />

          <rect x="136" y="92" width="56" height="40" rx="4" fill="#26231e" />
          <rect x="138" y="94" width="52" height="20" rx="3" className="td" />
          <rect
            x="138"
            y="118"
            width="30"
            height="3"
            rx="1"
            fill="#fff"
            className="tt"
          />
          <rect
            x="138"
            y="124"
            width="22"
            height="3"
            rx="1"
            fill="#fff"
            opacity=".06"
          />
        </g>
      </g>
    </svg>
  );
}
