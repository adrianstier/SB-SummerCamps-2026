import { memo } from 'react';
import BrandIcon from '../BrandIcon';
import { CAMP_CATEGORIES } from './utils';

/**
 * Camp category preferences and sample data management panel.
 *
 * @param {Object} props
 * @param {string[]} props.selectedCategories - Array of selected category IDs
 * @param {function} props.onCategoryToggle - Called with category ID to toggle selection
 * @param {boolean} props.clearingSample - Whether sample data is being cleared
 * @param {boolean} props.sampleCleared - Whether sample data was just cleared
 * @param {function} props.onClearSample - Called to clear sample data
 */
function CategoryPreferences({
  selectedCategories,
  onCategoryToggle,
  clearingSample,
  sampleCleared,
  onClearSample
}) {
  return (
    <div role="tabpanel" id="panel-preferences" aria-labelledby="tab-preferences" className="space-y-6">
      <div>
        <h3 className="font-medium mb-1" style={{ color: 'var(--earth-800)' }}>Camp Categories</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--earth-600)' }}>
          Select the types of camps that interest your family.
        </p>

        {/* Category grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CAMP_CATEGORIES.map((category) => {
            const isSelected = selectedCategories.includes(category.id);
            return (
              <button
                key={category.id}
                onClick={() => onCategoryToggle(category.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-transparent'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
                style={isSelected ? {
                  backgroundColor: 'var(--accent-50)',
                  borderColor: 'var(--accent-500)'
                } : {}}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isSelected ? '' : 'bg-gray-100'
                  }`}
                  style={isSelected ? { backgroundColor: 'var(--accent-100)' } : {}}
                >
                  <BrandIcon
                    name={category.icon}
                    className="w-5 h-5"
                    style={{ color: isSelected ? 'var(--accent-600)' : 'var(--earth-500)' }}
                  />
                </div>
                <span
                  className="text-sm font-medium"
                  style={{ color: isSelected ? 'var(--accent-700)' : 'var(--earth-700)' }}
                >
                  {category.label}
                </span>
                {isSelected && (
                  <svg
                    className="w-5 h-5 ml-auto flex-shrink-0"
                    style={{ color: 'var(--accent-500)' }}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected count */}
        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--sage-50)' }}>
          <p className="text-sm" style={{ color: 'var(--sage-700)' }}>
            {selectedCategories.length === 0 ? (
              'No categories selected. All camp types will be shown.'
            ) : (
              <>
                <strong>{selectedCategories.length}</strong> {selectedCategories.length === 1 ? 'category' : 'categories'} selected.
                Camps matching these will be highlighted.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Clear Sample Data Section */}
      <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--earth-200)' }}>
        <h3 className="font-medium mb-1" style={{ color: 'var(--earth-800)' }}>Sample Data</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--earth-600)' }}>
          Remove sample children and scheduled camps added during the guided tour.
        </p>
        <button
          onClick={onClearSample}
          disabled={clearingSample}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          style={{
            backgroundColor: sampleCleared ? 'var(--sage-100)' : 'var(--terra-50)',
            color: sampleCleared ? 'var(--sage-700)' : 'var(--terra-700)',
            border: `1px solid ${sampleCleared ? 'var(--sage-300)' : 'var(--terra-200)'}`
          }}
        >
          {clearingSample ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Clearing...
            </>
          ) : sampleCleared ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Cleared
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Sample Data
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default memo(CategoryPreferences);
