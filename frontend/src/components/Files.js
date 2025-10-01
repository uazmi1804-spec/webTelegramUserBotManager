import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Form, Alert, Modal, Row, Col } from 'react-bootstrap';
import axios from 'axios';

function Files() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showCreateTextModal, setShowCreateTextModal] = useState(false);
  const [newTextFilename, setNewTextFilename] = useState('');
  const [newTextContent, setNewTextContent] = useState('');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/files');
      if (response.data.success) {
        setFiles(response.data.data);
      }
    } catch (error) {
      setError('Failed to fetch files: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
      await axios.post('/api/files', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setSuccess('File uploaded successfully');
      setSelectedFile(null);
      fetchFiles();
      handleCloseUploadModal();
    } catch (error) {
      setError('Error uploading file: ' + error.message);
    }
  };

  const handleDownload = (id, filename) => {
    // Create a temporary link to download the file
    window.location.href = `/api/files/${id}`;
  };

  const handlePreview = async (file) => {
    setPreviewFile(file);
    setPreviewLoading(true);
    setShowPreview(true);
    
    try {
      const response = await axios.get(`/api/files/${file.id}/preview`);
      if (response.data.success) {
        setPreviewContent(response.data.data);
      } else {
        setError('Failed to load preview: ' + response.data.error);
      }
    } catch (error) {
      setError('Error loading preview: ' + error.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleOpenInNewTab = (file) => {
    const url = `/api/files/${file.id}/raw`;
    window.open(url, '_blank');
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewFile(null);
    setPreviewContent(null);
  };

  const handleShowUploadModal = () => {
    setSelectedFile(null);
    setError('');
    setSuccess('');
    setShowUploadModal(true);
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
  };

  const handleShowCreateTextModal = () => {
    setNewTextFilename('');
    setNewTextContent('');
    setError('');
    setSuccess('');
    setShowCreateTextModal(true);
  };

  const handleCloseCreateTextModal = () => {
    setShowCreateTextModal(false);
  };

  const handleCreateText = async (e) => {
    e.preventDefault();
    if (!newTextFilename.trim()) {
      setError('Filename is required');
      return;
    }
    try {
      await axios.post('/api/files/text', {
        filename: newTextFilename.trim(),
        content: newTextContent,
      });
      setSuccess('Text file created successfully');
      setShowCreateTextModal(false);
      fetchFiles();
    } catch (err) {
      setError('Failed to create text file: ' + (err.response?.data?.error || err.message));
    }
  };

  const openDeleteModal = (file) => {
    setDeleteTarget(file);
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
      await axios.delete(`/api/files/${deleteTarget.id}`);
      setSuccess(`File "${deleteTarget.filename}" deleted successfully.`);
      closeDeleteModal();
      fetchFiles();
    } catch (err) {
      setError('Failed to delete file: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return <Container><p>Loading files...</p></Container>;

  return (
    <Container>
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>File Manager</h2>
        <div className="d-flex gap-2 align-items-center">
          <Form.Control
            size="sm"
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '240px' }}
          />
          <Button variant="success" onClick={handleShowCreateTextModal}>
            Create Text
          </Button>
          <Button variant="primary" onClick={handleShowUploadModal}>
            Upload File
          </Button>
        </div>
      </div>

      <Table striped bordered hover>
        <thead>
          <tr>
            <th>ID</th>
            <th>Filename</th>
            <th>Type</th>
            <th>Size</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {files
            .filter((file) => {
              const q = search.toLowerCase();
              if (!q) return true;
              return (
                (file.filename || '').toLowerCase().includes(q) ||
                (file.file_type || '').toLowerCase().includes(q) ||
                (file.id || '').toLowerCase().includes(q)
              );
            })
            .map((file) => (
            <tr key={file.id}>
              <td>{file.id.substring(0, 8)}...</td>
              <td>{file.filename}</td>
              <td>
                <span className={`badge ${
                  file.file_type === 'text' ? 'bg-info' :
                  file.file_type === 'photo' ? 'bg-success' :
                  file.file_type === 'video' ? 'bg-warning' :
                  'bg-secondary'
                }`}>
                  {file.file_type}
                </span>
              </td>
              <td>{(file.size / 1024).toFixed(2)} KB</td>
              <td>
                <div className="btn-group" role="group">
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => handlePreview(file)}
                    disabled={!['text', 'photo', 'video'].includes(file.file_type)}
                  >
                    Preview
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    onClick={() => handleDownload(file.id, file.filename)}
                  >
                    Download
                  </Button>
                  {['photo', 'video'].includes(file.file_type) && (
                    <Button 
                      variant="outline-info" 
                      size="sm"
                      onClick={() => handleOpenInNewTab(file)}
                    >
                      Open
                    </Button>
                  )}
                  <Button 
                    variant="outline-danger" 
                    size="sm"
                    onClick={() => openDeleteModal(file)}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Preview Modal */}
      <Modal show={showPreview} onHide={handleClosePreview} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {previewFile && `Preview: ${previewFile.filename}`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {previewLoading ? (
            <div className="text-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p>Loading preview...</p>
            </div>
          ) : previewContent ? (
            <div>
              {previewContent.type === 'text' ? (
                <div>
                  <h6>Text Content:</h6>
                  <pre 
                    style={{ 
                      backgroundColor: '#f8f9fa', 
                      padding: '15px', 
                      borderRadius: '5px',
                      maxHeight: '400px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    {previewContent.content}
                  </pre>
                </div>
              ) : previewContent.type === 'photo' ? (
                <div>
                  <h6>Image Preview:</h6>
                  <img 
                    src={previewContent.url} 
                    alt={previewContent.filename}
                    style={{ 
                      maxWidth: '100%', 
                      height: 'auto',
                      maxHeight: '500px',
                      objectFit: 'contain'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div style={{ display: 'none', textAlign: 'center', padding: '20px' }}>
                    <p>Image could not be loaded</p>
                    <Button 
                      variant="primary" 
                      onClick={() => handleOpenInNewTab(previewFile)}
                    >
                      Open in New Tab
                    </Button>
                  </div>
                </div>
              ) : previewContent.type === 'video' ? (
                <div>
                  <h6>Video Preview:</h6>
                  <video 
                    controls 
                    style={{ 
                      maxWidth: '100%', 
                      height: 'auto',
                      maxHeight: '500px'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  >
                    <source src={previewContent.url} type="video/mp4" />
                    <source src={previewContent.url} type="video/avi" />
                    <source src={previewContent.url} type="video/quicktime" />
                    Your browser does not support the video tag.
                  </video>
                  <div style={{ display: 'none', textAlign: 'center', padding: '20px' }}>
                    <p>Video could not be loaded</p>
                    <Button 
                      variant="primary" 
                      onClick={() => handleOpenInNewTab(previewFile)}
                    >
                      Open in New Tab
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p>Preview not available for this file type</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p>No preview available</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {previewContent && ['photo', 'video'].includes(previewContent.type) && (
            <Button 
              variant="info" 
              onClick={() => handleOpenInNewTab(previewFile)}
            >
              Open in New Tab
            </Button>
          )}
          <Button variant="secondary" onClick={handleClosePreview}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={closeDeleteModal}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete File</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            You are about to delete {deleteTarget ? <strong>{deleteTarget.filename}</strong> : ''}. This action cannot be undone.
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
      
      {/* Upload File Modal */}
      <Modal show={showUploadModal} onHide={handleCloseUploadModal}>
        <Modal.Header closeButton>
          <Modal.Title>Upload File</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpload}>
            <Form.Group className="mb-3">
              <Form.Label>Select File to Upload</Form.Label>
              <Form.Control 
                type="file" 
                onChange={handleFileChange}
                required
              />
              <Form.Text className="text-muted">
                Supported file types: text, images, videos, and other files
              </Form.Text>
            </Form.Group>
            <div className="d-flex gap-2">
              <Button variant="primary" type="submit" disabled={!selectedFile}>
                Upload File
              </Button>
              <Button variant="secondary" onClick={handleCloseUploadModal}>
                Cancel
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Create Text Modal */}
      <Modal show={showCreateTextModal} onHide={handleCloseCreateTextModal}>
        <Modal.Header closeButton>
          <Modal.Title>Create Text File</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreateText}>
            <Form.Group className="mb-3">
              <Form.Label>Filename</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="e.g., message-emoji.txt or message-emoji"
                value={newTextFilename}
                onChange={(e) => setNewTextFilename(e.target.value)}
                required
              />
              <Form.Text className="text-muted">
                The .txt extension will be appended if not provided.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Text Content</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={10}
                value={newTextContent}
                onChange={(e) => setNewTextContent(e.target.value)}
                placeholder="Write your text here. Emoji supported 😀👍🏽"
              />
              <Form.Text className="text-muted">
                Saved as UTF-8 to support emoji and special characters.
              </Form.Text>
            </Form.Group>
            <div className="d-flex gap-2">
              <Button variant="success" type="submit">
                Save
              </Button>
              <Button variant="secondary" onClick={handleCloseCreateTextModal}>
                Cancel
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
}

export default Files;