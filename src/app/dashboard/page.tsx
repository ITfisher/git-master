'use client';

import AppLayout from '@/components/AppLayout';

export default function DashboardPage() {
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

        {/* 占位内容 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              仪表盘功能开发中
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
              这里将展示项目和需求的统计数据、进度图表等信息。
              未来版本将支持数据可视化和报表功能。
            </p>
          </div>
        </div>

        {/* 预留的统计卡片区域 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: '总项目数', value: '--', icon: '📁', color: 'bg-blue-500' },
            { title: '总需求数', value: '--', icon: '📋', color: 'bg-green-500' },
            { title: '进行中', value: '--', icon: '⚡', color: 'bg-yellow-500' },
            { title: '已完成', value: '--', icon: '✅', color: 'bg-purple-500' }
          ].map((stat, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center">
                <div className={`${stat.color} p-3 rounded-lg mr-4`}>
                  <span className="text-white text-xl">{stat.icon}</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}