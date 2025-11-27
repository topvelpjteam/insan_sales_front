import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  agentData: [],
  wareHouseData: [],
  agentId: "",
};

const agentInfo = createSlice({
  name: 'agentInfo',
  initialState,
  reducers: {
    setAgentData: (state, action) => {
      state.agentData = action.payload.agentData;
      state.wareHouseData = action.payload.wareHouseData;
    },
    setAgentId: (state, action) => {
      state.agentId = action.payload;
    },
    resetAgentData: (state) => {
      state.agentData = initialState.agentData;
      state.wareHouseData = initialState.wareHouseData;
      state.agentId = initialState.agentId;
    },
  },
});

export const { setAgentData, setAgentId, resetAgentData } = agentInfo.actions;
// ✅ Selectors Export
export const getAgentData = (state) => state.agent.agentData;
export const getWareHouseData = (state) => state.agent.wareHouseData;
export const getAgentId = (state) => state.agent.agentId;
export default agentInfo.reducer;