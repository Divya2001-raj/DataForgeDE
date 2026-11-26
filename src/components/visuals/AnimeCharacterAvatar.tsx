import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { InterviewerProfile } from '../../types/platform';

export type CharacterVariant = 'copilot' | 'ananya' | 'kevin';

interface AnimeCharacterAvatarProps {
  variant?: CharacterVariant;
  profile?: InterviewerProfile;
  isSpeaking?: boolean;
  nodTrigger?: number;
  size?: 'sm' | 'md' | 'studio';
  className?: string;
}

export const AnimeCharacterAvatar: React.FC<AnimeCharacterAvatarProps> = ({
  variant = 'copilot',
  profile,
  isSpeaking = false,
  nodTrigger = 0,
  size = 'studio',
  className = '',
}) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [mouthFrame, setMouthFrame] = useState<0 | 1 | 2>(0);
  const [nodding, setNodding] = useState(false);

  const uniqueKey = profile ? profile.id : variant;

  useEffect(() => {
    const hashShift = uniqueKey.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 900;
    const blinkLoop = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 3400 + hashShift);
    return () => clearInterval(blinkLoop);
  }, [uniqueKey]);

  useEffect(() => {
    if (!isSpeaking) {
      setMouthFrame(0);
      return;
    }
    const talkInterval = setInterval(() => {
      setMouthFrame((prev) => ((prev + 1) % 3) as 0 | 1 | 2);
    }, 135);
    return () => clearInterval(talkInterval);
  }, [isSpeaking]);

  useEffect(() => {
    if (nodTrigger <= 0) return;
    setNodding(true);
    const t = setTimeout(() => setNodding(false), 700);
    return () => clearTimeout(t);
  }, [nodTrigger]);

  const palette = profile
    ? {
        skin: profile.skin,
        skinShadow: profile.skinShadow,
        hair: profile.hair,
        hairHighlight: profile.hairHighlight,
        hairStyle: profile.hairStyle,
        outfit: profile.outfit,
        accent: 'var(--accent-primary)',
        glassesStyle: profile.glassesStyle,
        glassesColor: profile.glassesColor,
        bgTop: profile.bgTint,
        bgBottom: '#09090B',
      }
    : variant === 'ananya'
    ? {
        skin: '#D69E7E',
        skinShadow: '#BA7E5E',
        hair: '#14141B',
        hairHighlight: '#3B2F63',
        hairStyle: 'long' as const,
        outfit: '#1A1A24',
        accent: 'var(--accent-primary)',
        glassesStyle: 'rect' as const,
        glassesColor: '#E4E4E7',
        bgTop: '#141122',
        bgBottom: '#09090B',
      }
    : variant === 'kevin'
    ? {
        skin: '#EED0BA',
        skinShadow: '#D4AC92',
        hair: '#161822',
        hairHighlight: '#4C3D82',
        hairStyle: 'short' as const,
        outfit: '#1F202C',
        accent: 'var(--accent-primary)',
        glassesStyle: 'rect' as const,
        glassesColor: 'var(--accent-primary)',
        bgTop: '#12131F',
        bgBottom: '#09090B',
      }
    : {
        skin: '#E8C5B0',
        skinShadow: '#C99F88',
        hair: '#1C172B',
        hairHighlight: 'var(--accent-primary)',
        hairStyle: 'long' as const,
        outfit: '#14141D',
        accent: 'var(--accent-primary)',
        glassesStyle: 'rect' as const,
        glassesColor: '#E4E4E7',
        bgTop: '#161322',
        bgBottom: '#09090B',
      };

  const dims =
    size === 'sm'
      ? 'w-9 h-9 rounded-full'
      : size === 'md'
      ? 'w-14 h-14 rounded-2xl'
      : 'w-full h-full rounded-xl';

  return (
    <div className={`relative overflow-hidden select-none ${dims} ${className}`}>
      {isSpeaking && size !== 'sm' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          <motion.div
            initial={{ scale: 0.85, opacity: 0.6 }}
            animate={{ scale: 1.15, opacity: 0 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
            className="w-40 h-40 rounded-full border-2 border-accent/60"
          />
          <motion.div
            initial={{ scale: 0.75, opacity: 0.5 }}
            animate={{ scale: 1.05, opacity: 0 }}
            transition={{ duration: 1.2, delay: 0.4, repeat: Infinity, ease: 'easeOut' }}
            className="absolute w-36 h-36 rounded-full border border-accent/50"
          />
        </div>
      )}

      <svg
        viewBox="0 0 320 240"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={`${profile?.name || variant} anime mentor portrait`}
      >
        <defs>
          <linearGradient id={`bg-${uniqueKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.bgTop} />
            <stop offset="100%" stopColor={palette.bgBottom} />
          </linearGradient>
          <radialGradient id={`rim-${uniqueKey}`} cx="50%" cy="38%" r="55%">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.32" />
            <stop offset="70%" stopColor="var(--accent-primary)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#09090B" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`hair-${uniqueKey}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={palette.hairHighlight} />
            <stop offset="55%" stopColor={palette.hair} />
            <stop offset="100%" stopColor="#09090B" />
          </linearGradient>
        </defs>

        <rect width="320" height="240" fill={`url(#bg-${uniqueKey})`} />
        <rect width="320" height="240" fill={`url(#rim-${uniqueKey})`} />

        {size === 'studio' && (
          <g opacity="0.16" stroke="var(--accent-primary)" strokeWidth="1">
            <line x1="28" y1="0" x2="28" y2="240" />
            <line x1="44" y1="0" x2="44" y2="240" />
            <line x1="60" y1="0" x2="60" y2="240" />
            <rect x="228" y="24" width="72" height="44" rx="4" fill="none" strokeOpacity="0.45" />
            <path d="M 238 46 L 256 38 L 274 50 L 290 36" fill="none" stroke="#10B981" strokeWidth="1.5" />
          </g>
        )}

        <motion.g
          animate={{
            y: nodding ? [0, 5, -2, 4, 0] : [0, -2.2, 0],
          }}
          transition={
            nodding
              ? { duration: 0.65, ease: 'easeInOut' }
              : { duration: 3.4, repeat: Infinity, ease: 'easeInOut' }
          }
        >
          {/* Back Hair Variations */}
          {palette.hairStyle === 'long' && (
            <path
              d="M 100 84 C 92 135, 95 182, 112 206 L 208 206 C 225 182, 228 135, 220 84 Z"
              fill={palette.hair}
            />
          )}
          {palette.hairStyle === 'bob' && (
            <path
              d="M 103 84 C 98 118, 102 152, 116 164 L 204 164 C 218 152, 222 118, 217 84 Z"
              fill={palette.hair}
            />
          )}
          {palette.hairStyle === 'curly' && (
            <path
              d="M 96 86 C 86 112, 90 148, 112 162 L 208 162 C 230 148, 234 112, 224 86 C 216 44, 104 44, 96 86 Z"
              fill={palette.hair}
            />
          )}

          {/* Shoulders & Tech Hoodie / Blazer */}
          <path
            d="M 62 240 C 66 196, 102 178, 160 178 C 218 178, 254 196, 258 240 Z"
            fill={palette.outfit}
            stroke="#27272A"
            strokeWidth="1.5"
          />
          <path
            d="M 128 180 L 160 226 L 192 180"
            fill="none"
            stroke={palette.accent}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <rect x="150" y="182" width="20" height="58" fill="#101016" opacity="0.7" />

          {/* Neck + Cel Shadow */}
          <rect x="144" y="148" width="32" height="36" rx="10" fill={palette.skin} />
          <path d="M 144 152 Q 160 166 176 152 L 176 164 Q 160 174 144 164 Z" fill={palette.skinShadow} />

          {/* Headphones */}
          <path d="M 104 108 C 102 52, 218 52, 216 108" fill="none" stroke="#27272A" strokeWidth="7" strokeLinecap="round" />
          <path d="M 104 108 C 102 54, 218 54, 216 108" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" opacity="0.85" />

          {/* Face Contour */}
          <path
            d="M 114 92 C 114 60, 206 60, 206 92 C 207 128, 192 156, 160 160 C 128 156, 113 128, 114 92 Z"
            fill={palette.skin}
            stroke="#18181B"
            strokeWidth="1.2"
          />
          <path
            d="M 122 134 C 132 150, 148 156, 160 156 C 172 156, 188 150, 198 134 C 190 148, 174 158, 160 158 C 146 158, 130 148, 122 134 Z"
            fill={palette.skinShadow}
            opacity="0.55"
          />

          <rect x="100" y="96" width="15" height="36" rx="7" fill="#18181F" stroke="var(--accent-primary)" strokeWidth="1.6" />
          <rect x="205" y="96" width="15" height="36" rx="7" fill="#18181F" stroke="var(--accent-primary)" strokeWidth="1.6" />
          <path d="M 108 124 Q 116 146 146 146" fill="none" stroke="#3F3F46" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="147" cy="146" r="3" fill={isSpeaking ? '#10B981' : 'var(--accent-primary)'} />

          {/* Eyebrows */}
          <path d="M 128 96 Q 139 92 149 95" fill="none" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M 171 95 Q 181 92 192 96" fill="none" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" />

          {/* Eyes */}
          {isBlinking ? (
            <g stroke="#18181B" strokeWidth="2.4" strokeLinecap="round">
              <path d="M 130 107 Q 139 111 148 107" fill="none" />
              <path d="M 172 107 Q 181 111 190 107" fill="none" />
            </g>
          ) : (
            <g>
              <ellipse cx="139" cy="107" rx="8.5" ry="6" fill="#FFFFFF" />
              <circle cx="140" cy="107" r="4.6" fill="#1E1B2E" />
              <circle cx="140" cy="107" r="2.2" fill="#09090B" />
              <circle cx="142" cy="105" r="1.4" fill="#FFFFFF" />
              <path d="M 130 105 Q 139 100 148 105" fill="none" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" />

              <ellipse cx="181" cy="107" rx="8.5" ry="6" fill="#FFFFFF" />
              <circle cx="180" cy="107" r="4.6" fill="#1E1B2E" />
              <circle cx="180" cy="107" r="2.2" fill="#09090B" />
              <circle cx="182" cy="105" r="1.4" fill="#FFFFFF" />
              <path d="M 172 105 Q 181 100 190 105" fill="none" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" />
            </g>
          )}

          {/* Glasses Styles */}
          {palette.glassesStyle === 'rect' && (
            <g fill="rgba(var(--accent-rgb), 0.08)" stroke={palette.glassesColor} strokeWidth="1.6">
              <rect x="125" y="99" width="28" height="17" rx="4" />
              <rect x="167" y="99" width="28" height="17" rx="4" />
              <line x1="153" y1="106" x2="167" y2="106" />
            </g>
          )}
          {palette.glassesStyle === 'round' && (
            <g fill="rgba(var(--accent-rgb), 0.08)" stroke={palette.glassesColor} strokeWidth="1.6">
              <circle cx="139" cy="107" r="13" />
              <circle cx="181" cy="107" r="13" />
              <line x1="152" y1="107" x2="168" y2="107" />
            </g>
          )}

          {/* Nose */}
          <path d="M 160 112 L 158 124 L 163 125" fill="none" stroke={palette.skinShadow} strokeWidth="1.6" strokeLinecap="round" />

          {/* Lip-Sync Mouth */}
          {mouthFrame === 0 && (
            <path d="M 150 137 Q 160 142 170 137" fill="none" stroke="#7F3F3F" strokeWidth="2.2" strokeLinecap="round" />
          )}
          {mouthFrame === 1 && (
            <ellipse cx="160" cy="138" rx="7" ry="3.5" fill="#7F2F3A" stroke="#4C1D24" strokeWidth="1.2" />
          )}
          {mouthFrame === 2 && (
            <ellipse cx="160" cy="139" rx="9" ry="5.5" fill="#68222C" stroke="#4C1D24" strokeWidth="1.2" />
          )}

          {/* Front Hair Style Variations */}
          {palette.hairStyle === 'long' && (
            <path
              d="M 110 95 C 110 52, 210 52, 210 95 C 200 72, 182 68, 162 76 C 142 66, 122 72, 110 95 Z"
              fill={`url(#hair-${uniqueKey})`}
            />
          )}
          {palette.hairStyle === 'bob' && (
            <path
              d="M 108 94 C 108 48, 212 48, 212 94 C 194 78, 178 74, 152 80 C 134 74, 120 78, 108 94 Z"
              fill={`url(#hair-${uniqueKey})`}
            />
          )}
          {palette.hairStyle === 'short' && (
            <path
              d="M 112 94 C 110 50, 212 48, 208 94 C 198 70, 178 65, 165 73 C 150 64, 128 70, 112 94 Z"
              fill={`url(#hair-${uniqueKey})`}
            />
          )}
          {palette.hairStyle === 'parted' && (
            <path
              d="M 110 94 C 108 46, 212 48, 210 94 C 198 72, 180 62, 148 84 C 134 70, 120 76, 110 94 Z"
              fill={`url(#hair-${uniqueKey})`}
            />
          )}
          {palette.hairStyle === 'curly' && (
            <path
              d="M 106 96 C 104 42, 216 42, 214 96 C 204 72, 188 64, 174 74 C 160 62, 142 66, 132 76 C 122 66, 112 74, 106 96 Z"
              fill={`url(#hair-${uniqueKey})`}
            />
          )}

          <path d="M 128 66 Q 160 56 192 66" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
        </motion.g>
      </svg>
    </div>
  );
};
