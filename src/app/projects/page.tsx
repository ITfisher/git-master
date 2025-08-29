'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';

interface Project {
  id: string;
  name: string;
  description?: string;
  gitRepository?: string;
  masterBranch: string;
  qaBranch: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // 项目相关状态
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectGitRepo, setNewProjectGitRepo] = useState('');
  const [newProjectMasterBranch, setNewProjectMasterBranch] = useState('main');
  const [newProjectQaBranch, setNewProjectQaBranch] = useState('test');

  // 数据加载
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/data/services');
        if (response.ok) {
          const loadedProjects = await response.json();
          setProjects(loadedProjects);
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
  }, [isDataLoaded]);

  // 项目管理功能
  const addProject = async () => {
    if (!newProjectName.trim()) return;
    
    const projectData = {
      name: newProjectName,
      description: newProjectDescription,
      gitRepository: newProjectGitRepo,
      masterBranch: newProjectMasterBranch,
      qaBranch: newProjectQaBranch
    };
    
    try {
      const response = await fetch('/api/data/services/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setProjects([...projects, result.project]);
          // 清空表单
          setNewProjectName('');
          setNewProjectDescription('');
          setNewProjectGitRepo('');
          setNewProjectMasterBranch('main');
          setNewProjectQaBranch('test');
        }
      }
    } catch (error) {
      console.error('Error adding project:', error);
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const response = await fetch('/api/data/services/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: projectId }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setProjects(projects.filter(p => p.id !== projectId));
        }
      }
    } catch (error) {
      console.error('Error deleting project:', error);
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
            管理项目配置、Git仓库和分支信息
          </p>
        </div>

        <div className="flex-1 space-y-6">
          {/* 新建项目表单 */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">新建项目</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                  placeholder="项目名称 *"
                />
                <input
                  type="text"
                  value={newProjectGitRepo}
                  onChange={(e) => setNewProjectGitRepo(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                  placeholder="Git仓库URL *"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={newProjectQaBranch}
                  onChange={(e) => setNewProjectQaBranch(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                  placeholder="测试分支 (QA)"
                />
                <input
                  type="text"
                  value={newProjectMasterBranch}
                  onChange={(e) => setNewProjectMasterBranch(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                  placeholder="主分支 (Master)"
                />
              </div>
              <textarea
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                placeholder="项目描述 (可选)"
                rows={2}
              />
            </div>
            <button
              onClick={addProject}
              disabled={!newProjectName.trim()}
              className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md font-medium"
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
                <div className="text-4xl mb-4">⚙️</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  暂无项目
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  创建第一个项目配置来开始管理
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {projects.map((project) => (
                  <div key={project.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                            {project.name}
                          </h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            project.status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                          }`}>
                            {project.status}
                          </span>
                        </div>
                        {project.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            {project.description}
                          </p>
                        )}
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                          <p>
                            <span className="font-medium">Git仓库:</span> {project.gitRepository || '未设置'}
                          </p>
                          <p>
                            <span className="font-medium">测试分支:</span> {project.qaBranch}
                          </p>
                          <p>
                            <span className="font-medium">主分支:</span> {project.masterBranch}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
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

        </div>
      </div>
    </AppLayout>
  );
}