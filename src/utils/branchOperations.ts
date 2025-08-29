import { DataStorage, Requirement, RequirementBranch, ProjectTemplate } from './dataStorage';

/**
 * 分支操作工具类 - 确保需求详情页和弹窗中的分支操作逻辑一致
 */
export class BranchOperations {
  /**
   * 生成分支名称
   */
  static generateBranchName(requirement: Requirement): string {
    const jiraKey = requirement.jiraKey;
    
    if (jiraKey) {
      return `feature/${jiraKey.toLowerCase()}`;
    } else {
      // 使用系统需求编号作为分支名称
      return `feature/${requirement.requirementNumber.toLowerCase()}`;
    }
  }

  /**
   * 为需求添加新分支
   */
  static async addBranchToRequirement(
    requirement: Requirement,
    projectId: string
  ): Promise<{ success: boolean; branch?: RequirementBranch; error?: string }> {
    const branchName = this.generateBranchName(requirement);
    
    try {
      const result = await DataStorage.addBranchToRequirement(
        requirement.id,
        projectId,
        branchName
      );
      
      return result;
    } catch (error) {
      console.error('Error adding branch to requirement:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * 删除需求分支
   */
  static async deleteRequirementBranch(
    branchId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await DataStorage.deleteRequirementBranch(branchId);
      return result;
    } catch (error) {
      console.error('Error deleting requirement branch:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * 检查项目是否已经绑定到需求
   */
  static isProjectBoundToRequirement(requirement: Requirement, projectId: string): boolean {
    return requirement.branches.some(branch => branch.projectId === projectId);
  }

  /**
   * 获取可绑定的项目列表（排除已绑定的）
   */
  static getAvailableProjects(
    requirement: Requirement,
    allProjects: ProjectTemplate[]
  ): ProjectTemplate[] {
    return allProjects.filter(project => 
      !this.isProjectBoundToRequirement(requirement, project.id)
    );
  }
}