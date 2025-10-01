import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert } from 'react-bootstrap';
import axios from 'axios';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentProject, setCurrentProject] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/projects');
      if (response.data.success) {
        setProjects(response.data.data);
      }
    } catch (error) {
      setError('Failed to fetch projects: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = (project = null) => {
    if (project) {
      setCurrentProject(project);
    } else {
      setCurrentProject({ name: '', description: '' });
    }
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (currentProject.id) {
        // Update existing project (not implemented in backend yet)
        alert('Update functionality would be implemented in a full version');
      } else {
        // Create new project
        await axios.post('/api/projects', currentProject);
        setSuccess('Project created successfully');
      }
      
      fetchProjects();
      handleCloseModal();
    } catch (error) {
      setError('Error saving project: ' + error.message);
    }
  };

  const handleRun = async (id) => {
    try {
      await axios.post(`/api/projects/${id}/run`, { started_by: 'user' });
      setSuccess('Project started successfully');
      fetchProjects();
    } catch (error) {
      setError('Error running project: ' + error.message);
    }
  };

  const handleStop = async (id) => {
    try {
      await axios.post(`/api/projects/${id}/stop`);
      setSuccess('Project stopped successfully');
      fetchProjects();
    } catch (error) {
      setError('Error stopping project: ' + error.message);
    }
  };

  const openDeleteModal = (project) => {
    setDeleteTarget(project);
    setDeleteConfirmText('');
    setError('');
    setSuccess('');
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
    setDeleteConfirmText('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmText.trim().toLowerCase() !== 'deleted') {
      setError('Type "deleted" to confirm deletion.');
      return;
    }
    try {
      await axios.delete(`/api/projects/${deleteTarget.id}`);
      setSuccess(`Project "${deleteTarget.name}" deleted successfully.`);
      closeDeleteModal();
      fetchProjects();
    } catch (err) {
      setError('Failed to delete project: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return <Container><p>Loading projects...</p></Container>;

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Projects</h2>
        <div className="d-flex gap-2 align-items-center">
          <Form.Control
            size="sm"
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '240px' }}
          />
          <Button variant="primary" onClick={() => handleShowModal()}>
            Add Project
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Table striped bordered hover>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Description</th>
            <th>Status</th>
            <th>Created At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects
            .filter((project) => {
              const q = search.toLowerCase();
              if (!q) return true;
              return (
                (project.name || '').toLowerCase().includes(q) ||
                (project.description || '').toLowerCase().includes(q) ||
                (project.status || '').toLowerCase().includes(q) ||
                (project.id || '').toLowerCase().includes(q)
              );
            })
            .map((project) => (
            <tr key={project.id}>
              <td>{project.id.substring(0, 8)}...</td>
              <td>{project.name}</td>
              <td>{project.description}</td>
              <td>
                <span className={`badge ${project.status === 'running' ? 'bg-success' : project.status === 'stopped' ? 'bg-secondary' : project.status === 'paused' ? 'bg-warning' : 'bg-danger'}`}>
                  {project.status}
                </span>
              </td>
              <td>{new Date(project.created_at).toLocaleString()}</td>
              <td>
                {project.status === 'stopped' ? (
                  <Button 
                    variant="success" 
                    size="sm" 
                    className="me-2"
                    onClick={() => handleRun(project.id)}
                  >
                    Run
                  </Button>
                ) : (
                  <Button 
                    variant="warning" 
                    size="sm" 
                    className="me-2"
                    onClick={() => handleStop(project.id)}
                  >
                    Stop
                  </Button>
                )}
                <Button 
                  variant="outline-info" 
                  size="sm"
                  className="me-2"
                  onClick={() => {
                    // In a real app, this would navigate to a project details page
                    alert(`Navigating to project details for ${project.name}`);
                  }}
                >
                  View
                </Button>
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={() => openDeleteModal(project)}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{currentProject.id ? 'Edit Project' : 'Add New Project'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                value={currentProject.name}
                onChange={(e) => setCurrentProject({...currentProject, name: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={currentProject.description}
                onChange={(e) => setCurrentProject({...currentProject, description: e.target.value})}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Close
            </Button>
            <Button variant="primary" type="submit">
              Save Project
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={closeDeleteModal}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete Project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            You are about to delete project <strong>{deleteTarget ? deleteTarget.name : ''}</strong>. This action cannot be undone.
          </p>
          <p>Type <code>deleted</code> to confirm:</p>
          <Form.Control 
            type="text" 
            value={deleteConfirmText} 
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="deleted" 
            autoFocus
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeDeleteModal}>Cancel</Button>
          <Button 
            variant="danger" 
            onClick={handleConfirmDelete}
            disabled={deleteConfirmText.trim().toLowerCase() !== 'deleted'}
          >
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Projects;