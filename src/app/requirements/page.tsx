'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { DataStorage, ProjectTemplate, RequirementBranch, Requirement } from '@/utils/dataStorage';
import { BranchOperations } from '@/utils/branchOperations';

export default function RequirementsPage() {
  const router = useRouter();
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
  const [updatingRequirements, setUpdatingRequirements] = useState<Set<number>>(new Set());

  // 数据加载
  useEffect(() => {
    const loadData = async () => {
      try {
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

  // 数据保存 - 只保存项目数据的自动同步
  useEffect(() => {
    if (isDataLoaded) {
      DataStorage.saveProjects(projects);
    }
  }, [projects, isDataLoaded]);
  
  // 移除了需求的自动保存，现在通过具体的操作API来更新数据

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

  // 生成下一个ID（模拟数据库自增）
  const generateNextId = (): number => {
    if (requirements.length === 0) {
      return 1;
    }
    // 找到最大的ID
    const maxId = Math.max(...requirements.map(req => req.id));
    return maxId + 1;
  };

  // 根据ID生成需求编号
  const generateRequirementNumber = (id: number): string => {
    return `BN-${id}`;
  };

  // 需求管理功能
  const addRequirement = async () => {
    if (!newReqTitle.trim()) return;
    
    const jiraKey = extractJiraKey(newReqJiraUrl);
    const newId = generateNextId();
    const requirementNumber = generateRequirementNumber(newId);
    
    const newReqData = {
      requirementNumber: requirementNumber,
      title: newReqTitle,
      description: newReqDescription,
      jiraUrl: newReqJiraUrl,
      jiraKey: jiraKey,
      branches: [],
      status: 'BACKLOG' as const,
      priority: 'MEDIUM' as const,
      startTime: undefined,
      endTime: undefined
    };
    
    try {
      const result = await DataStorage.createRequirement(newReqData);
      
      if (result.success && result.requirement) {
        // 使用服务器返回的需求数据更新本地状态
        setRequirements([...requirements, result.requirement]);
        closeNewRequirement();
      } else {
        console.error('Failed to create requirement:', result.error);
        alert('创建需求失败: ' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('Error creating requirement:', error);
      alert('创建需求失败: 网络错误');
    }
  };

  const deleteRequirement = async (reqId: number) => {
    if (!confirm('确定要删除这个需求吗？此操作不可撤销。')) {
      return;
    }

    try {
      const result = await DataStorage.deleteRequirement(reqId);
      
      if (result.success) {
        // 更新本地状态，移除已删除的需求
        setRequirements(requirements.filter(r => r.id !== reqId));
        
        // 如果弹窗中显示的是被删除的需求，关闭弹窗
        if (detailRequirement && detailRequirement.id === reqId) {
          closeRequirementDetail();
        }
      } else {
        console.error('Failed to delete requirement:', result.error);
        alert('删除需求失败: ' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('Error deleting requirement:', error);
      alert('删除需求失败: 网络错误');
    }
  };

  // 为需求添加新分支
  const addBranchToRequirement = async (reqId: number, projectId: string) => {
    const requirement = requirements.find(r => r.id === reqId);
    const project = projects.find(p => p.id === projectId);
    
    if (!requirement || !project) return;

    try {
      const result = await BranchOperations.addBranchToRequirement(requirement, projectId);
      
      if (result.success && result.branch) {
        // 更新需求列表中的分支
        const updatedRequirements = requirements.map(req => 
          req.id === reqId ? {
            ...req,
            branches: [...req.branches, result.branch!]
          } : req
        );
        setRequirements(updatedRequirements);
        
        // 同步更新弹窗中的需求详情
        if (detailRequirement && detailRequirement.id === reqId) {
          setDetailRequirement({
            ...detailRequirement,
            branches: [...(detailRequirement.branches || []), result.branch]
          });
        }
      } else {
        console.error('Failed to add branch:', result.error);
        alert('添加分支失败: ' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('Error adding branch:', error);
      alert('添加分支失败: 网络错误');
    }
  };

  // 删除需求分支
  const deleteBranch = async (reqId: number, branchId: string) => {
    try {
      const result = await BranchOperations.deleteRequirementBranch(branchId);
      
      if (result.success) {
        // 更新需求列表中的分支
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
            branches: (detailRequirement.branches || []).filter(branch => branch.id !== branchId)
          });
        }
      } else {
        console.error('Failed to delete branch:', result.error);
        alert('删除分支失败: ' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('Error deleting branch:', error);
      alert('删除分支失败: 网络错误');
    }
  };

  // 看板相关函数
  const getColumnTitle = (status: Requirement['status']): string => {
    switch (status) {
      case 'BACKLOG': return '待处理';
      case 'DEVELOPMENT': return '开发中';
      case 'TESTING': return '测试中';
      case 'READY': return '待发布';
      case 'RELEASED': return '已发布';
      default: return '未知状态';
    }
  };

  const getColumnColor = (status: Requirement['status']): string => {
    switch (status) {
      case 'BACKLOG': return 'bg-gray-100 dark:bg-gray-700';
      case 'DEVELOPMENT': return 'bg-blue-100 dark:bg-blue-900/20';
      case 'TESTING': return 'bg-yellow-100 dark:bg-yellow-900/20';
      case 'READY': return 'bg-green-100 dark:bg-green-900/20';
      case 'RELEASED': return 'bg-purple-100 dark:bg-purple-900/20';
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

  const handleDrop = async (e: React.DragEvent, newStatus: Requirement['status']) => {
    e.preventDefault();
    
    if (draggedRequirement && draggedRequirement.status !== newStatus) {
      const originalStatus = draggedRequirement.status;
      const updatedRequirement = { ...draggedRequirement, status: newStatus };
      
      // 添加到正在更新的集合
      setUpdatingRequirements(prev => new Set(prev).add(draggedRequirement.id));
      
      // 乐观更新：立即更新UI以提供即时反馈
      setRequirements(requirements.map(req => 
        req.id === draggedRequirement.id 
          ? updatedRequirement
          : req
      ));
      
      // 如果弹窗中显示的是当前拖拽的需求，也要更新
      if (detailRequirement && detailRequirement.id === draggedRequirement.id) {
        setDetailRequirement(updatedRequirement);
      }
      
      // 异步调用API更新服务器
      try {
        const result = await DataStorage.updateRequirement(updatedRequirement);
        
        if (result.success && result.requirement) {
          // 使用服务器返回的最新数据更新本地状态
          setRequirements(requirements.map(req => 
            req.id === draggedRequirement.id 
              ? result.requirement!
              : req
          ));
          
          if (detailRequirement && detailRequirement.id === draggedRequirement.id) {
            setDetailRequirement(result.requirement);
          }
        } else {
          console.error('Failed to update requirement status:', result.error);
          
          // API失败时回滚到原始状态
          const revertedRequirement = { ...updatedRequirement, status: originalStatus };
          setRequirements(requirements.map(req => 
            req.id === draggedRequirement.id 
              ? revertedRequirement
              : req
          ));
          
          if (detailRequirement && detailRequirement.id === draggedRequirement.id) {
            setDetailRequirement(revertedRequirement);
          }
          
          alert('状态更新失败: ' + (result.error || '未知错误'));
        }
      } catch (error) {
        console.error('Error updating requirement status:', error);
        
        // 网络错误时回滚到原始状态
        const revertedRequirement = { ...updatedRequirement, status: originalStatus };
        setRequirements(requirements.map(req => 
          req.id === draggedRequirement.id 
            ? revertedRequirement
            : req
        ));
        
        if (detailRequirement && detailRequirement.id === draggedRequirement.id) {
          setDetailRequirement(revertedRequirement);
        }
        
        alert('状态更新失败: 网络错误');
      } finally {
        // 移除更新状态
        setUpdatingRequirements(prev => {
          const next = new Set(prev);
          next.delete(draggedRequirement.id);
          return next;
        });
      }
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
    setEditDescription(req.description || '');
    setEditJiraUrl(req.jiraUrl || '');
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

  const saveRequirementChanges = async () => {
    if (!detailRequirement) return;
    
    const jiraKey = extractJiraKey(editJiraUrl);
    
    const updatedRequirement: Requirement = {
      ...detailRequirement,
      title: editTitle,
      description: editDescription,
      jiraUrl: editJiraUrl,
      jiraKey: jiraKey
    };
    
    try {
      const result = await DataStorage.updateRequirement(updatedRequirement);
      
      if (result.success && result.requirement) {
        // Update local state with the server response
        setRequirements(requirements.map(req => 
          req.id === detailRequirement.id ? result.requirement! : req
        ));
        
        setDetailRequirement(result.requirement);
        setHasUnsavedChanges(false);
      } else {
        console.error('Failed to update requirement:', result.error);
        // Could show error message to user here
        alert('保存失败: ' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('Error saving requirement changes:', error);
      alert('保存失败: 网络错误');
    }
  };

  const cancelRequirementChanges = () => {
    if (detailRequirement) {
      setEditTitle(detailRequirement.title);
      setEditDescription(detailRequirement.description || '');
      setEditJiraUrl(detailRequirement.jiraUrl || '');
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
            {(['BACKLOG', 'DEVELOPMENT', 'TESTING', 'READY', 'RELEASED'] as const).map((status) => (
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
                      onClick={() => openRequirementDetail(req)}
                      className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
                        req.jiraKey ? 'border-l-purple-500' : 'border-l-gray-300'
                      } ${draggedRequirement?.id === req.id ? 'opacity-50' : ''} ${
                        updatingRequirements.has(req.id) ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                      }`}
                    >
                      {/* 需求卡片头部 */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-medium text-gray-900 dark:text-white flex-1 flex items-center gap-2">
                          {req.title}
                          {updatingRequirements.has(req.id) && (
                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRequirement(req.id);
                          }}
                          className="text-gray-400 hover:text-red-500 ml-2"
                        >
                          ×
                        </button>
                      </div>
                      
                      {/* 需求编号和JIRA标签 */}
                      <div className="mb-2 flex items-center gap-2 flex-wrap">
                        {/* 系统需求编号 */}
                        <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded">
                          {req.requirementNumber}
                        </span>
                        
                        {/* JIRA标签 */}
                        {req.jiraKey && (
                          <span className="px-2 py-1 bg-purple-500 text-white text-xs rounded">
                            {req.jiraKey}
                          </span>
                        )}
                      </div>
                      
                      {/* 需求描述 */}
                      {req.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                          {req.description}
                        </p>
                      )}
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
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={closeRequirementDetail}
        >
          <div 
            className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-white/20 dark:border-gray-700/50 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">需求详情</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      router.push(`/requirements/${detailRequirement.requirementNumber}`);
                    }}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    title="跳转到详情页面"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
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
                </div>
              </div>
              
              <div className="space-y-6">
                {/* 基本信息 */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">基本信息</h3>
                  
                  <div className="space-y-4">
                    {/* 需求编号 - 只读显示 */}
                    <div>
                      <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">需求编号：</label>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md font-medium">
                          {detailRequirement.requirementNumber}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">系统自动生成</span>
                      </div>
                    </div>
                    
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
                      关联分支 ({detailRequirement.branches?.length || 0})
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
                        .filter(p => !detailRequirement.branches?.some(b => b.projectId === p.id))
                        .map(project => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                  
                  {(detailRequirement.branches?.length || 0) === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 italic">暂未绑定任何项目分支</p>
                  ) : (
                    <div className="space-y-3">
                      {detailRequirement.branches?.map((branch) => {
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
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={closeGitOperations}
        >
          <div 
            className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-white/20 dark:border-gray-700/50 max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Git操作</h2>
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
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={closeNewRequirement}
        >
          <div 
            className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-white/20 dark:border-gray-700/50 max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">新建需求</h2>
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