import { createPortal } from 'react-dom';

interface EnvelopeTooltipProps {
    show: boolean;
    buttonRect: DOMRect | null;
    handleEnvelopeClick: () => void;
}

export const EnvelopeTooltip: React.FC<EnvelopeTooltipProps> = ({ show, buttonRect, handleEnvelopeClick }) => {
    if (!show || !buttonRect) return null;

    return createPortal(
        <div 
            className="fixed z-[9999] animate-fadeIn"
            style={{
                top: `${buttonRect.top - 65}px`,
                left: `${buttonRect.left - 15}px`,
            }}
        >
            <div 
                className="px-4 py-2.5 text-sm font-medium
                    bg-[#0f1218] 
                    text-white rounded-md
                    border border-[#9d4edd]/30
                    shadow-[0_0_15px_rgba(157,78,221,0.15)]
                    backdrop-blur-md
                    animate-float
                    transition-all duration-300
                    whitespace-nowrap
                    relative
                    before:absolute before:inset-[1px] before:rounded-[3px]
                    before:bg-gradient-to-r before:from-[#0f1218] before:to-[#151822]
                    before:z-[-1]
                    cursor-pointer
                    hover:scale-105
                    active:scale-95"
                onClick={(e) => {
                    e.stopPropagation();
                    handleEnvelopeClick();
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleEnvelopeClick();
                    }
                }}
                >
                <div className="flex gap-3 items-center pl-2">
                    <span className="animate-bounce">🚀</span>
                </div>
                <div className="absolute -bottom-[6px] right-5 w-3 h-3 
                    bg-[#0f1218]
                    border-r border-b border-[#9d4edd]/30
                    rotate-45
                    shadow-[2px_2px_5px_rgba(0,0,0,0.2)]" />
            </div>
        </div>,
        document.body
    );
}; 