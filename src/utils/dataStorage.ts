export interface ProjectTemplate {
  id: string;
  name: string;
  qaBranch: string;
  masterBranch: string;
}

export interface RequirementBranch {
  id: string;
  projectId: string;
  branchName: string;
  status: 'pending' | 'development' | 'testing' | 'ready' | 'released';
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  jiraUrl: string;
  jiraKey: string;
  branches: RequirementBranch[];
  status: 'backlog' | 'development' | 'testing' | 'ready' | 'released';
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
      const response = await fetch('/api/data/requirements');
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

  // 保存需求数据
  static async saveRequirements(requirements: Requirement[]): Promise<boolean> {
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

  // 迁移localStorage数据到文件存储（一次性操作）
  static async migrateFromLocalStorage(): Promise<void> {
    try {
      // 迁移项目数据
      const savedProjects = localStorage.getItem('git-manager-projects');
      if (savedProjects) {
        const projects = JSON.parse(savedProjects);
        await this.saveProjects(projects);
        localStorage.removeItem('git-manager-projects');
        console.log('Projects migrated from localStorage to file storage');
      }

      // 迁移需求数据
      const savedRequirements = localStorage.getItem('git-manager-requirements');
      if (savedRequirements) {
        const requirements = JSON.parse(savedRequirements);
        await this.saveRequirements(requirements);
        localStorage.removeItem('git-manager-requirements');
        console.log('Requirements migrated from localStorage to file storage');
      }
    } catch (error) {
      console.error('Error migrating data from localStorage:', error);
    }
  }
}