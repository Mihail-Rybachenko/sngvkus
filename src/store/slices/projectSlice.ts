import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Project } from '@/types';

interface ProjectState {
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
}

const initialState: ProjectState = {
  currentProject: null,
  projects: [],
  isLoading: false,
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setCurrentProject: (state, action: PayloadAction<Project | null>) => {
      state.currentProject = action.payload;
    },
    setProjects: (state, action: PayloadAction<Project[]>) => {
      state.projects = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setCurrentProject, setProjects, setLoading } = projectSlice.actions;
export default projectSlice.reducer;

