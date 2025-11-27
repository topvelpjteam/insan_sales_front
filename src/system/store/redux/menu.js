import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  systemMenu: [],
};

const menuInfo = createSlice({
  name: 'menuInfo',
  initialState,
  reducers: {
    systemMenu: (state, action) => {
      state.systemMenu = action.payload;
    },
    systemMenuInit: (state) => {
      state.systemMenu = initialState.systemMenu;
    },
    // logout: (state) => { 
    //   //sessionStorage.removeItem('persist:root');
    //   console.log('== Logout OK........');
    //   state.user = initialState;
    //   //state.user['isLoggedIn'] = false;
    // },
    // updatePreferences: (state, action) => {
    //   state.user.preferences = {
    //     ...state.user.preferences,
    //     ...action.payload,
    //   }
    // },
  },
});

//export const { increment, decrement, reset } = menuInfo.actions
export const { systemMenu, systemMenuInit } = menuInfo.actions;
export default menuInfo.reducer;