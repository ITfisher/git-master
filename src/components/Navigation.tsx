'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 更新CSS变量来通知主内容区域侧边栏宽度变化
  useEffect(() => {
    const width = isCollapsed ? '64px' : '256px';
    document.documentElement.style.setProperty('--sidebar-width', width);
  }, [isCollapsed]);

  // 初始设置CSS变量
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', '256px');
  }, []);

  const navItems = [
    { key: 'dashboard', label: '仪表盘', href: '/dashboard', icon: '📊' },
    { key: 'projects', label: '项目管理', href: '/projects', icon: '📁' },
    { key: 'requirements', label: '需求管理', href: '/requirements', icon: '📋' }
  ];

  return (
    <div 
      data-sidebar
      className={`${isCollapsed ? 'w-16' : 'w-64'} fixed left-0 top-0 h-full bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 z-40 flex flex-col`}
    >
      {/* 头部区域 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
        {!isCollapsed && (
          <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
            Git 项目管理工具
          </h1>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={isCollapsed ? '展开菜单' : '收缩菜单'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>
      
      {/* 导航菜单 */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-3 rounded-lg text-left transition-colors mb-2 group relative ${
              pathname === item.href
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={isCollapsed ? item.label : ''}
          >
            <span className="text-lg flex-shrink-0">{item.icon}</span>
            {!isCollapsed && (
              <span className="font-medium truncate">{item.label}</span>
            )}
            
            {/* 收缩状态下的悬浮提示 */}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                {item.label}
              </div>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}