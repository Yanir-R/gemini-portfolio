import { createPortal } from 'react-dom';

interface EnvelopeTooltipProps {
    show: boolean;
    buttonRect: DOMRect | null;
    handleEnvelopeClick: () => void;
    isMenuOpen?: boolean;
}

export const EnvelopeTooltip: React.FC<EnvelopeTooltipProps> = ({ show, buttonRect, handleEnvelopeClick, isMenuOpen = false }) => {
    if (!show || !buttonRect) return null;
    
    // Hide tooltip completely when menu is open on mobile
    if (isMenuOpen && window.innerWidth < 1024) return null;

    // Calculate position to keep tooltip within viewport
    const tooltipWidth = 200; // Approximate tooltip width
    const viewportWidth = window.innerWidth;
    const padding = 16; // Safe padding from screen edges
    
    const originalLeft = buttonRect.left - 15;
    let leftPosition = originalLeft;
    
    // Adjust if tooltip would go off the right edge
    if (leftPosition + tooltipWidth > viewportWidth - padding) {
        leftPosition = viewportWidth - tooltipWidth - padding;
    }
    
    // Adjust if tooltip would go off the left edge
    if (leftPosition < padding) {
        leftPosition = padding;
    }

    // Calculate arrow position relative to the button
    const buttonCenter = buttonRect.left + (buttonRect.width / 2);
    const arrowLeft = Math.max(12, Math.min(tooltipWidth - 12, buttonCenter - leftPosition));

    return createPortal(
        <div 
            className={`fixed animate-fadeIn ${isMenuOpen ? 'z-[10]' : 'z-[30]'}`}
            style={{
                top: `${buttonRect.top - 85}px`,
                left: `${leftPosition}px`,
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
                    max-w-[calc(100vw-2rem)]
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
                    <span className="animate-bounce">
                        Click to send me an email{window.innerWidth >= 768 ? ' 📧' : ''}
                    </span>
                </div>
                <div 
                    className="absolute -bottom-[6px] w-3 h-3 
                        bg-[#0f1218]
                        border-r border-b border-[#9d4edd]/30
                        rotate-45
                        shadow-[2px_2px_5px_rgba(0,0,0,0.2)]"
                    style={{ left: `${arrowLeft}px` }}
                />
            </div>
        </div>,
        document.body
    );
}; 