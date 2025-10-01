const { db } = require('../db');

/**
 * Check and delete projects that have no targets (channels)
 * @param {string} projectId - Optional project ID to check specific project
 * @returns {Promise} - Resolves with cleanup stats
 */
const cleanupProjectsWithNoTargets = (projectId = null) => {
  return new Promise((resolve, reject) => {
    const findSql = projectId 
      ? 'SELECT id, name FROM projects WHERE id = ?'
      : 'SELECT id, name FROM projects';
    
    const params = projectId ? [projectId] : [];
    
    db.all(findSql, params, (err, projects) => {
      if (err) {
        return reject(err);
      }
      
      if (projects.length === 0) {
        return resolve({ deleted: [] });
      }
      
      const deletedProjects = [];
      let checked = 0;
      
      projects.forEach(project => {
        const countSql = 'SELECT COUNT(*) as count FROM project_targets WHERE project_id = ?';
        db.get(countSql, [project.id], (countErr, result) => {
          if (!countErr && result.count === 0) {
            // No targets, delete project
            const deleteSql = 'DELETE FROM projects WHERE id = ?';
            db.run(deleteSql, [project.id], () => {
              deletedProjects.push(project.name);
            });
          }
          
          checked++;
          if (checked === projects.length) {
            setTimeout(() => resolve({ deleted: deletedProjects }), 100);
          }
        });
      });
    });
  });
};

/**
 * Check and delete projects that have no messages (files)
 * @param {string} projectId - Optional project ID to check specific project
 * @returns {Promise} - Resolves with cleanup stats
 */
const cleanupProjectsWithNoMessages = (projectId = null) => {
  return new Promise((resolve, reject) => {
    const findSql = projectId 
      ? 'SELECT id, name FROM projects WHERE id = ?'
      : 'SELECT id, name FROM projects';
    
    const params = projectId ? [projectId] : [];
    
    db.all(findSql, params, (err, projects) => {
      if (err) {
        return reject(err);
      }
      
      if (projects.length === 0) {
        return resolve({ deleted: [] });
      }
      
      const deletedProjects = [];
      let checked = 0;
      
      projects.forEach(project => {
        const countSql = 'SELECT COUNT(*) as count FROM project_messages WHERE project_id = ?';
        db.get(countSql, [project.id], (countErr, result) => {
          if (!countErr && result.count === 0) {
            // No messages, delete project
            const deleteSql = 'DELETE FROM projects WHERE id = ?';
            db.run(deleteSql, [project.id], () => {
              deletedProjects.push(project.name);
            });
          }
          
          checked++;
          if (checked === projects.length) {
            setTimeout(() => resolve({ deleted: deletedProjects }), 100);
          }
        });
      });
    });
  });
};

/**
 * Comprehensive project validation and cleanup
 * Deletes projects that are missing critical components
 * @param {string} projectId - Optional project ID to check specific project
 * @returns {Promise} - Resolves with cleanup stats
 */
const validateAndCleanupProjects = async (projectId = null) => {
  try {
    const noTargets = await cleanupProjectsWithNoTargets(projectId);
    const noMessages = await cleanupProjectsWithNoMessages(projectId);
    
    return {
      success: true,
      deleted_due_to_no_targets: noTargets.deleted,
      deleted_due_to_no_messages: noMessages.deleted,
      total_deleted: [...new Set([...noTargets.deleted, ...noMessages.deleted])].length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  cleanupProjectsWithNoTargets,
  cleanupProjectsWithNoMessages,
  validateAndCleanupProjects
};
