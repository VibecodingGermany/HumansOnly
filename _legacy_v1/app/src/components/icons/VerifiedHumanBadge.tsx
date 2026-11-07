export default function VerifiedHumanBadge({ className = "" }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Circle background */}
            <circle cx="12" cy="12" r="11" fill="#FF5733" />

            {/* Fist icon in white */}
            <g transform="translate(7, 5)" fill="white">
                <path
                    d="M4,0 L6,0 C6.5,0 7,0.5 7,1 L7,4 C7,4.5 6.5,5 6,5 L5,5 L5,7 C5,7.5 4.7,8 4.2,8.5 L3,9.5 C2.8,9.7 2.2,9.7 2,9.5 L1.5,9 L1.5,6 C1.5,5.7 1.2,5.5 0.9,5.5 L0.5,5.5 C0.2,5.5 0,5.3 0,5 L0,4 C0,3.7 0.2,3.5 0.5,3.5 L0.9,3.5 C1.2,3.5 1.5,3.3 1.5,3 L1.5,2 C1.5,1.7 1.2,1.5 0.9,1.5 L0.5,1.5 C0.2,1.5 0,1.3 0,1 L0,0.5 C0,0.2 0.2,0 0.5,0 L2.5,0 C2.8,0 3,0.2 3,0.5 L3,1.5 C3,1.8 3.2,2 3.5,2 L4,2 C4.3,2 4.5,1.8 4.5,1.5 L4.5,0 L4,0 Z"
                />
            </g>

            {/* Border */}
            <circle cx="12" cy="12" r="11" fill="none" stroke="white" strokeWidth="1.5" />
        </svg>
    );
}
