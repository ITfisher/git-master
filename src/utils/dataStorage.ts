export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  gitRepository?: string;
  masterBranch: string;
  qaBranch: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
}

export interface RequirementBranch {
  id: string;
  requirementId: number;
  projectId: string;
  branchName: string;
  status: 'PENDING' | 'DEVELOPMENT' | 'TESTING' | 'READY' | 'RELEASED';
  createdAt: Date;
  updatedAt: Date;
}

export interface Requirement {
  id: number; // 数据库自增主键
  requirementNumber: string; // BN前缀+id的业务主键，如 BN-1, BN-2, 表内唯一
  title: string;
  description?: string;
  jiraUrl?: string;
  jiraKey?: string;
  status: 'BACKLOG' | 'DEVELOPMENT' | 'TESTING' | 'READY' | 'RELEASED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startTime?: Date; // 开发开始时间
  endTime?: Date; // 开发结束时间
  createdAt: Date;
  updatedAt: Date;
  branches: RequirementBranch[];
}

// 客户端数据管理工具
export class DataStorage {
  // 加载项目数据
  static async loadProjects(): Promise<ProjectTemplate[]> {
    try {
      const response = await fetch('/api/data/projects');
      if (response.ok) {
        return await response.json();
      }
      console.error('Failed to load projects');
      return [];
    } catch (error) {
      console.error('Error loading projects:', error);
      return [];
    }
  }

  // 保存项目数据
  static async saveProjects(projects: ProjectTemplate[]): Promise<boolean> {
    try {
      const response = await fetch('/api/data/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projects),
      });
      
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error saving projects:', error);
      return false;
    }
  }

  // 加载需求数据
  static async loadRequirements(): Promise<Requirement[]> {
    try {
      const response = await fetch('/api/data/requirements/list');
      if (response.ok) {
        return await response.json();
      }
      console.error('Failed to load requirements');
      return [];
    } catch (error) {
      console.error('Error loading requirements:', error);
      return [];
    }
  }

  // 批量保存需求数据 - 已弃用，请使用具体的 createRequirement, updateRequirement, deleteRequirement 方法
  static async saveRequirements(requirements: Requirement[]): Promise<boolean> {
    console.warn('saveRequirements is deprecated. Use createRequirement, updateRequirement, or deleteRequirement instead.');
    
    // 为了向后兼容暂时保留，但不推荐使用
    try {
      const response = await fetch('/api/data/requirements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requirements),
      });
      
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error saving requirements:', error);
      return false;
    }
  }

  // 更新单个需求
  static async updateRequirement(requirement: Requirement): Promise<{ success: boolean; requirement?: Requirement; error?: string }> {
    try {
      const response = await fetch('/api/data/requirements/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requirement),
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error updating requirement:', error);
      return { success: false, error: 'Network error' };
    }
  }

  // 添加分支到需求
  static async addBranchToRequirement(requirementId: number, projectId: string, branchName: string): Promise<{ success: boolean; branch?: RequirementBranch; error?: string }> {
    try {
      const response = await fetch('/api/data/requirements/branches/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirementId,
          projectId,
          branchName,
          status: 'PENDING'
        }),
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error adding branch to requirement:', error);
      return { success: false, error: 'Network error' };
    }
  }

  // 删除需求分支
  static async deleteRequirementBranch(branchId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/data/requirements/branches/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branchId
        }),
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error deleting requirement branch:', error);
      return { success: false, error: 'Network error' };
    }
  }

  // 创建单个需求
  static async createRequirement(requirement: Omit<Requirement, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; requirement?: Requirement; error?: string }> {
    try {
      const response = await fetch('/api/data/requirements/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requirement),
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error creating requirement:', error);
      return { success: false, error: 'Network error' };
    }
  }

  // 删除需求
  static async deleteRequirement(requirementId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/data/requirements/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: requirementId
        }),
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error deleting requirement:', error);
      return { success: false, error: 'Network error' };
    }
  }

}