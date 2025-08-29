'use client';

import { useState } from 'react';

export default function GitManager() {
  const [projectName, setProjectName] = useState('');
  const [qaBranch, setQaBranch] = useState('qa');
  const [masterBranch, setMasterBranch] = useState('master');
  const [featureBranch, setFeatureBranch] = useState('');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const generateCreateFeatureCommands = () => {
    if (!projectName || !featureBranch) return [];
    
    return [
      `git fetch origin && git checkout ${masterBranch} && git pull origin ${masterBranch} && git checkout -b ${featureBranch} && git push -u origin ${featureBranch}`
    ];
  };

  const generateMergeToQaCommands = () => {
    if (!projectName || !featureBranch) return [];
    
    return [
      `git fetch origin && git checkout ${qaBranch} && git pull origin ${qaBranch} && git merge ${featureBranch} && git push origin ${qaBranch}`
    ];
  };

  const generateRollbackCommands = () => {
    if (!projectName || !featureBranch) return [];
    
    return [
      `git fetch origin && git checkout ${qaBranch} && git pull origin ${qaBranch} && git log --oneline -1 | grep -q "Merge branch '${featureBranch}'" && echo "确认撤销来自${featureBranch}分支的合并" && git revert -m 1 HEAD --no-edit && git push origin ${qaBranch} || echo "错误：最后一次提交不是来自${featureBranch}分支的合并，撤销操作已取消"`
    ];
  };

  const generateContinueDevCommands = () => {
    if (!projectName || !featureBranch) return [];
    
    return [
      `git fetch origin && git checkout ${featureBranch} && git pull origin ${masterBranch} && git merge ${masterBranch} && git checkout ${qaBranch} && git pull origin ${qaBranch} && git merge ${featureBranch} && git push origin ${qaBranch}`
    ];
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Git 分支管理工具
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  项目名称
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="输入项目名称"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  QA分支名称
                </label>
                <input
                  type="text"
                  value={qaBranch}
                  onChange={(e) => setQaBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Master分支名称
                </label>
                <input
                  type="text"
                  value={masterBranch}
                  onChange={(e) => setMasterBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Feature分支名称
                </label>
                <input
                  type="text"
                  value={featureBranch}
                  onChange={(e) => setFeatureBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="输入feature分支名称"
                />
              </div>
            </div>
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
        </div>
      </div>
    </div>
  );
}
