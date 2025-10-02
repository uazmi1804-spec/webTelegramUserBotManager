import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert } from 'react-bootstrap';
import axios from 'axios';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentProject, setCurrentProject] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false); // Separate loading for actions
  const [refreshing, setRefreshing] = useState(false); // For polling indicator
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  // Run confirmation modal
  const [showRunModal, setShowRunModal] = useState(false);
  const [runTarget, setRunTarget] = useState(null);
  const [runDetails, setRunDetails] = useState(null);
  
  // File preview modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewContent, setPreviewContent] = useState('');
  
  // Data for dropdowns
  const [sessions, setSessions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [files, setFiles] = useState([]);
  
  // Selected values
  const [selectedSession, setSelectedSession] = useState(''); // Single session
  const [sessionSelectionMode, setSessionSelectionMode] = useState('random'); // random or manual
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTextFile, setSelectedTextFile] = useState(''); // Max 1 text file
  const [selectedMediaFile, setSelectedMediaFile] = useState(''); // Max 1 media file

  useEffect(() => {
    fetchProjects();
    fetchSessions();
    fetchCategories();
    fetchFiles();
    
    // Set up polling to refresh projects every 3 seconds
    const pollInterval = setInterval(() => {
      fetchProjects(false); // Don't show loading spinner during polling
    }, 3000); // Poll every 3 seconds
    
    // Cleanup interval on component unmount
    return () => clearInterval(pollInterval);
  }, []);

  const fetchProjects = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const response = await axios.get('/api/projects');
      if (response.data.success) {
        setProjects(response.data.data);
      }
    } catch (error) {
      // Only show error on initial load, not during polling
      if (showLoading) {
        setError('Failed to fetch projects: ' + error.message);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await axios.get('/api/sessions');
      if (response.data.success) {
        setSessions(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories');
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchFiles = async () => {
    try {
      const response = await axios.get('/api/files');
      if (response.data.success) {
        setFiles(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  };

  const handleShowModal = (project = null) => {
    if (project) {
      // Edit mode - load existing project data
      setCurrentProject(project); // Set project first to get status
      loadProjectData(project.id);
    } else {
      // Add mode - reset form
      setCurrentProject({ name: '', description: '' });
      setSelectedSession('');
      setSessionSelectionMode('random');
      setSelectedCategory('');
      setSelectedTextFile('');
      setSelectedMediaFile('');
    }
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const loadProjectData = async (projectId) => {
    try {
      // Reset selections first
      setSelectedSession('');
      setSessionSelectionMode('random');
      setSelectedCategory('');
      setSelectedTextFile('');
      setSelectedMediaFile('');
      
      console.log('[Frontend] Loading project data for:', projectId);
      
      // Get project details
      const projectResponse = await axios.get(`/api/projects/${projectId}`);
      if (projectResponse.data.success) {
        setCurrentProject(projectResponse.data.data);
      }

      // Get project sessions
      const sessionsResponse = await axios.get(`/api/projects/${projectId}/sessions`);
      if (sessionsResponse.data.success && sessionsResponse.data.data.length > 0) {
        const projectSession = sessionsResponse.data.data[0];
        setSelectedSession(projectSession.session_id);
        setSessionSelectionMode(projectSession.selection_mode || 'random');
        console.log('[Frontend] Loaded session:', projectSession.session_id);
      }

      // Get project targets to find category
      const targetsResponse = await axios.get(`/api/projects/${projectId}/targets`);
      if (targetsResponse.data.success && targetsResponse.data.data.length > 0) {
        // Try to find which category contains these channels
        const channelIds = targetsResponse.data.data.map(t => t.channel_id);
        
        // Check each category to find match
        for (const category of categories) {
          const catChannelsResponse = await axios.get(`/api/categories/${category.id}/channels`);
          if (catChannelsResponse.data.success) {
            const catChannelIds = catChannelsResponse.data.data.map(c => c.id);
            // If all project channels are in this category
            if (channelIds.every(id => catChannelIds.includes(id))) {
              setSelectedCategory(category.id);
              break;
            }
          }
        }
      }

      // Get project messages (files)
      const messagesResponse = await axios.get(`/api/projects/${projectId}/messages`);
      if (messagesResponse.data.success) {
        console.log('[Frontend] Loaded messages:', messagesResponse.data.data);
        messagesResponse.data.data.forEach(msg => {
          if (msg.message_type === 'text') {
            setSelectedTextFile(msg.content_ref);
            console.log('[Frontend] Set text file:', msg.content_ref);
          } else if (msg.message_type === 'photo' || msg.message_type === 'video') {
            setSelectedMediaFile(msg.content_ref);
            console.log('[Frontend] Set media file:', msg.content_ref);
          }
        });
      }
    } catch (error) {
      console.error('[Frontend] Error loading project data:', error);
      setError('Error loading project data: ' + error.message);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (sessionSelectionMode === 'manual' && !selectedSession) {
      setError('Please select a session or use random mode');
      return;
    }
    if (!selectedCategory) {
      setError('Please select a category');
      return;
    }
    if (!selectedTextFile && !selectedMediaFile) {
      setError('Please select at least one file (text or media)');
      return;
    }
    
    try {
      if (currentProject.id) {
        // Update existing project
        await updateProject(currentProject.id);
      } else {
        // Create new project
        const response = await axios.post('/api/projects', currentProject);
        if (response.data.success) {
          const projectId = response.data.data.id;
          
          // Determine which session to use
          let sessionToUse = selectedSession;
          if (sessionSelectionMode === 'random') {
            // Pick random session from available sessions
            if (sessions.length > 0) {
              const randomIndex = Math.floor(Math.random() * sessions.length);
              sessionToUse = sessions[randomIndex].id;
            } else {
              setError('No sessions available');
              return;
            }
          }
          
          // Add selected/random session to project
          await axios.post('/api/project-sessions', {
            project_id: projectId,
            session_ids: [sessionToUse],
            selection_mode: sessionSelectionMode
          });
          
          // Add channels from selected category to project
          const categoryResponse = await axios.get(`/api/categories/${selectedCategory}/channels`);
          if (categoryResponse.data.success) {
            const channelIds = categoryResponse.data.data.map(c => c.id);
            if (channelIds.length > 0) {
              await axios.post('/api/project-targets', {
                project_id: projectId,
                channel_ids: channelIds
              });
            }
          }
          
          // Add selected files to project as messages
          const fileIds = [];
          if (selectedTextFile) fileIds.push(selectedTextFile);
          if (selectedMediaFile) fileIds.push(selectedMediaFile);
          
          console.log('[Frontend] Adding messages for files:', fileIds);
          
          if (fileIds.length === 0) {
            console.warn('[Frontend] No files selected! Project will have no messages.');
          }
          
          for (const fileId of fileIds) {
            console.log('[Frontend] Adding message for file:', fileId);
            const msgResponse = await axios.post('/api/project-messages', {
              project_id: projectId,
              file_id: fileId
            });
            console.log('[Frontend] Message added:', msgResponse.data);
          }
          
          setSuccess(`Project created successfully with ${fileIds.length} message(s)`);
        }
      }
      
      fetchProjects();
      handleCloseModal();
    } catch (error) {
      setError('Error saving project: ' + error.message);
    }
  };

  const updateProject = async (projectId) => {
    // Update project basic info
    await axios.put(`/api/projects/${projectId}`, {
      name: currentProject.name,
      description: currentProject.description
    });

    // Delete old sessions and add new one
    const oldSessionsResponse = await axios.get(`/api/projects/${projectId}/sessions`);
    if (oldSessionsResponse.data.success) {
      for (const sess of oldSessionsResponse.data.data) {
        await axios.delete(`/api/projects/${projectId}/sessions/${sess.session_id}`);
      }
    }

    // Add new session
    let sessionToUse = selectedSession;
    if (sessionSelectionMode === 'random' && !selectedSession) {
      if (sessions.length > 0) {
        const randomIndex = Math.floor(Math.random() * sessions.length);
        sessionToUse = sessions[randomIndex].id;
      }
    }
    await axios.post(`/api/projects/${projectId}/sessions`, {
      session_id: sessionToUse,
      selection_mode: sessionSelectionMode
    });

    // Delete old targets and add new ones from category
    const oldTargetsResponse = await axios.get(`/api/projects/${projectId}/targets`);
    if (oldTargetsResponse.data.success) {
      for (const target of oldTargetsResponse.data.data) {
        await axios.delete(`/api/projects/${projectId}/targets/${target.id}`);
      }
    }

    // Add new targets from selected category
    const categoryResponse = await axios.get(`/api/categories/${selectedCategory}/channels`);
    if (categoryResponse.data.success) {
      const channelIds = categoryResponse.data.data.map(c => c.id);
      if (channelIds.length > 0) {
        for (const channelId of channelIds) {
          await axios.post(`/api/projects/${projectId}/targets`, {
            channel_id: channelId,
            priority: 0
          });
        }
      }
    }

    // Delete old messages and add new ones
    const oldMessagesResponse = await axios.get(`/api/projects/${projectId}/messages`);
    if (oldMessagesResponse.data.success) {
      for (const msg of oldMessagesResponse.data.data) {
        await axios.delete(`/api/projects/${projectId}/messages/${msg.id}`);
      }
    }

    // Add new messages
    const fileIds = [];
    if (selectedTextFile) fileIds.push(selectedTextFile);
    if (selectedMediaFile) fileIds.push(selectedMediaFile);
    
    console.log('[Frontend] Updating messages for files:', fileIds);
    
    if (fileIds.length === 0) {
      console.warn('[Frontend] No files selected during update! Project will have no messages.');
    }
    
    for (const fileId of fileIds) {
      console.log('[Frontend] Adding message for file:', fileId);
      const msgResponse = await axios.post('/api/project-messages', {
        project_id: projectId,
        file_id: fileId
      });
      console.log('[Frontend] Message added:', msgResponse.data);
    }

    setSuccess(`Project updated successfully with ${fileIds.length} message(s)`);
  };

  const fetchRunDetails = async (projectId) => {
    try {
      console.log('[Run Modal] Fetching details for project:', projectId);
      
      // Fetch all project details
      const [projectRes, sessionsRes, targetsRes, messagesRes] = await Promise.all([
        axios.get(`/api/projects/${projectId}`),
        axios.get(`/api/projects/${projectId}/sessions`),
        axios.get(`/api/projects/${projectId}/targets`),
        axios.get(`/api/projects/${projectId}/messages`)
      ]);

      const details = {
        project: projectRes.data.data,
        sessions: sessionsRes.data.data || [],
        targets: targetsRes.data.data || [],
        messages: messagesRes.data.data || []
      };

      console.log('[Run Modal] Base data:', {
        sessions: details.sessions.length,
        targets: details.targets.length,
        messages: details.messages.length
      });

      // Get session details
      if (details.sessions.length > 0) {
        const sessionId = details.sessions[0].session_id;
        const session = sessions.find(s => s.id === sessionId);
        details.sessionInfo = session;
        console.log('[Run Modal] Session info:', session ? 'Found' : 'Not found');
      }

      // Get channel details for targets
      const channelPromises = details.targets.map(t => 
        axios.get(`/api/channels/${t.channel_id}`).catch(err => {
          console.error('[Run Modal] Error fetching channel:', t.channel_id, err);
          return null;
        })
      );
      const channelResponses = await Promise.all(channelPromises);
      details.channels = channelResponses
        .filter(r => r && r.data.success)
        .map(r => r.data.data);
      console.log('[Run Modal] Channels fetched:', details.channels.length);

      // Get file details for messages
      console.log('[Run Modal] Fetching files for messages:', details.messages.map(m => m.content_ref));
      const filePromises = details.messages.map(m => {
        console.log('[Run Modal] Fetching file info:', m.content_ref);
        return axios.get(`/api/files/${m.content_ref}/info`).catch(err => {
          console.error('[Run Modal] Error fetching file:', m.content_ref, err.response?.data || err.message);
          return null;
        });
      });
      const fileResponses = await Promise.all(filePromises);
      console.log('[Run Modal] File responses:', fileResponses.map(r => r ? 'Success' : 'Failed'));
      
      details.fileDetails = fileResponses
        .filter(r => r && r.data && r.data.success)
        .map(r => r.data.data);
      
      console.log('[Run Modal] Files fetched:', details.fileDetails.length);
      console.log('[Run Modal] File details:', details.fileDetails);

      return details;
    } catch (error) {
      console.error('[Run Modal] Error fetching run details:', error);
      return null;
    }
  };

  const handleRunClick = async (project) => {
    console.log('🚀 Preparing to run project:', project.id);
    
    // Fetch project details
    const details = await fetchRunDetails(project.id);
    if (!details) {
      setError('Failed to load project details');
      return;
    }

    setRunTarget(project);
    setRunDetails(details);
    setShowRunModal(true);
  };

  const handleConfirmRun = async () => {
    if (!runTarget) return;
    
    setShowRunModal(false);
    await handleRun(runTarget.id);
  };

  const handleViewFile = async (file) => {
    try {
      setPreviewFile(file);
      setPreviewContent('Loading...');
      setShowPreviewModal(true);

      if (file.file_type === 'text') {
        // Fetch text content
        const response = await axios.get(`/api/files/${file.id}/preview`);
        console.log('[Preview] Response:', response.data);
        
        // Extract content from response
        if (response.data.success && response.data.data) {
          setPreviewContent(response.data.data.content || response.data.data);
        } else {
          setPreviewContent(response.data);
        }
      } else {
        // For media, we'll show the image/video
        setPreviewContent('');
      }
    } catch (error) {
      console.error('Error loading preview:', error);
      setPreviewContent('Error loading preview: ' + error.message);
    }
  };

  const handleRun = async (id) => {
    console.log('🚀 Starting project:', id);
    
    try {
      setActionLoading(true); // Use actionLoading instead of loading
      setError('');
      setSuccess('');
      
      console.log('📤 Sending POST request to /api/projects/' + id + '/run');
      const response = await axios.post(`/api/projects/${id}/run`, { started_by: 'user' });
      console.log('📥 Response received:', response.data);
      
      if (response.data.success) {
        const jobsCreated = response.data.data?.jobs_created || 0;
        const runId = response.data.data?.run_id || 'unknown';
        setSuccess(`✅ Project started successfully! ${jobsCreated} jobs created. Run ID: ${runId}`);
        console.log('✅ Success! Jobs created:', jobsCreated);
        fetchProjects();
      } else {
        const errorMsg = response.data.error || 'Unknown error';
        setError('❌ Failed to start project: ' + errorMsg);
        console.error('❌ Failed:', errorMsg);
      }
    } catch (error) {
      console.error('❌ Error running project:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      setError('❌ Error running project: ' + errorMsg);
      
      // Show alert for debugging
      alert('Error: ' + errorMsg + '\n\nCheck console for details.');
    } finally {
      setActionLoading(false); // Reset actionLoading
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
        <div className="d-flex align-items-center gap-2">
          <h2 className="mb-0">Projects</h2>
          {refreshing && (
            <small className="text-muted">
              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              Auto-refreshing...
            </small>
          )}
        </div>
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
                    onClick={() => handleRunClick(project)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        Starting...
                      </>
                    ) : (
                      '▶️ Run'
                    )}
                  </Button>
                ) : (
                  <Button 
                    variant="warning" 
                    size="sm" 
                    className="me-2"
                    onClick={() => handleStop(project.id)}
                    disabled={actionLoading}
                  >
                    ⏸️ Stop
                  </Button>
                )}
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  className="me-2"
                  onClick={() => handleShowModal(project)}
                >
                  Edit
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

      <Modal show={showModal} onHide={handleCloseModal} size="lg">
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
            
            <Form.Group className="mb-3">
              <Form.Label>Session Selection Mode</Form.Label>
              <Form.Select
                value={sessionSelectionMode}
                onChange={(e) => {
                  setSessionSelectionMode(e.target.value);
                  if (e.target.value === 'random') {
                    setSelectedSession(''); // Clear manual selection
                  }
                }}
              >
                <option value="random">Random (Auto-select from available sessions)</option>
                <option value="manual">Manual (Choose specific session)</option>
              </Form.Select>
              <Form.Text className="text-muted">
                Random: System will randomly pick a session. Manual: You choose the session.
              </Form.Text>
            </Form.Group>
            
            {sessionSelectionMode === 'manual' && (
              <Form.Group className="mb-3">
                <Form.Label>Select Session</Form.Label>
                <Form.Select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  required
                >
                  <option value="">-- Select a session --</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.first_name} {session.last_name} (@{session.username || 'no username'})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}
            
            {sessionSelectionMode === 'random' && (
              <Alert variant="info" className="mb-3">
                <small>
                  <strong>Random Mode:</strong> System will automatically select a random session from {sessions.length} available session(s).
                </small>
              </Alert>
            )}
            
            <Form.Group className="mb-3">
              <Form.Label>Category Channels</Form.Label>
              <Form.Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">-- Select a category --</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.channel_count} channels)
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Select a category to add all its channels as targets
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Text File (Optional - Max 1)</Form.Label>
              <Form.Select
                value={selectedTextFile}
                onChange={(e) => setSelectedTextFile(e.target.value)}
              >
                <option value="">-- Select text file (optional) --</option>
                {files.filter(f => f.file_type === 'text').map((file) => (
                  <option key={file.id} value={file.id}>
                    {file.filename}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                If only text selected: send as text message. If text + media: text becomes caption.
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Media File (Optional - Max 1)</Form.Label>
              <Form.Select
                value={selectedMediaFile}
                onChange={(e) => setSelectedMediaFile(e.target.value)}
              >
                <option value="">-- Select media file (optional) --</option>
                {files.filter(f => f.file_type === 'photo' || f.file_type === 'video').map((file) => (
                  <option key={file.id} value={file.id}>
                    {file.filename} ({file.file_type})
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Photo or video file. Will use text file as caption if both selected.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Close
            </Button>
            <Button 
              variant="primary" 
              type="submit"
              disabled={currentProject.id && currentProject.status === 'running'}
            >
              {currentProject.id && currentProject.status === 'running' 
                ? 'Cannot Save (Project Running)' 
                : 'Save Project'}
            </Button>
          </Modal.Footer>
          
          {/* Warning if project is running */}
          {currentProject.id && currentProject.status === 'running' && (
            <Alert variant="warning" className="mt-2 mb-0">
              <strong>⚠️ Project is currently running!</strong>
              <br />
              You can view the data but cannot save changes while the project is running.
              Please stop the project first to make changes.
            </Alert>
          )}
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

      {/* Run Confirmation Modal */}
      <Modal show={showRunModal} onHide={() => setShowRunModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>🚀 Confirm Run Project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {runDetails && (
            <>
              <h5 className="mb-3">Project: <strong>{runTarget?.name}</strong></h5>
              
              {/* Session Info */}
              <div className="mb-4">
                <h6 className="text-primary">👤 Session</h6>
                {runDetails.sessionInfo ? (
                  <div className="p-3 bg-light rounded">
                    <div><strong>Name:</strong> {runDetails.sessionInfo.first_name} {runDetails.sessionInfo.last_name}</div>
                    <div><strong>Username:</strong> @{runDetails.sessionInfo.username || 'N/A'}</div>
                    <div><strong>Phone:</strong> {runDetails.sessionInfo.phone_number || 'N/A'}</div>
                  </div>
                ) : (
                  <Alert variant="warning">No session configured</Alert>
                )}
              </div>

              {/* Target Channels */}
              <div className="mb-4">
                <h6 className="text-primary">📢 Target Channels ({runDetails.channels?.length || 0})</h6>
                {runDetails.channels && runDetails.channels.length > 0 ? (
                  <div className="p-3 bg-light rounded" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <ul className="mb-0">
                      {runDetails.channels.map((channel, idx) => (
                        <li key={idx}>
                          <strong>{channel.name || channel.username || channel.chat_id}</strong>
                          {channel.chat_id && <span className="text-muted"> ({channel.chat_id})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <Alert variant="warning">No target channels configured</Alert>
                )}
              </div>

              {/* Messages/Files */}
              <div className="mb-4">
                <h6 className="text-primary">📝 Messages ({runDetails.fileDetails?.length || 0})</h6>
                {runDetails.fileDetails && runDetails.fileDetails.length > 0 ? (
                  <div className="p-3 bg-light rounded">
                    {runDetails.fileDetails.map((file, idx) => {
                      const message = runDetails.messages[idx];
                      return (
                        <div key={idx} className="mb-2 pb-2 border-bottom">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center flex-grow-1">
                              <span className="me-2">
                                {message.message_type === 'text' && '📄'}
                                {message.message_type === 'photo' && '🖼️'}
                                {message.message_type === 'video' && '🎥'}
                              </span>
                              <div>
                                <strong>{file.filename}</strong>
                                <div className="text-muted small">
                                  Type: {message.message_type} | Size: {(file.size / 1024).toFixed(2)} KB
                                </div>
                              </div>
                            </div>
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={() => handleViewFile(file)}
                            >
                              👁️ View
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Alert variant="warning">No messages configured</Alert>
                )}
              </div>

              {/* Summary */}
              <Alert variant="info">
                <strong>📊 Summary:</strong>
                <div className="mt-2">
                  This will send <strong>{runDetails.fileDetails?.length || 0}</strong> message(s) 
                  to <strong>{runDetails.channels?.length || 0}</strong> channel(s), 
                  creating approximately <strong>{(runDetails.channels?.length || 0) * (runDetails.fileDetails?.length > 0 ? 1 : 0)}</strong> job(s).
                </div>
              </Alert>

              {/* Warnings */}
              {(!runDetails.sessionInfo || !runDetails.channels?.length || !runDetails.fileDetails?.length) && (
                <Alert variant="danger">
                  <strong>⚠️ Warning:</strong> This project is missing required data and may not run successfully.
                  Please edit the project to add missing information.
                </Alert>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRunModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={handleConfirmRun}
            disabled={!runDetails?.sessionInfo || !runDetails?.channels?.length || !runDetails?.fileDetails?.length}
          >
            ✅ Confirm & Run
          </Button>
        </Modal.Footer>
      </Modal>

      {/* File Preview Modal */}
      <Modal show={showPreviewModal} onHide={() => setShowPreviewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>👁️ Preview: {previewFile?.filename}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {previewFile && (
            <>
              <div className="mb-3">
                <strong>Type:</strong> {previewFile.file_type} | 
                <strong className="ms-2">Size:</strong> {(previewFile.size / 1024).toFixed(2)} KB
              </div>
              
              {previewFile.file_type === 'text' ? (
                <div className="border rounded p-3" style={{ 
                  maxHeight: '400px', 
                  overflowY: 'auto',
                  backgroundColor: '#f8f9fa',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap'
                }}>
                  {previewContent}
                </div>
              ) : previewFile.file_type === 'photo' ? (
                <div className="text-center">
                  <img 
                    src={`/api/files/${previewFile.id}/raw`} 
                    alt={previewFile.filename}
                    style={{ maxWidth: '100%', maxHeight: '500px' }}
                    className="img-fluid rounded"
                  />
                </div>
              ) : previewFile.file_type === 'video' ? (
                <div className="text-center">
                  <video 
                    controls 
                    style={{ maxWidth: '100%', maxHeight: '500px' }}
                    className="rounded"
                  >
                    <source src={`/api/files/${previewFile.id}/raw`} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <Alert variant="info">
                  Preview not available for this file type.
                  <div className="mt-2">
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => window.open(`/api/files/${previewFile.id}`, '_blank')}
                    >
                      📥 Download File
                    </Button>
                  </div>
                </Alert>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>
            Close
          </Button>
          <Button 
            variant="primary"
            onClick={() => window.open(`/api/files/${previewFile?.id}`, '_blank')}
          >
            📥 Download
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Projects;