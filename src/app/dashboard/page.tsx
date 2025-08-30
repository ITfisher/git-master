'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { DataStorage, ProjectTemplate, Requirement } from '@/utils/dataStorage';

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectTemplate[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedProjects, loadedRequirements] = await Promise.all([
          DataStorage.loadProjects(),
          DataStorage.loadRequirements()
        ]);
        
        setProjects(loadedProjects);
        setRequirements(loadedRequirements);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 计算统计数据
  const stats = {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === 'ACTIVE').length,
    totalRequirements: requirements.length,
    developmentRequirements: requirements.filter(r => r.status === 'DEVELOPMENT').length,
    testingRequirements: requirements.filter(r => r.status === 'TESTING').length,
    readyRequirements: requirements.filter(r => r.status === 'READY').length,
    releasedRequirements: requirements.filter(r => r.status === 'RELEASED').length,
    totalBranches: requirements.reduce((total, req) => total + (req.branches?.length || 0), 0)
  };

  const getStatusText = (status: Requirement['status']) => {
    switch (status) {
      case 'BACKLOG': return '待开发';
      case 'DEVELOPMENT': return '开发中';
      case 'TESTING': return '测试中';
      case 'READY': return '待发布';
      case 'RELEASED': return '已发布';
      default: return '未知';
    }
  };

  const getStatusColor = (status: Requirement['status']) => {
    switch (status) {
      case 'BACKLOG': return 'bg-gray-500';
      case 'DEVELOPMENT': return 'bg-blue-500';
      case 'TESTING': return 'bg-yellow-500';
      case 'READY': return 'bg-green-500';
      case 'RELEASED': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  // 最近更新的需求
  const recentRequirements = requirements
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">加载中...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            仪表盘
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            项目概览和统计数据
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="bg-blue-500 p-3 rounded-lg mr-4">
                <span className="text-white text-xl">📁</span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">总项目数</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalProjects}</p>
                <p className="text-xs text-green-600 dark:text-green-400">活跃: {stats.activeProjects}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="bg-green-500 p-3 rounded-lg mr-4">
                <span className="text-white text-xl">📋</span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">总需求数</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalRequirements}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">分支: {stats.totalBranches}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="bg-yellow-500 p-3 rounded-lg mr-4">
                <span className="text-white text-xl">⚡</span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">进行中</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.developmentRequirements + stats.testingRequirements}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  开发: {stats.developmentRequirements} | 测试: {stats.testingRequirements}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="bg-purple-500 p-3 rounded-lg mr-4">
                <span className="text-white text-xl">✅</span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">已完成</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.releasedRequirements}</p>
                <p className="text-xs text-green-600 dark:text-green-400">待发布: {stats.readyRequirements}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 项目状态概览 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">项目概览</h2>
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-2">📁</div>
                <p className="text-gray-500 dark:text-gray-400 mb-4">暂无项目</p>
                <button
                  onClick={() => router.push('/projects')}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  创建第一个项目 →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 5).map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">{project.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {project.description || '暂无描述'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs text-white ${
                      project.status === 'ACTIVE' ? 'bg-green-500' :
                      project.status === 'INACTIVE' ? 'bg-yellow-500' : 'bg-gray-500'
                    }`}>
                      {project.status === 'ACTIVE' ? '活跃' :
                       project.status === 'INACTIVE' ? '暂停' : '归档'}
                    </span>
                  </div>
                ))}
                {projects.length > 5 && (
                  <button
                    onClick={() => router.push('/projects')}
                    className="w-full text-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 py-2"
                  >
                    查看全部 {projects.length} 个项目 →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 需求状态分布 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">需求状态</h2>
            {requirements.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-2">📋</div>
                <p className="text-gray-500 dark:text-gray-400 mb-4">暂无需求</p>
                <button
                  onClick={() => router.push('/requirements')}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  创建第一个需求 →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {['BACKLOG', 'DEVELOPMENT', 'TESTING', 'READY', 'RELEASED'].map((status) => {
                  const count = requirements.filter(r => r.status === status).length;
                  const percentage = stats.totalRequirements > 0 ? (count / stats.totalRequirements * 100) : 0;
                  
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <span className={`w-3 h-3 rounded-full mr-3 ${getStatusColor(status as Requirement['status'])}`}></span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {getStatusText(status as Requirement['status'])}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                          {count}
                        </span>
                        <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getStatusColor(status as Requirement['status'])}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-400 ml-2 w-8 text-right">
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 最近活动 */}
        {recentRequirements.length > 0 && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">最近更新的需求</h2>
            <div className="space-y-3">
              {recentRequirements.map((req) => (
                <div 
                  key={req.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                  onClick={() => router.push(`/requirements/${req.requirementNumber}`)}
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">{req.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-blue-600 dark:text-blue-400">{req.requirementNumber}</span>
                      <span className={`px-2 py-1 rounded-full text-xs text-white ${getStatusColor(req.status)}`}>
                        {getStatusText(req.status)}
                      </span>
                      {req.branches && req.branches.length > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {req.branches.length} 个分支
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(req.updatedAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => router.push('/requirements')}
              className="w-full text-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 py-2 mt-4"
            >
              查看全部需求 →
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}