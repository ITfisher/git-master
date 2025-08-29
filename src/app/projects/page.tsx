'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { DataStorage, ProjectTemplate } from '@/utils/dataStorage';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectTemplate[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectTemplate | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // 项目模板相关状态
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectQa, setNewProjectQa] = useState('qa');
  const [newProjectMaster, setNewProjectMaster] = useState('master');

  // 数据加载
  useEffect(() => {
    const loadData = async () => {
      try {
        await DataStorage.migrateFromLocalStorage();
        const loadedProjects = await DataStorage.loadProjects();
        setProjects(loadedProjects);
        
        if (loadedProjects.length > 0 && !selectedProject) {
          setSelectedProject(loadedProjects[0]);
        }
        
        setIsDataLoaded(true);
      } catch (error) {
        console.error('Failed to load projects data:', error);
        setIsDataLoaded(true);
      }
    };
    
    if (!isDataLoaded) {
      loadData();
    }
  }, [isDataLoaded, selectedProject]);

  // 数据保存
  useEffect(() => {
    if (isDataLoaded) {
      DataStorage.saveProjects(projects);
    }
  }, [projects, isDataLoaded]);

  // 项目管理功能
  const addProject = () => {
    if (!newProjectName.trim()) return;
    
    const newProject: ProjectTemplate = {
      id: Date.now().toString(),
      name: newProjectName,
      qaBranch: newProjectQa,
      masterBranch: newProjectMaster
    };
    
    setProjects([...projects, newProject]);
    setNewProjectName('');
    setNewProjectQa('qa');
    setNewProjectMaster('master');
  };

  const deleteProject = (projectId: string) => {
    setProjects(projects.filter(p => p.id !== projectId));
    if (selectedProject?.id === projectId) {
      setSelectedProject(projects[0] || null);
    }
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            项目管理
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            管理Git项目配置和分支信息
          </p>
        </div>

        <div className="flex-1 space-y-6">
          {/* 新建项目表单 */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">新建项目模板</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                placeholder="项目名称"
              />
              <input
                type="text"
                value={newProjectQa}
                onChange={(e) => setNewProjectQa(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                placeholder="QA分支名"
              />
              <input
                type="text"
                value={newProjectMaster}
                onChange={(e) => setNewProjectMaster(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                placeholder="Master分支名"
              />
            </div>
            <button
              onClick={addProject}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
            >
              添加项目
            </button>
          </div>

          {/* 项目列表 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                项目列表 ({projects.length})
              </h3>
            </div>
            
            {projects.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📁</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  暂无项目
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  创建第一个项目模板来开始管理
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {projects.map((project) => (
                  <div key={project.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-2">
                          {project.name}
                        </h4>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                          <p>
                            <span className="font-medium">QA分支:</span> {project.qaBranch}
                          </p>
                          <p>
                            <span className="font-medium">Master分支:</span> {project.masterBranch}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() => setSelectedProject(project)}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            selectedProject?.id === project.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                          }`}
                        >
                          {selectedProject?.id === project.id ? '已选择' : '选择'}
                        </button>
                        <button
                          onClick={() => deleteProject(project.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 当前选择的项目 */}
          {selectedProject && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                当前选择的项目
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">{selectedProject.name}</span> - 
                QA: {selectedProject.qaBranch}, Master: {selectedProject.masterBranch}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}