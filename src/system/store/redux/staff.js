import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  staffData: [],
  //agentId: "",
};

const staffInfo = createSlice({
  name: 'staffInfo',
  initialState,
  reducers: {
    setStaffData: (state, action) => {
      // console.log('action', action);
      state.staffData = action.payload;
    },
    // setStaffId: (state, action) => {
    //   //state.agentId = action.payload;
    // },
    resetStaffData: (state) => {
      state.staffData = initialState.staffData;
      //state.agentId = initialState.agentId;
    },
  },
});

export const { setStaffData, resetStaffData } = staffInfo.actions;
export const getStaffData = (state) => state.staff.staffData;
export default staffInfo.reducer;