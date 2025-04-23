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
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const mode = controlledMode ?? uncontrolledMode;
  const setMode = controlledSetMode ?? setUncontrolledMode;

  if (!open) return null;

  // ISO 3950: Top arch (quadrants 1 & 2), bottom arch (quadrants 3 & 4)
  const quadrants = mode === 'adult' ? adultTeethQuadrants : pediatricTeethQuadrants;
  const quadrantLabels = [
    'Upper Right (1)', 'Upper Left (2)', 'Lower Right (4)', 'Lower Left (3)'
  ];

  const handleToothSelect = (tooth: string) => {
    setSelectedTooth(tooth);
    onSelect(tooth);
  };

  const handleModalClick = (e: React.MouseEvent) => {
    // Stop propagation to prevent accidentally submitting a parent form
    e.stopPropagation();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={handleModalClick}>
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-full ${mode === 'adult' ? 'max-w-4xl' : 'max-w-md sm:max-w-lg md:max-w-xl'}`}>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-base sm:text-lg font-bold">Select Tooth Number (ISO 3950)</h2>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >✕</button>
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
          <div
            className={`w-full ${mode === 'adult' ? 'overflow-x-auto min-w-0' : ''}`}
            style={mode === 'adult' ? { WebkitOverflowScrolling: 'touch' } : {}}
          >
            <div
              className={`flex items-center ${mode === 'adult' ? 'justify-start sm:justify-center' : 'justify-center'} gap-2 sm:gap-2 mt-1`}
            >
              {/* Quadrant 1: UR (center to right) */}
              <div className="relative flex flex-row-reverse gap-2 sm:gap-2 items-center h-10 sm:h-12">
              {quadrants[0].map((tooth, idx, arr) => {
  let color = '';
  const n = Number(tooth);
  if (n >= 11 && n <= 18) color = 'bg-blue-200 dark:bg-blue-700';
  else if (n >= 21 && n <= 28) color = 'bg-green-200 dark:bg-green-700';
  else if (n >= 31 && n <= 38) color = 'bg-pink-200 dark:bg-pink-700';
  else if (n >= 41 && n <= 48) color = 'bg-purple-200 dark:bg-purple-700';
  else if (n >= 51 && n <= 55) color = 'bg-yellow-200 dark:bg-yellow-600';
  else if (n >= 61 && n <= 65) color = 'bg-orange-200 dark:bg-orange-600';
  else if (n >= 71 && n <= 75) color = 'bg-teal-200 dark:bg-teal-700';
  else if (n >= 81 && n <= 85) color = 'bg-red-200 dark:bg-red-700';
  // Quadrant 1: UR (blue)

  // Insert gap after 11 if next is 21 (UR to UL center)
  if (mode === 'adult' && tooth === 11 && arr[idx + 1] === 21) {
    return [
      <button
        key={tooth}
        className={`w-6 h-6 text-[10px] sm:w-10 sm:h-10 sm:text-lg rounded hover:bg-indigo-200 dark:hover:bg-indigo-600 focus:outline-none font-semibold flex items-center justify-center ${color} ${selectedTooth === tooth ? 'ring-2 ring-indigo-600' : ''}`}
        onClick={() => handleToothSelect(tooth)}
      >
        {tooth}
      </button>,
      <div key="gap-11-21" className="border-l-2 border-white h-8 sm:h-12 mx-2 flex-shrink-0" />
    ];
  }
  return (
    <button
      key={tooth}
      className={`w-6 h-6 text-[10px] sm:w-10 sm:h-10 sm:text-lg rounded hover:bg-indigo-200 dark:hover:bg-indigo-600 focus:outline-none font-semibold flex items-center justify-center ${color} ${selectedTooth === tooth ? 'ring-2 ring-indigo-600' : ''}`}
      onClick={() => handleToothSelect(tooth)}
    >
      {tooth}
    </button>
  );
})}
            </div>
            {/* Quadrant 2: UL (center to left) */}
            <div className={`flex items-center gap-2 sm:gap-2`}>
              {quadrants[1].map((tooth, idx, arr) => {
  let color = '';
  const n = Number(tooth);
  if (n >= 11 && n <= 18) color = 'bg-blue-200 dark:bg-blue-700';
  else if (n >= 21 && n <= 28) color = 'bg-green-200 dark:bg-green-700';
  else if (n >= 31 && n <= 38) color = 'bg-pink-200 dark:bg-pink-700';
  else if (n >= 41 && n <= 48) color = 'bg-purple-200 dark:bg-purple-700';
  else if (n >= 51 && n <= 55) color = 'bg-yellow-200 dark:bg-yellow-600';
  else if (n >= 61 && n <= 65) color = 'bg-orange-200 dark:bg-orange-600';
  else if (n >= 71 && n <= 75) color = 'bg-teal-200 dark:bg-teal-700';
  else if (n >= 81 && n <= 85) color = 'bg-red-200 dark:bg-red-700';
  // Quadrant 2: UL (green)

  // Insert gap after 21 if previous was 11 (UL after UR)
  if (mode === 'adult' && tooth === 21 && arr[idx - 1] === 11) {
    return [
      <div key="gap-11-21" className="border-l-2 border-white h-8 sm:h-12 mx-2 flex-shrink-0" />,
      <button
        key={tooth}
        className={`w-6 h-6 text-[10px] sm:w-10 sm:h-10 sm:text-lg rounded hover:bg-indigo-200 dark:hover:bg-indigo-600 focus:outline-none font-semibold flex items-center justify-center ${color} ${selectedTooth === tooth ? 'ring-2 ring-indigo-600' : ''}`}
        onClick={() => handleToothSelect(tooth)}
      >
        {tooth}
      </button>
    ];
  }
  return (
    <button
      key={tooth}
      className={`w-6 h-6 text-[10px] sm:w-10 sm:h-10 sm:text-lg rounded hover:bg-indigo-200 dark:hover:bg-indigo-600 focus:outline-none font-semibold flex items-center justify-center ${color} ${selectedTooth === tooth ? 'ring-2 ring-indigo-600' : ''}`}
      onClick={() => handleToothSelect(tooth)}
    >
      {tooth}
    </button>
  );
})}
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
          <div
            className={`w-full ${mode === 'adult' ? 'overflow-x-auto min-w-0' : ''}`}
            style={mode === 'adult' ? { WebkitOverflowScrolling: 'touch' } : {}}
          >
            <div
              className={`flex items-center ${mode === 'adult' ? 'justify-start sm:justify-center' : 'justify-center'} gap-2 sm:gap-2 mt-1`}
            >
              {/* Quadrant 4: LR (center to right, e.g. 41/81 at center) */}
              <div className={`flex items-center gap-2 sm:gap-2`}>
              {/* For adult, center 41, then 42-48 to the right, 48 at far right. For pediatric, 81 at center. */}
              {mode === 'adult'
                 ? quadrants[3].slice().reverse().map((tooth, idx, arr) => {
  let color = '';
  const n = Number(tooth);
  if (n >= 11 && n <= 18) color = 'bg-blue-200 dark:bg-blue-700';
  else if (n >= 21 && n <= 28) color = 'bg-green-200 dark:bg-green-700';
  else if (n >= 31 && n <= 38) color = 'bg-pink-200 dark:bg-pink-700';
  else if (n >= 41 && n <= 48) color = 'bg-purple-200 dark:bg-purple-700';
  else if (n >= 51 && n <= 55) color = 'bg-yellow-200 dark:bg-yellow-600';
  else if (n >= 61 && n <= 65) color = 'bg-orange-200 dark:bg-orange-600';
  else if (n >= 71 && n <= 75) color = 'bg-teal-200 dark:bg-teal-700';
  else if (n >= 81 && n <= 85) color = 'bg-red-200 dark:bg-red-700';
  // Quadrant 4: LR (purple)

                     // Insert gap after 41 if next is 31 (LR to LL center)
                     if (tooth === 41 && arr[idx + 1] === 31) {
                       return [
                         <button
                           key={tooth}
                           className={`w-6 h-6 text-[10px] sm:w-10 sm:h-10 sm:text-lg bg-purple-100 dark:bg-purple-700 rounded hover:bg-indigo-200 dark:hover:bg-indigo-600 focus:outline-none font-semibold flex items-center justify-center ${selectedTooth === tooth ? 'ring-2 ring-indigo-600' : ''}`}
                           onClick={() => handleToothSelect(tooth)}
                         >
                           {tooth}
                         </button>,
                         <div key="gap-41-31" className="border-l-2 border-white h-8 sm:h-12 mx-2 flex-shrink-0" />
                       ];
                     }
                     return (
                       <button
                         key={tooth}
                         className={`w-6 h-6 text-[10px] sm:w-10 sm:h-10 sm:text-lg rounded hover:bg-indigo-200 dark:hover:bg-indigo-600 focus:outline-none font-semibold flex items-center justify-center ${color} ${selectedTooth === tooth ? 'ring-2 ring-indigo-600' : ''}`}
                         onClick={() => handleToothSelect(tooth)}
                       >
                         {tooth}
                       </button>
                     );
                   })
                 : quadrants[3].slice().reverse().map(tooth => {
                    let color = '';
                    const n = Number(tooth);
                    if (n >= 11 && n <= 18) color = 'bg-blue-200 dark:bg-blue-700';
                    else if (n >= 21 && n <= 28) color = 'bg-green-200 dark:bg-green-700';
                    else if (n >= 31 && n <= 38) color = 'bg-pink-200 dark:bg-pink-700';
                    else if (n >= 41 && n <= 48) color = 'bg-purple-200 dark:bg-purple-700';
                    else if (n >= 51 && n <= 55) color = 'bg-yellow-200 dark:bg-yellow-600';
                    else if (n >= 61 && n <= 65) color = 'bg-orange-200 dark:bg-orange-600';
                    else if (n >= 71 && n <= 75) color = 'bg-teal-200 dark:bg-teal-700';
                    else if (n >= 81 && n <= 85) color = 'bg-red-200 dark:bg-red-700';
                    return (
                      <button
                        key={tooth}
                        className={`w-6 h-6 text-[10px] sm:w-10 sm:h-10 sm:text-lg rounded hover:bg-indigo-200 dark:hover:bg-indigo-600 focus:outline-none font-semibold flex items-center justify-center ${color} ${selectedTooth === tooth ? 'ring-2 ring-indigo-600' : ''}`}
                        onClick={() => handleToothSelect(tooth)}
                      >
                        {tooth}
                      </button>
                    );
                  })}
            </div>
            {/* Quadrant 3: LL (center to left, e.g. 31/71 at center) */}
            <div className={`flex items-center gap-2 sm:gap-2`}>

{quadrants[2].map((tooth, idx, arr) => {
  let color = '';
  const n = Number(tooth);
  if (n >= 11 && n <= 18) color = 'bg-blue-200 dark:bg-blue-700';
  else if (n >= 21 && n <= 28) color = 'bg-green-200 dark:bg-green-700';
  else if (n >= 31 && n <= 38) color = 'bg-pink-200 dark:bg-pink-700';
  else if (n >= 41 && n <= 48) color = 'bg-purple-200 dark:bg-purple-700';
  else if (n >= 51 && n <= 55) color = 'bg-yellow-200 dark:bg-yellow-600';
  else if (n >= 61 && n <= 65) color = 'bg-orange-200 dark:bg-orange-600';
  else if (n >= 71 && n <= 75) color = 'bg-teal-200 dark:bg-teal-700';
  else if (n >= 81 && n <= 85) color = 'bg-red-200 dark:bg-red-700';
  // Quadrant 3: LL (pink)

  // Insert gap after 31 if next is 41 (LL to LR center)
  if (mode === 'adult' && tooth === 31 && arr[idx + 1] === 41) {
    return [
      <button
        key={tooth}
        className={`w-6 h-6 text-[10px] sm:w-10 sm:h-10 sm:text-lg rounded hover:bg-indigo-200 dark:hover:bg-indigo-600 focus:outline-none font-semibold flex items-center justify-center ${color} ${selectedTooth === tooth ? 'ring-2 ring-indigo-600' : ''}`}
        onClick={() => handleToothSelect(tooth)}
      >
        {tooth}
      </button>,

    ];
  }
  return (
    <button
      key={tooth}
      className={`w-6 h-6 text-[10px] sm:w-10 sm:h-10 sm:text-lg rounded hover:bg-indigo-200 dark:hover:bg-indigo-600 focus:outline-none font-semibold flex items-center justify-center ${color} ${selectedTooth === tooth ? 'ring-2 ring-indigo-600' : ''}`}
      onClick={() => handleToothSelect(tooth)}
    >
      {tooth}
    </button>
  );
})}
            </div> {/* END Quadrant 3 */}
          </div> {/* END inner flex justify-center ... */}
        </div> {/* END scrollable wrapper for bottom arch */}
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            type="button"
            disabled={!selectedTooth}
            className={`px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50`}
            onClick={() => { if (selectedTooth) { handleToothSelect(selectedTooth); onClose(); } }}
          >OK</button>
        </div>
      </div>
    </div>
  );
};
