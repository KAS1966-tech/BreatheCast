import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ThemeMode, ThemeState } from '../../../hooks/types/theme.type';
import { getInitialTheme, setTheme as setCurrentTheme } from '../../../utils/theme.utlis';

const initialState: ThemeState = {
  mode: getInitialTheme(), 
};

const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        toggleTheme: (state) => {
            // 1. Determine the next mode
            const nextMode = state.mode === 'day' ? 'dark' : 'day';
            // 2. Update Redux state
            state.mode = nextMode;
            // 3. Update localStorage and DOM using the correct next mode
            setCurrentTheme(nextMode);
        },
        setTheme: (state, action: PayloadAction<ThemeMode>) => {
            state.mode = action.payload;
            // Pass the payload directly
            setCurrentTheme(action.payload);
        },
    },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
