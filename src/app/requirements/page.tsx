'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { DataStorage, ProjectTemplate, RequirementBranch, Requirement } from '@/utils/dataStorage';

export default function RequirementsPage() {
  const [projects, setProjects] = useState<ProjectTemplate[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // 需求相关状态
  const [newReqTitle, setNewReqTitle] = useState('');
  const [newReqDescription, setNewReqDescription] = useState('');
  const [newReqJiraUrl, setNewReqJiraUrl] = useState('');
  
  // 弹窗状态
  const [showRequirementDetail, setShowRequirementDetail] = useState(false);
  const [showGitOperations, setShowGitOperations] = useState(false);
  const [showNewRequirement, setShowNewRequirement] = useState(false);
  const [detailRequirement, setDetailRequirement] = useState<Requirement | null>(null);
  const [operationBranch, setOperationBranch] = useState<RequirementBranch | null>(null);
  const [operationProject, setOperationProject] = useState<ProjectTemplate | null>(null);
  
  // 编辑状态
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editJiraUrl, setEditJiraUrl] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // 拖拽状态
  const [draggedRequirement, setDraggedRequirement] = useState<Requirement | null>(null);

  // 数据加载
  useEffect(() => {
    const loadData = async () => {
      try {
        await DataStorage.migrateFromLocalStorage();
        const loadedProjects = await DataStorage.loadProjects();
        const loadedRequirements = await DataStorage.loadRequirements();
        
        setProjects(loadedProjects);
        setRequirements(loadedRequirements);
        setIsDataLoaded(true);
      } catch (error) {
        console.error('Failed to load requirements data:', error);
        setIsDataLoaded(true);
      }
    };
    
    if (!isDataLoaded) {
      loadData();
    }
  }, [isDataLoaded]);

  // 数据保存
  useEffect(() => {
    if (isDataLoaded) {
      DataStorage.saveProjects(projects);
    }
  }, [projects, isDataLoaded]);
  
  useEffect(() => {
    if (isDataLoaded) {
      DataStorage.saveRequirements(requirements);
    }
  }, [requirements, isDataLoaded]);

  // 从JIRA URL中提取需求号
  const extractJiraKey = (url: string): string => {
    if (!url) return '';
    
    const patterns = [
      /\/browse\/([A-Z]+-\d+)/,
      /\/issues\/([A-Z]+-\d+)/,
      /\/([A-Z]+-\d+)$/,
      /[?&]selectedIssue=([A-Z]+-\d+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return '';
  };

  // 需求管理功能
  const addRequirement = () => {
    if (!newReqTitle.trim()) return;
    
    const jiraKey = extractJiraKey(newReqJiraUrl);
    
    const newReq: Requirement = {
      id: Date.now().toString(),
      title: newReqTitle,
      description: newReqDescription,
      jiraUrl: newReqJiraUrl,
      jiraKey: jiraKey,
      branches: [],
      status: 'backlog'
    };
    
    setRequirements([...requirements, newReq]);
    closeNewRequirement();
  };

  const deleteRequirement = (reqId: string) => {
    setRequirements(requirements.filter(r => r.id !== reqId));
  };

  // 为需求添加新分支
  const addBranchToRequirement = (reqId: string, projectId: string) => {
    const requirement = requirements.find(r => r.id === reqId);
    const project = projects.find(p => p.id === projectId);
    
    if (!requirement || !project) return;

    const jiraKey = requirement.jiraKey;
    let branchName = '';
    
    if (jiraKey) {
      branchName = `feature/${jiraKey.toLowerCase()}`;
    } else {
      branchName = `feature/${requirement.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    }

    const newBranch: RequirementBranch = {
      id: Date.now().toString(),
      projectId: projectId,
      branchName: branchName,
      status: 'pending'
    };

    const updatedRequirements = requirements.map(req => 
      req.id === reqId ? {
        ...req,
        branches: [...req.branches, newBranch]
      } : req
    );

    setRequirements(updatedRequirements);
    
    // 同步更新弹窗中的需求详情
    if (detailRequirement && detailRequirement.id === reqId) {
      setDetailRequirement({
        ...detailRequirement,
        branches: [...detailRequirement.branches, newBranch]
      });
    }
  };

  // 删除需求分支
  const deleteBranch = (reqId: string, branchId: string) => {
    const updatedRequirements = requirements.map(req => 
      req.id === reqId ? {
        ...req,
        branches: req.branches.filter(branch => branch.id !== branchId)
      } : req
    );

    setRequirements(updatedRequirements);
    
    // 同步更新弹窗中的需求详情
    if (detailRequirement && detailRequirement.id === reqId) {
      setDetailRequirement({
        ...detailRequirement,
        branches: detailRequirement.branches.filter(branch => branch.id !== branchId)
      });
    }
  };

  // 看板相关函数
  const getColumnTitle = (status: Requirement['status']): string => {
    switch (status) {
      case 'backlog': return '待处理';
      case 'development': return '开发中';
      case 'testing': return '测试中';
      case 'ready': return '待发布';
      case 'released': return '已发布';
      default: return '未知状态';
    }
  };

  const getColumnColor = (status: Requirement['status']): string => {
    switch (status) {
      case 'backlog': return 'bg-gray-100 dark:bg-gray-700';
      case 'development': return 'bg-blue-100 dark:bg-blue-900/20';
      case 'testing': return 'bg-yellow-100 dark:bg-yellow-900/20';
      case 'ready': return 'bg-green-100 dark:bg-green-900/20';
      case 'released': return 'bg-purple-100 dark:bg-purple-900/20';
      default: return 'bg-gray-100';
    }
  };

  const getRequirementsByStatus = (status: Requirement['status']) => {
    return requirements.filter(req => req.status === status);
  };

  // 拖拽处理函数
  const handleDragStart = (e: React.DragEvent, requirement: Requirement) => {
    setDraggedRequirement(requirement);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: Requirement['status']) => {
    e.preventDefault();
    
    if (draggedRequirement && draggedRequirement.status !== newStatus) {
      setRequirements(requirements.map(req => 
        req.id === draggedRequirement.id 
          ? { ...req, status: newStatus }
          : req
      ));
    }
    
    setDraggedRequirement(null);
  };

  const handleDragEnd = () => {
    setDraggedRequirement(null);
  };

  // 弹窗操作函数
  const openRequirementDetail = (req: Requirement) => {
    setDetailRequirement(req);
    setEditTitle(req.title);
    setEditDescription(req.description);
    setEditJiraUrl(req.jiraUrl);
    setHasUnsavedChanges(false);
    setShowRequirementDetail(true);
  };

  const closeRequirementDetail = () => {
    setShowRequirementDetail(false);
    setDetailRequirement(null);
    setEditTitle('');
    setEditDescription('');
    setEditJiraUrl('');
    setHasUnsavedChanges(false);
  };

  const openGitOperations = (branch: RequirementBranch, project: ProjectTemplate) => {
    setOperationBranch(branch);
    setOperationProject(project);
    setShowGitOperations(true);
  };

  const closeGitOperations = () => {
    setShowGitOperations(false);
    setOperationBranch(null);
    setOperationProject(null);
  };

  // 需求编辑函数
  const handleFieldChange = (field: 'title' | 'description' | 'jiraUrl', value: string) => {
    if (!detailRequirement) return;
    
    // 更新编辑状态
    if (field === 'title') setEditTitle(value);
    if (field === 'description') setEditDescription(value);
    if (field === 'jiraUrl') setEditJiraUrl(value);
    
    // 检查是否有变化
    const hasChanges = 
      (field === 'title' ? value : editTitle) !== detailRequirement.title ||
      (field === 'description' ? value : editDescription) !== detailRequirement.description ||
      (field === 'jiraUrl' ? value : editJiraUrl) !== detailRequirement.jiraUrl;
    
    setHasUnsavedChanges(hasChanges);
  };

  const saveRequirementChanges = () => {
    if (!detailRequirement) return;
    
    const jiraKey = extractJiraKey(editJiraUrl);
    
    const updatedRequirement: Requirement = {
      ...detailRequirement,
      title: editTitle,
      description: editDescription,
      jiraUrl: editJiraUrl,
      jiraKey: jiraKey
    };
    
    setRequirements(requirements.map(req => 
      req.id === detailRequirement.id ? updatedRequirement : req
    ));
    
    setDetailRequirement(updatedRequirement);
    setHasUnsavedChanges(false);
  };

  const cancelRequirementChanges = () => {
    if (detailRequirement) {
      setEditTitle(detailRequirement.title);
      setEditDescription(detailRequirement.description);
      setEditJiraUrl(detailRequirement.jiraUrl);
      setHasUnsavedChanges(false);
    }
  };

  // 新建需求弹窗管理
  const openNewRequirement = () => {
    setNewReqTitle('');
    setNewReqDescription('');
    setNewReqJiraUrl('');
    setShowNewRequirement(true);
  };

  const closeNewRequirement = () => {
    setShowNewRequirement(false);
    setNewReqTitle('');
    setNewReqDescription('');
    setNewReqJiraUrl('');
  };

  // Git命令生成函数
  const generatePopupCreateFeatureCommands = () => {
    if (!operationProject || !operationBranch) return [];
    
    return [
      `git fetch origin && git checkout ${operationProject.masterBranch} && git pull origin ${operationProject.masterBranch} && git checkout -b ${operationBranch.branchName} && git push -u origin ${operationBranch.branchName}`
    ];
  };

  const generatePopupMergeToQaCommands = () => {
    if (!operationProject || !operationBranch) return [];
    
    return [
      `git fetch origin && git checkout ${operationProject.qaBranch} && git pull origin ${operationProject.qaBranch} && git merge ${operationBranch.branchName} && git push origin ${operationProject.qaBranch}`
    ];
  };

  const generatePopupRollbackCommands = () => {
    if (!operationProject || !operationBranch) return [];
    
    return [
      `git fetch origin && git checkout ${operationProject.qaBranch} && git pull origin ${operationProject.qaBranch} && git log --oneline -1 | grep -q "Merge branch '${operationBranch.branchName}'" && echo "确认撤销来自${operationBranch.branchName}分支的合并" && git revert -m 1 HEAD --no-edit && git push origin ${operationProject.qaBranch} || echo "错误：最后一次提交不是来自${operationBranch.branchName}分支的合并，撤销操作已取消"`
    ];
  };

  const generatePopupContinueDevCommands = () => {
    if (!operationProject || !operationBranch) return [];
    
    return [
      `git fetch origin && git checkout ${operationBranch.branchName} && git pull origin ${operationProject.masterBranch} && git merge ${operationProject.masterBranch} && git checkout ${operationProject.qaBranch} && git pull origin ${operationProject.qaBranch} && git merge ${operationBranch.branchName} && git push origin ${operationProject.qaBranch}`
    ];
  };

  const getBranchStatusColor = (status: RequirementBranch['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-500';
      case 'development': return 'bg-blue-500';
      case 'testing': return 'bg-yellow-500';
      case 'ready': return 'bg-green-500';
      case 'released': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getBranchStatusText = (status: RequirementBranch['status']) => {
    switch (status) {
      case 'pending': return '待开发';
      case 'development': return '开发中';
      case 'testing': return '测试中';
      case 'ready': return '待发布';
      case 'released': return '已发布';
      default: return '未知';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copyCommands = (commands: string[]) => {
    if (commands.length > 0) {
      copyToClipboard(commands.join('\n'));
    }
  };

  const CommandSection = ({ title, description, commands }: {
    title: string;
    description: string;
    commands: string[];
  }) => (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
        {commands.length > 0 && (
          <button
            onClick={() => copyCommands(commands)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            title="复制所有命令到剪贴板"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            复制
          </button>
        )}
      </div>
      <p className="text-gray-600 dark:text-gray-300 mb-4">{description}</p>
      
      {commands.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="space-y-3">
            {commands.map((command, index) => (
              <div key={index} className="flex items-start justify-between group bg-gray-800 rounded p-3">
                <code className="text-sm text-white font-mono flex-1 break-all leading-relaxed">
                  {command}
                </code>
                <button
                  onClick={() => copyToClipboard(command)}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-white transition-all ml-3"
                  title="复制此命令"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        <div className="flex-1 flex flex-col">
          {/* 新建需求按钮 */}
          <div className="mb-6">
            <button
              onClick={openNewRequirement}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新建需求
            </button>
          </div>

          {/* 看板视图 */}
          <div className="flex-1 flex gap-4 overflow-x-auto">
            {(['backlog', 'development', 'testing', 'ready', 'released'] as const).map((status) => (
              <div 
                key={status}
                className={`flex-shrink-0 w-64 ${getColumnColor(status)} rounded-lg p-4`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {getColumnTitle(status)}
                  </h3>
                  <span className="bg-white dark:bg-gray-600 text-gray-900 dark:text-white px-2 py-1 rounded-full text-sm font-medium">
                    {getRequirementsByStatus(status).length}
                  </span>
                </div>
                
                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {getRequirementsByStatus(status).map((req) => (
                    <div
                      key={req.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, req)}
                      onDragEnd={handleDragEnd}
                      className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm cursor-move hover:shadow-md transition-shadow border-l-4 ${
                        req.jiraKey ? 'border-l-purple-500' : 'border-l-gray-300'
                      } ${draggedRequirement?.id === req.id ? 'opacity-50' : ''}`}
                    >
                      {/* 需求卡片头部 */}
                      <div className="flex items-start justify-between mb-2">
                        <button 
                          onClick={() => openRequirementDetail(req)}
                          className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left flex-1"
                        >
                          {req.title}
                        </button>
                        <button
                          onClick={() => deleteRequirement(req.id)}
                          className="text-gray-400 hover:text-red-500 ml-2"
                        >
                          ×
                        </button>
                      </div>
                      
                      {/* JIRA标签 */}
                      {req.jiraKey && (
                        <div className="mb-2">
                          <span className="px-2 py-1 bg-purple-500 text-white text-xs rounded">
                            {req.jiraKey}
                          </span>
                        </div>
                      )}
                      
                      {/* 需求描述 */}
                      {req.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                          {req.description}
                        </p>
                      )}
                      
                      {/* 分支信息 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            关联分支 ({req.branches.length})
                          </span>
                          <select
                            className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                            onChange={(e) => {
                              if (e.target.value) {
                                addBranchToRequirement(req.id, e.target.value);
                                e.target.value = '';
                              }
                            }}
                          >
                            <option value="">+分支</option>
                            {projects
                              .filter(p => !req.branches.some(b => b.projectId === p.id))
                              .map(project => (
                                <option key={project.id} value={project.id}>
                                  {project.name}
                                </option>
                              ))
                            }
                          </select>
                        </div>
                        
                        {req.branches.map((branch) => {
                          const project = projects.find(p => p.id === branch.projectId);
                          return (
                            <div key={branch.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded p-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                    {project?.name || '未知项目'}
                                  </span>
                                  <span className={`px-1 py-0.5 rounded text-xs text-white ${getBranchStatusColor(branch.status)}`}>
                                    {getBranchStatusText(branch.status)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {branch.branchName}
                                </p>
                              </div>
                              <div className="flex gap-1 ml-2">
                                <button
                                  onClick={() => {
                                    if (project) {
                                      openGitOperations(branch, project);
                                    }
                                  }}
                                  className="px-1 py-0.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                                >
                                  Git
                                </button>
                                <button
                                  onClick={() => deleteBranch(req.id, branch.id)}
                                  className="px-1 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 需求详情弹窗 */}
      {showRequirementDetail && detailRequirement && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-white/20 dark:border-gray-700/50 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">需求详情</h2>
                <div className="flex items-center gap-3">
                  {hasUnsavedChanges && (
                    <>
                      <button
                        onClick={saveRequirementChanges}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        保存
                      </button>
                      <button
                        onClick={cancelRequirementChanges}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        取消
                      </button>
                    </>
                  )}
                  <button
                    onClick={closeRequirementDetail}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* 基本信息 */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">基本信息</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">需求标题：</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => handleFieldChange('title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                        placeholder="请输入需求标题"
                      />
                    </div>
                    
                    <div>
                      <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">JIRA链接：</label>
                      <input
                        type="url"
                        value={editJiraUrl}
                        onChange={(e) => handleFieldChange('jiraUrl', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                        placeholder="请输入JIRA链接"
                      />
                      {extractJiraKey(editJiraUrl) && (
                        <div className="mt-2">
                          <span className="text-sm text-gray-600 dark:text-gray-300">自动提取的JIRA编号：</span>
                          <span className="ml-2 px-2 py-1 bg-purple-500 text-white text-sm rounded">
                            {extractJiraKey(editJiraUrl)}
                          </span>
                        </div>
                      )}
                      {detailRequirement.jiraUrl && !hasUnsavedChanges && (
                        <div className="mt-2">
                          <a 
                            href={detailRequirement.jiraUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                          >
                            查看JIRA ↗
                          </a>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">需求描述：</label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => handleFieldChange('description', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                        placeholder="请输入需求描述"
                      />
                    </div>
                  </div>
                </div>

                {/* 关联分支 */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      关联分支 ({detailRequirement.branches.length})
                    </h3>
                    <select
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                      onChange={(e) => {
                        if (e.target.value && detailRequirement) {
                          addBranchToRequirement(detailRequirement.id, e.target.value);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="">+ 绑定项目分支</option>
                      {projects
                        .filter(p => !detailRequirement.branches.some(b => b.projectId === p.id))
                        .map(project => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                  
                  {detailRequirement.branches.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 italic">暂未绑定任何项目分支</p>
                  ) : (
                    <div className="space-y-3">
                      {detailRequirement.branches.map((branch) => {
                        const project = projects.find(p => p.id === branch.projectId);
                        return (
                          <div key={branch.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {project?.name || '未知项目'}
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs text-white ${getBranchStatusColor(branch.status)}`}>
                                    {getBranchStatusText(branch.status)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  分支: {branch.branchName}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    if (project) {
                                      openGitOperations(branch, project);
                                    }
                                  }}
                                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                                >
                                  Git操作
                                </button>
                                <button
                                  onClick={() => deleteBranch(detailRequirement.id, branch.id)}
                                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
                                  title="删除分支"
                                >
                                  删除
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Git操作弹窗 */}
      {showGitOperations && operationBranch && operationProject && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-white/20 dark:border-gray-700/50 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Git操作</h2>
                <button
                  onClick={closeGitOperations}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">当前操作</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  项目: {operationProject.name} | 分支: {operationBranch.branchName}
                </p>
              </div>

              <div className="space-y-6">
                <CommandSection
                  title="1. 创建Feature分支"
                  description="从master分支创建新的feature分支并推送到远程仓库"
                  commands={generatePopupCreateFeatureCommands()}
                />

                <CommandSection
                  title="2. 合并到QA分支"
                  description="将开发完成的feature分支合并到QA分支进行测试"
                  commands={generatePopupMergeToQaCommands()}
                />

                <CommandSection
                  title="3. 撤销QA合并"
                  description="安全撤销QA分支中来自指定feature分支的最后一次合并（使用revert保留历史记录）"
                  commands={generatePopupRollbackCommands()}
                />

                <CommandSection
                  title="4. 继续开发"
                  description="在feature分支继续开发，先同步master分支最新代码，完成后再次合并到QA"
                  commands={generatePopupContinueDevCommands()}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 新建需求弹窗 */}
      {showNewRequirement && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-white/20 dark:border-gray-700/50 max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">新建需求</h2>
                <button
                  onClick={closeNewRequirement}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">需求标题：</label>
                  <input
                    type="text"
                    value={newReqTitle}
                    onChange={(e) => setNewReqTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                    placeholder="请输入需求标题"
                  />
                </div>
                
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">JIRA链接：</label>
                  <input
                    type="url"
                    value={newReqJiraUrl}
                    onChange={(e) => setNewReqJiraUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                    placeholder="请输入JIRA链接"
                  />
                  {extractJiraKey(newReqJiraUrl) && (
                    <div className="mt-2">
                      <span className="text-sm text-gray-600 dark:text-gray-300">自动提取的JIRA编号：</span>
                      <span className="ml-2 px-2 py-1 bg-purple-500 text-white text-sm rounded">
                        {extractJiraKey(newReqJiraUrl)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">需求描述：</label>
                  <textarea
                    value={newReqDescription}
                    onChange={(e) => setNewReqDescription(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                    placeholder="请输入需求描述"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={closeNewRequirement}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 font-medium"
                >
                  取消
                </button>
                <button
                  onClick={addRequirement}
                  disabled={!newReqTitle.trim()}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  创建需求
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}