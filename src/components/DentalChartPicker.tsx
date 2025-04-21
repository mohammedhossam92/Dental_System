import React, { useState } from 'react';

interface DentalChartPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (toothNumber: string) => void;
  mode?: 'adult' | 'pediatric';
  setMode?: (mode: 'adult' | 'pediatric') => void;
}

// ISO 3950: All quadrants start from center (central incisor) and count outward
const adultTeethQuadrants = [
  ['11','12','13','14','15','16','17','18'], // UR (center to right)
  ['21','22','23','24','25','26','27','28'], // UL (center to left)
  ['31','32','33','34','35','36','37','38'], // LL (center to left)
  ['41','42','43','44','45','46','47','48'], // LR (center to right)
];

// For pediatric, ensure LL starts with 71 at center and LR with 81 at center
const pediatricTeethQuadrants = [
  ['51','52','53','54','55'], // UR (center to right)
  ['61','62','63','64','65'], // UL (center to left)
  ['71','72','73','74','75'], // LL (center to left)
  ['81','82','83','84','85'], // LR (center to right)
];

export const DentalChartPicker: React.FC<DentalChartPickerProps> = ({
  open,
  onClose,
  onSelect,
  mode: controlledMode,
  setMode: controlledSetMode,
}) => {
  const [uncontrolledMode, setUncontrolledMode] = useState<'adult' | 'pediatric'>('adult');
  const mode = controlledMode ?? uncontrolledMode;
  const setMode = controlledSetMode ?? setUncontrolledMode;

  if (!open) return null;

  // ISO 3950: Top arch (quadrants 1 & 2), bottom arch (quadrants 3 & 4)
  const quadrants = mode === 'adult' ? adultTeethQuadrants : pediatricTeethQuadrants;
  const quadrantLabels = [
    'Upper Right (1)', 'Upper Left (2)', 'Lower Right (4)', 'Lower Left (3)'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-full ${mode === 'adult' ? 'max-w-4xl' : 'max-w-md sm:max-w-lg md:max-w-xl'}`}>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-base sm:text-lg font-bold">Select Tooth Number (ISO 3950)</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
        </div>
        <div className="flex justify-center mb-3 gap-2 sm:gap-4">
          <button type="button"
            className={`px-2 sm:px-4 py-1 sm:py-2 rounded ${mode === 'adult' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}
            onClick={() => setMode('adult')}
          >
            Adult Teeth
          </button>
          <button type="button"
            className={`px-2 sm:px-4 py-1 sm:py-2 rounded ${mode === 'pediatric' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}
            onClick={() => setMode('pediatric')}
          >
            Pediatric Teeth
          </button>
        </div>

        {/* Top Arch */}
        <div className="mb-2 w-full">
          <div className="flex justify-between px-2 sm:px-6 text-xs text-gray-500 dark:text-gray-300 w-full">
            <span className="truncate w-1/2 text-left">{quadrantLabels[0]}</span>
            <span className="truncate w-1/2 text-right">{quadrantLabels[1]}</span>
          </div>
          <div className={`flex justify-center ${mode === 'adult' ? 'gap-0.5' : 'gap-2'} sm:gap-8 mt-1 w-full`}>
            {/* Quadrant 1: UR (center to right) */}
            <div className={`flex flex-row-reverse ${mode === 'adult' ? 'gap-0' : 'gap-0.5'} sm:gap-1`}>
              {quadrants[0].map(tooth => (
                <button
                  key={tooth}
                  className={`
  ${mode === 'adult' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'}
  sm:w-10 sm:h-10 sm:text-lg
  bg-gray-100 dark:bg-gray-700 rounded hover:bg-indigo-200 dark:hover:bg-indigo-600 focus:outline-none font-semibold flex items-center justify-center
`}
                  onClick={() => { onSelect(tooth); onClose(); }}
                >
                  {tooth}
                </button>
              ))}
            </div>
            {/* Quadrant 2: UL (center to left) */}
            <div className={`flex ${mode === 'adult' ? 'gap-0' : 'gap-0.5'} sm:gap-1`}>
              {quadrants[1].map(tooth => (
                <button
                  key={tooth}
                  className={`
  ${mode === 'adult' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'}
  sm:w-10 sm:h-10 sm:text-lg
  bg-gray-100 dark:bg-gray-700 rounded hover:bg-indigo-200 dark:hover:bg-indigo-600 focus:outline-none font-semibold flex items-center justify-center
`}
                  onClick={() => { onSelect(tooth); onClose(); }}
                >
                  {tooth}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Divider for arches */}
        <div className="flex justify-center my-1">
          <div className="w-4/5 h-px bg-gray-300 dark:bg-gray-600" />
        </div>
        {/* Bottom Arch */}
        <div className="mb-2 w-full">
          <div className="flex justify-between px-2 sm:px-6 text-xs text-gray-500 dark:text-gray-300 w-full">
            <span className="truncate w-1/2 text-left">{quadrantLabels[2]}</span>
            <span className="truncate w-1/2 text-right">{quadrantLabels[3]}</span>
          </div>
          {/* Lower arch: center is 31 (LL) and 41 (LR) for adults, 71 and 81 for pediatric */}
          <div className={`flex justify-center ${mode === 'adult' ? 'gap-0.5' : 'gap-2'} sm:gap-8 mt-1 w-full`}>
            {/* Quadrant 4: LR (center to right, e.g. 41/81 at center) */}
            <div className={`flex ${mode === 'adult' ? 'gap-0' : 'gap-0.5'} sm:gap-1`}>
              {/* For adult, center 41, then 42-48 to the right, 48 at far right. For pediatric, 81 at center. */}
              {mode === 'adult'
                ? quadrants[3].slice().reverse().map(tooth => (
                    <button
                      key={tooth}
                      className={`
  ${mode === 'adult' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'}
  sm:w-10 sm:h-10 sm:text-lg
  bg-gray-100 dark:bg-gray-700 rounded hover:bg-indigo-200 dark:hover:bg-indigo-600 focus:outline-none font-semibold flex items-center justify-center
`}
                      onClick={() => { onSelect(tooth); onClose(); }}
                    >
                      {tooth}
                    </button>
                  ))
                : quadrants[3].slice().reverse().map(tooth => (
                    <button
                      key={tooth}
                      className={`
  ${mode === 'adult' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'}
  sm:w-10 sm:h-10 sm:text-lg
  bg-gray-100 dark:bg-gray-700 rounded hover:bg-indigo-200 dark:hover:bg-indigo-600 focus:outline-none font-semibold flex items-center justify-center
`}
                      onClick={() => { onSelect(tooth); onClose(); }}
                    >
                      {tooth}
                    </button>
                  ))}
            </div>
            {/* Quadrant 3: LL (center to left, e.g. 31/71 at center) */}
            <div className={`flex ${mode === 'adult' ? 'gap-0' : 'gap-0.5'} sm:gap-1`}>
              {quadrants[2].map(tooth => (
                <button
                  key={tooth}
                  className={`
  ${mode === 'adult' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'}
  sm:w-10 sm:h-10 sm:text-lg
  bg-gray-100 dark:bg-gray-700 rounded hover:bg-indigo-200 dark:hover:bg-indigo-600 focus:outline-none font-semibold flex items-center justify-center
`}
                  onClick={() => { onSelect(tooth); onClose(); }}
                >
                  {tooth}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
