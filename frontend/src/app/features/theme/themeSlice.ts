import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {ThemeMode, ThemeState } from '../../../hooks/types/theme.type';
import { getInitialTheme } from '../../../utils/initialTheme';

const initialState: ThemeState = {
  mode: getInitialTheme(), // Default theme
};

const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
    toggleTheme: (state) => {
        state.mode = state.mode === 'day' ? 'dark' : 'day';
    },
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
        state.mode = action.payload;
    },
    },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
