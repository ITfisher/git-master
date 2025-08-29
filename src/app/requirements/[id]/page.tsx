'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { DataStorage, ProjectTemplate, RequirementBranch, Requirement } from '@/utils/dataStorage';
import { BranchOperations } from '@/utils/branchOperations';

export default function RequirementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requirementId = params.id as string;
  
  const [projects, setProjects] = useState<ProjectTemplate[]>([]);
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // 编辑状态
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editJiraUrl, setEditJiraUrl] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Git操作弹窗状态
  const [showGitOperations, setShowGitOperations] = useState(false);
  const [operationBranch, setOperationBranch] = useState<RequirementBranch | null>(null);
  const [operationProject, setOperationProject] = useState<ProjectTemplate | null>(null);

  // 数据加载
  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedProjects = await DataStorage.loadProjects();
        const loadedRequirements = await DataStorage.loadRequirements();
        
        // 查找当前需求 - 按requirementNumber查找
        const currentRequirement = loadedRequirements.find(req => 
          req.requirementNumber === requirementId
        );
        
        if (!currentRequirement) {
          // 需求不存在，跳转回需求列表页
          router.push('/requirements');
          return;
        }
        
        setProjects(loadedProjects);
        setRequirement(currentRequirement);
        setEditTitle(currentRequirement.title);
        setEditDescription(currentRequirement.description || '');
        setEditJiraUrl(currentRequirement.jiraUrl || '');
        setIsDataLoaded(true);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load requirement data:', error);
        setLoading(false);
      }
    };
    
    if (!isDataLoaded && requirementId) {
      loadData();
    }
  }, [isDataLoaded, requirementId, router]);

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

  // 为需求添加新分支
  const addBranchToRequirement = async (projectId: string) => {
    if (!requirement) return;

    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    try {
      const result = await BranchOperations.addBranchToRequirement(requirement, projectId);
      
      if (result.success && result.branch) {
        // 更新本地状态，添加新分支
        const updatedRequirement = {
          ...requirement,
          branches: [...requirement.branches, result.branch]
        };
        setRequirement(updatedRequirement);
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
  const deleteBranch = async (branchId: string) => {
    if (!requirement) return;

    try {
      const result = await BranchOperations.deleteRequirementBranch(branchId);
      
      if (result.success) {
        // 更新本地状态，移除分支
        const updatedRequirement = {
          ...requirement,
          branches: requirement.branches.filter(branch => branch.id !== branchId)
        };
        setRequirement(updatedRequirement);
      } else {
        console.error('Failed to delete branch:', result.error);
        alert('删除分支失败: ' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('Error deleting branch:', error);
      alert('删除分支失败: 网络错误');
    }
  };

  // 需求编辑函数
  const handleFieldChange = (field: 'title' | 'description' | 'jiraUrl', value: string) => {
    if (!requirement) return;
    
    // 更新编辑状态
    if (field === 'title') setEditTitle(value);
    if (field === 'description') setEditDescription(value);
    if (field === 'jiraUrl') setEditJiraUrl(value);
    
    // 检查是否有变化
    const hasChanges = 
      (field === 'title' ? value : editTitle) !== requirement.title ||
      (field === 'description' ? value : editDescription) !== requirement.description ||
      (field === 'jiraUrl' ? value : editJiraUrl) !== requirement.jiraUrl;
    
    setHasUnsavedChanges(hasChanges);
  };

  const saveRequirementChanges = async () => {
    if (!requirement) return;
    
    const jiraKey = extractJiraKey(editJiraUrl);
    
    const updatedRequirement: Requirement = {
      ...requirement,
      title: editTitle,
      description: editDescription,
      jiraUrl: editJiraUrl,
      jiraKey: jiraKey
    };
    
    try {
      const result = await DataStorage.updateRequirement(updatedRequirement);
      
      if (result.success && result.requirement) {
        // 使用服务器返回的最新数据更新本地状态
        setRequirement(result.requirement);
        setHasUnsavedChanges(false);
        
        // 同步更新编辑状态
        setEditTitle(result.requirement.title);
        setEditDescription(result.requirement.description || '');
        setEditJiraUrl(result.requirement.jiraUrl || '');
      } else {
        console.error('Failed to update requirement:', result.error);
        alert('保存失败: ' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('Error saving requirement changes:', error);
      alert('保存失败: 网络错误');
    }
  };

  const cancelRequirementChanges = () => {
    if (requirement) {
      setEditTitle(requirement.title);
      setEditDescription(requirement.description || '');
      setEditJiraUrl(requirement.jiraUrl || '');
      setHasUnsavedChanges(false);
    }
  };

  // Git操作弹窗函数
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

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">加载中...</div>
        </div>
      </AppLayout>
    );
  }

  if (!requirement) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-gray-500 dark:text-gray-400 mb-4">需求不存在</div>
            <button
              onClick={() => router.push('/requirements')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              返回需求列表
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        <div className="flex-1 flex flex-col">
          {/* 页面头部 */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/requirements')}
                  className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  返回需求列表
                </button>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">需求详情</h1>
              </div>
              {hasUnsavedChanges && (
                <div className="flex items-center gap-3">
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
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1 space-y-6">
            {/* 基本信息 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">基本信息</h2>
              
              <div className="space-y-4">
                {/* 需求编号 - 只读显示 */}
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">需求编号：</label>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md font-medium">
                      {requirement.requirementNumber}
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
                  {requirement.jiraUrl && !hasUnsavedChanges && (
                    <div className="mt-2">
                      <a 
                        href={requirement.jiraUrl}
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  关联分支 ({requirement.branches?.length || 0})
                </h2>
                <select
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                  onChange={(e) => {
                    if (e.target.value) {
                      addBranchToRequirement(e.target.value);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">+ 绑定项目分支</option>
                  {projects
                    .filter(p => !requirement.branches?.some(b => b.projectId === p.id))
                    .map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))
                  }
                </select>
              </div>
              
              {(requirement.branches?.length || 0) === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 italic">暂未绑定任何项目分支</p>
              ) : (
                <div className="space-y-3">
                  {requirement.branches?.map((branch) => {
                    const project = projects.find(p => p.id === branch.projectId);
                    return (
                      <div key={branch.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border">
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
                              onClick={() => deleteBranch(branch.id)}
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
    </AppLayout>
  );
}