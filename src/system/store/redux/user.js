import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: {
    //emplNm: '',
    //emplNo: '',
    // email: '',
    // preferences: {
    //   theme: 'light',
    //   notifications: true,
    // },
    isLoggedIn: false,
    language: 'ko',
  },
};
//const counterSlice = createSlice({
const userInfo = createSlice({
  name: 'userInfo',
  initialState,
  reducers: {
    // increment: (state, params) => { 
    //     console.log(params.payload)
    //     state.value += params.payload + 1 
    // },
    // decrement: (state) => { state.value -= 1 },
    // reset: (state) => { state.value = 0 },
    user: (state, action) => {
      state.user = action.payload;
      state.user['isLoggedIn'] = true;
      state.user['language'] = 'ko';
    },
    logout: (state) => {
      //sessionStorage.removeItem('persist:root');
      console.log('== Logout OK........');
      state.user = initialState;
      //state.user['isLoggedIn'] = false;
    },
    updatePreferences: (state, action) => {
      state.user.preferences = {
        ...state.user.preferences,
        ...action.payload,
      };
    },
  },
});

//export const { increment, decrement, reset } = userInfo.actions
export const { user, logout, updatePreferences } = userInfo.actions;
export default userInfo.reducer;