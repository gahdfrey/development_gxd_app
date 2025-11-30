'use client';

interface NavigationToggleProps {
    isExpanded: boolean;
    onToggle: () => void;
}

export const NavigationToggle = ({ isExpanded, onToggle }: NavigationToggleProps): React.JSX.Element => {
    return (
        <button
            onClick={onToggle}
            className='flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'
            aria-label='Toggle Navigation'
            title={isExpanded ? 'Collapse menu' : 'Expand menu'}
        >
            <svg
                xmlns='http://www.w3.org/2000/svg'
                height='20px'
                viewBox='0 0 24 24'
                width='20px'
                className='fill-current'
            >
                <path d='M0,0h24v24H0V0z' fill='none' />
                <path d='M4,18h11c0.55,0,1-0.45,1-1v0c0-0.55-0.45-1-1-1H4c-0.55,0-1,0.45-1,1v0C3,17.55,3.45,18,4,18z M4,13h8c0.55,0,1-0.45,1-1v0 c0-0.55-0.45-1-1-1H4c-0.55,0-1,0.45-1,1v0C3,12.55,3.45,13,4,13z M3,7L3,7c0,0.55,0.45,1,1,1h11c0.55,0,1-0.45,1-1v0 c0-0.55-0.45-1-1-1H4C3.45,6,3,6.45,3,7z M20.3,14.88L17.42,12l2.88-2.88c0.39-0.39,0.39-1.02,0-1.41l0,0 c-0.39-0.39-1.02-0.39-1.41,0l-3.59,3.59c-0.39,0.39-0.39,1.02,0,1.41l3.59,3.59c0.39,0.39,1.02,0.39,1.41,0l0,0 C20.68,15.91,20.69,15.27,20.3,14.88z' />
                <path d='M0,0h24v24H0V0z' fill='none' />
            </svg>
        </button>
    );
};
