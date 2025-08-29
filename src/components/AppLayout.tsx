'use client';

import Navigation from './Navigation';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      {/* 主内容区域 - 使用CSS变量来适应侧边栏宽度 */}
      <div 
        className="min-h-screen transition-all duration-300"
        style={{ marginLeft: 'var(--sidebar-width, 256px)' }}
      >
        <div className="p-6 h-screen">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 h-full overflow-hidden">
            <div className="h-full overflow-y-auto">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}