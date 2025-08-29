'use client';

import { useState, useEffect } from 'react';

interface ProjectTemplate {
  id: string;
  name: string;
  qaBranch: string;
  masterBranch: string;
}

interface Requirement {
  id: string;
  title: string;
  description: string;
  jiraUrl: string;
  jiraKey: string;
  branchName: string;
  status: 'pending' | 'development' | 'qa' | 'completed';
  projectId: string;
}

export default function GitManager() {
  const [projects, setProjects] = useState<ProjectTemplate[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectTemplate | null>(null);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [activeTab, setActiveTab] = useState<'projects' | 'requirements' | 'commands'>('projects');
  
  // 项目模板相关状态
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectQa, setNewProjectQa] = useState('qa');
  const [newProjectMaster, setNewProjectMaster] = useState('master');
  
  // 需求相关状态
  const [newReqTitle, setNewReqTitle] = useState('');
  const [newReqDescription, setNewReqDescription] = useState('');
  const [newReqJiraUrl, setNewReqJiraUrl] = useState('');
  
  // 本地存储
  useEffect(() => {
    const savedProjects = localStorage.getItem('git-manager-projects');
    const savedRequirements = localStorage.getItem('git-manager-requirements');
    
    if (savedProjects) {
      const parsed = JSON.parse(savedProjects);
      setProjects(parsed);
      if (parsed.length > 0 && !selectedProject) {
        setSelectedProject(parsed[0]);
      }
    }
    
    if (savedRequirements) {
      setRequirements(JSON.parse(savedRequirements));
    }
  }, []);
  
  useEffect(() => {
    localStorage.setItem('git-manager-projects', JSON.stringify(projects));
  }, [projects]);
  
  useEffect(() => {
    localStorage.setItem('git-manager-requirements', JSON.stringify(requirements));
  }, [requirements]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

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
    setRequirements(requirements.filter(r => r.projectId !== projectId));
    if (selectedProject?.id === projectId) {
      setSelectedProject(projects[0] || null);
    }
  };

  // 从JIRA URL中提取需求号
  const extractJiraKey = (url: string): string => {
    if (!url) return '';
    
    // 支持多种JIRA URL格式
    // https://company.atlassian.net/browse/PROJ-123
    // https://jira.company.com/browse/PROJ-123
    // https://company.jira.com/projects/PROJ/issues/PROJ-123
    const patterns = [
      /\/browse\/([A-Z]+-\d+)/,           // 标准格式
      /\/issues\/([A-Z]+-\d+)/,          // 新格式
      /\/([A-Z]+-\d+)$/,                 // 简化格式
      /[?&]selectedIssue=([A-Z]+-\d+)/   // 查询参数格式
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
    if (!newReqTitle.trim() || !selectedProject) return;
    
    const jiraKey = extractJiraKey(newReqJiraUrl);
    let branchName = '';
    
    if (jiraKey) {
      // 基于JIRA Key生成分支名
      branchName = `feature/${jiraKey.toLowerCase()}`;
    } else {
      // 降级到基于标题生成分支名
      branchName = `feature/${newReqTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    }
    
    const newReq: Requirement = {
      id: Date.now().toString(),
      title: newReqTitle,
      description: newReqDescription,
      jiraUrl: newReqJiraUrl,
      jiraKey: jiraKey,
      branchName,
      status: 'pending',
      projectId: selectedProject.id
    };
    
    setRequirements([...requirements, newReq]);
    setNewReqTitle('');
    setNewReqDescription('');
    setNewReqJiraUrl('');
  };

  const deleteRequirement = (reqId: string) => {
    setRequirements(requirements.filter(r => r.id !== reqId));
    if (selectedRequirement?.id === reqId) {
      setSelectedRequirement(null);
    }
  };

  const updateRequirementStatus = (reqId: string, status: Requirement['status']) => {
    setRequirements(requirements.map(r => 
      r.id === reqId ? { ...r, status } : r
    ));
  };

  // Git命令生成
  const generateCreateFeatureCommands = () => {
    if (!selectedProject || !selectedRequirement) return [];
    
    return [
      `git fetch origin && git checkout ${selectedProject.masterBranch} && git pull origin ${selectedProject.masterBranch} && git checkout -b ${selectedRequirement.branchName} && git push -u origin ${selectedRequirement.branchName}`
    ];
  };

  const generateMergeToQaCommands = () => {
    if (!selectedProject || !selectedRequirement) return [];
    
    return [
      `git fetch origin && git checkout ${selectedProject.qaBranch} && git pull origin ${selectedProject.qaBranch} && git merge ${selectedRequirement.branchName} && git push origin ${selectedProject.qaBranch}`
    ];
  };

  const generateRollbackCommands = () => {
    if (!selectedProject || !selectedRequirement) return [];
    
    return [
      `git fetch origin && git checkout ${selectedProject.qaBranch} && git pull origin ${selectedProject.qaBranch} && git log --oneline -1 | grep -q "Merge branch '${selectedRequirement.branchName}'" && echo "确认撤销来自${selectedRequirement.branchName}分支的合并" && git revert -m 1 HEAD --no-edit && git push origin ${selectedProject.qaBranch} || echo "错误：最后一次提交不是来自${selectedRequirement.branchName}分支的合并，撤销操作已取消"`
    ];
  };

  const generateContinueDevCommands = () => {
    if (!selectedProject || !selectedRequirement) return [];
    
    return [
      `git fetch origin && git checkout ${selectedRequirement.branchName} && git pull origin ${selectedProject.masterBranch} && git merge ${selectedProject.masterBranch} && git checkout ${selectedProject.qaBranch} && git pull origin ${selectedProject.qaBranch} && git merge ${selectedRequirement.branchName} && git push origin ${selectedProject.qaBranch}`
    ];
  };

  const copyCommands = (commands: string[]) => {
    if (commands.length > 0) {
      copyToClipboard(commands.join('\n'));
    }
  };

  const getProjectRequirements = () => {
    return requirements.filter(r => r.projectId === selectedProject?.id);
  };

  const getStatusColor = (status: Requirement['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-500';
      case 'development': return 'bg-blue-500';
      case 'qa': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: Requirement['status']) => {
    switch (status) {
      case 'pending': return '待开发';
      case 'development': return '开发中';
      case 'qa': return 'QA测试';
      case 'completed': return '已完成';
      default: return '未知';
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Git 项目管理工具
          </h1>

          {/* 标签页导航 */}
          <div className="border-b border-gray-200 dark:border-gray-600 mb-6">
            <nav className="flex space-x-8">
              {[
                { key: 'projects', label: '项目管理' },
                { key: 'requirements', label: '需求管理' },
                { key: 'commands', label: 'Git操作' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* 项目管理页面 */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
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

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">项目列表</h3>
                {projects.map((project) => (
                  <div key={project.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{project.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        QA: {project.qaBranch} | Master: {project.masterBranch}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedProject(project)}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          selectedProject?.id === project.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                        }`}
                      >
                        选择
                      </button>
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 需求管理页面 */}
          {activeTab === 'requirements' && (
            <div className="space-y-6">
              {!selectedProject ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">请先在项目管理中选择一个项目</p>
                </div>
              ) : (
                <>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      新建需求 - {selectedProject.name}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          JIRA链接 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="url"
                          value={newReqJiraUrl}
                          onChange={(e) => setNewReqJiraUrl(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                          placeholder="https://company.atlassian.net/browse/PROJ-123"
                        />
                        {newReqJiraUrl && extractJiraKey(newReqJiraUrl) && (
                          <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                            ✓ 检测到需求号: {extractJiraKey(newReqJiraUrl)}
                          </p>
                        )}
                        {newReqJiraUrl && !extractJiraKey(newReqJiraUrl) && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            ⚠ 无法从链接中提取需求号，请检查链接格式
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          需求标题 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newReqTitle}
                          onChange={(e) => setNewReqTitle(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                          placeholder="需求标题"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          需求描述
                        </label>
                        <textarea
                          value={newReqDescription}
                          onChange={(e) => setNewReqDescription(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                          placeholder="需求描述（可选）"
                          rows={3}
                        />
                      </div>
                      {newReqTitle && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-medium">预览分支名:</span> {
                              extractJiraKey(newReqJiraUrl) 
                                ? `feature/${extractJiraKey(newReqJiraUrl).toLowerCase()}`
                                : `feature/${newReqTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`
                            }
                          </p>
                        </div>
                      )}
                      <button
                        onClick={addRequirement}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium"
                      >
                        添加需求
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      需求列表 - {selectedProject.name}
                    </h3>
                    {getProjectRequirements().map((req) => (
                      <div key={req.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-gray-900 dark:text-white">{req.title}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs text-white ${getStatusColor(req.status)}`}>
                                {getStatusText(req.status)}
                              </span>
                              {req.jiraKey && (
                                <span className="px-2 py-1 rounded-full text-xs bg-purple-500 text-white">
                                  {req.jiraKey}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                              <p><span className="font-medium">分支:</span> {req.branchName}</p>
                              {req.jiraUrl && (
                                <p>
                                  <span className="font-medium">JIRA:</span> 
                                  <a 
                                    href={req.jiraUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="ml-1 text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    查看链接 ↗
                                  </a>
                                </p>
                              )}
                              {req.description && (
                                <p><span className="font-medium">描述:</span> {req.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <select
                              value={req.status}
                              onChange={(e) => updateRequirementStatus(req.id, e.target.value as Requirement['status'])}
                              className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-600 dark:text-white"
                            >
                              <option value="pending">待开发</option>
                              <option value="development">开发中</option>
                              <option value="qa">QA测试</option>
                              <option value="completed">已完成</option>
                            </select>
                            <button
                              onClick={() => setSelectedRequirement(req)}
                              className={`px-3 py-1 rounded text-sm font-medium ${
                                selectedRequirement?.id === req.id
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                              }`}
                            >
                              选择
                            </button>
                            <button
                              onClick={() => deleteRequirement(req.id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Git操作页面 */}
          {activeTab === 'commands' && (
            <div className="space-y-6">
              {!selectedProject || !selectedRequirement ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    请先选择项目和需求才能生成Git命令
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">当前选择</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      项目: {selectedProject.name} | 需求: {selectedRequirement.title} | 分支: {selectedRequirement.branchName}
                    </p>
                  </div>

                  <div className="space-y-6">
                    <CommandSection
                      title="1. 创建Feature分支"
                      description="从master分支创建新的feature分支并推送到远程仓库"
                      commands={generateCreateFeatureCommands()}
                    />

                    <CommandSection
                      title="2. 合并到QA分支"
                      description="将开发完成的feature分支合并到QA分支进行测试"
                      commands={generateMergeToQaCommands()}
                    />

                    <CommandSection
                      title="3. 撤销QA合并"
                      description="安全撤销QA分支中来自指定feature分支的最后一次合并（使用revert保留历史记录）"
                      commands={generateRollbackCommands()}
                    />

                    <CommandSection
                      title="4. 继续开发"
                      description="在feature分支继续开发，先同步master分支最新代码，完成后再次合并到QA"
                      commands={generateContinueDevCommands()}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
