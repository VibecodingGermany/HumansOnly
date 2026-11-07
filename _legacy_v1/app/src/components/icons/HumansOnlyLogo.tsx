export default function HumansOnlyLogo({ className = "" }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 500 500"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
        >
            {/* Simplified fist icon - represents the Humans Only logo */}
            <g transform="translate(150, 80)">
                {/* Fist shape */}
                <path
                    d="M100,0 L140,0 C145,0 150,5 150,10 L150,80 C150,85 145,90 140,90 L110,90 L110,140 C110,150 105,160 95,170 L70,190 C65,195 55,195 50,190 L40,180 L40,120 C40,115 35,110 30,110 L20,110 C15,110 10,105 10,100 L10,80 C10,75 15,70 20,70 L30,70 C35,70 40,65 40,60 L40,40 C40,35 35,30 30,30 L20,30 C15,30 10,25 10,20 L10,10 C10,5 15,0 20,0 L60,0 C65,0 70,5 70,10 L70,30 C70,35 75,40 80,40 L90,40 C95,40 100,35 100,30 L100,0 Z"
                    fill="#FF5733"
                    stroke="#1A1A1A"
                    strokeWidth="8"
                />

                {/* Finger details */}
                <line x1="90" y1="0" x2="90" y2="40" stroke="#1A1A1A" strokeWidth="4" />
                <line x1="110" y1="0" x2="110" y2="40" stroke="#1A1A1A" strokeWidth="4" />
                <line x1="130" y1="10" x2="130" y2="50" stroke="#1A1A1A" strokeWidth="4" />
            </g>

            {/* Text "HO" simplified */}
            <text
                x="250"
                y="380"
                fontSize="80"
                fontWeight="900"
                textAnchor="middle"
                fill="#1A1A1A"
                fontFamily="Arial Black, sans-serif"
            >
                HO
            </text>
        </svg>
    );
}
