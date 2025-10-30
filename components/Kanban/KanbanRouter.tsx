import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import KanbanBoardsListPage from './KanbanBoardsListPage';
import ManageKanbanBoardsPage from './ManageKanbanBoardsPage';
import KanbanBoardView from './KanbanBoardView';
import MyTasksPage from './MyTasksPage';
import KanbanTaskEditorPage from './KanbanTaskEditorPage'; 
import { ROUTE_PATHS } from '../../constants';


const KanbanRouter: React.FC = () => {
  return (
    <Routes>
      <Route index element={<KanbanBoardsListPage />} />
      <Route path="my-tasks" element={<MyTasksPage />} />
      <Route path="manage" element={<ManageKanbanBoardsPage />} />
      <Route path="board/:boardId" element={<KanbanBoardView />} />
      <Route path="task/new" element={<KanbanTaskEditorPage />} /> 
      <Route path="task/:taskId" element={<KanbanTaskEditorPage />} /> 
      
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  );
};

export default KanbanRouter;