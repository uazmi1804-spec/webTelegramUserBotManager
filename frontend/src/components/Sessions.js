import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert } from 'react-bootstrap';
import axios from 'axios';

function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentSession, setCurrentSession] = useState({ name: '', session_string: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [credentials, setCredentials] = useState([]);
  const [activeCredential, setActiveCredential] = useState(null);
  const [showCredModal, setShowCredModal] = useState(false);
  const [newCred, setNewCred] = useState({ name: '', api_id: '', api_hash: '' });
  const [countrySearch, setCountrySearch] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [phoneFull, setPhoneFull] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [registrationMode, setRegistrationMode] = useState('phone'); // 'phone' or 'session_string'
  const [sessionString, setSessionString] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    fetchSessions();
    fetchCredentials();
    fetchActiveCredential();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/sessions');
      if (response.data.success) {
        setSessions(response.data.data);
      }
    } catch (error) {
      setError('Failed to fetch sessions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCredentials = async () => {
    try {
      const res = await axios.get('/api/credentials');
      if (res.data.success) setCredentials(res.data.data || []);
    } catch (e) {
      // ignore list error, will be surfaced via actions if needed
    }
  };

  const fetchActiveCredential = async () => {
    try {
      const res = await axios.get('/api/credentials/active');
      if (res.data.success) setActiveCredential(res.data.data || null);
    } catch (e) {
      // ignore
    }
  };

  const handleShowCredModal = () => {
    setNewCred({ name: '', api_id: '', api_hash: '' });
    setShowCredModal(true);
  };

  const handleCloseCredModal = () => {
    setShowCredModal(false);
  };

  const handleSaveCredential = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: newCred.name,
        api_id: Number(newCred.api_id),
        api_hash: newCred.api_hash,
      };
      await axios.post('/api/credentials', payload);
      setSuccess('API credential saved');
      setShowCredModal(false);
      await fetchCredentials();
    } catch (err) {
      setError('Failed to save API credential: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleActivateCredential = async (id) => {
    try {
      await axios.put(`/api/credentials/${id}/activate`);
      setSuccess('Active API credential updated');
      await fetchActiveCredential();
      await fetchCredentials();
    } catch (err) {
      setError('Failed to activate API credential: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleShowModal = (session = null) => {
    setCurrentSession({ name: '', session_string: '' });
    setCountrySearch('');
    setCountryCode('');
    setPhoneLocal('');
    setPhoneFull('');
    setSessionId('');
    setCode('');
    setPassword('');
    setSendingCode(false);
    setCountdown(0);
    setRegistrationMode('phone');
    setSessionString('');
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSendCode = async () => {
    if (!activeCredential) {
      setError('Please configure and activate an API credential first.');
      return;
    }
    const fullPhone = phoneFull.trim();
    if (!/^\+[0-9]{6,15}$/.test(fullPhone)) {
      setError('Please enter a valid phone number in international format, e.g., +628123456789.');
      return;
    }
    try {
      setSendingCode(true);
      const res = await axios.post('/api/sessions/phone/send_code', {
        api_id: activeCredential.api_id,
        api_hash: activeCredential.api_hash,
        phone_number: fullPhone,
      }, { headers: { 'x-internal-secret': process.env.REACT_APP_INTERNAL_SECRET || '' } });
      if (res.data.success) {
        setSessionId(res.data.session_id);
        setSuccess('Code sent. Please enter the code.');
        setCountdown(60);
      } else {
        setError(res.data.error || 'Failed to send code');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSendingCode(false);
    }
  };

  const handleCompleteAuth = async () => {
    if (!sessionId) {
      setError('Please send code first.');
      return;
    }
    if (!code.trim()) {
      setError('Please enter the received code.');
      return;
    }
    try {
      const res = await axios.post('/api/sessions/phone/complete', {
        session_id: sessionId,
        phone_code: code.trim(),
        password: password || undefined,
        api_id: activeCredential?.api_id,
        api_hash: activeCredential?.api_hash,
      }, { headers: { 'x-internal-secret': process.env.REACT_APP_INTERNAL_SECRET || '' } });
      if (res.data.success) {
        setSuccess('Session created successfully');
        fetchSessions();
        handleCloseModal();
      } else {
        setError(res.data.error || 'Failed to complete authentication');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      if (msg === 'PASSWORD_REQUIRED') {
        setError('Two-step verification enabled. Please enter your password.');
      } else if (msg === 'BAD_PASSWORD') {
        setError('Incorrect password. Please try again.');
      } else {
        setError(msg);
      }
    }
  };

  const openDeleteModal = (session) => {
    setDeleteTarget(session);
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
      await axios.delete(`/api/sessions/${deleteTarget.id}`);
      setSuccess(`Session "${deleteTarget.name || deleteTarget.first_name || 'Unknown'}" deleted successfully.`);
      closeDeleteModal();
      fetchSessions();
    } catch (err) {
      setError('Failed to delete session: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRegisterWithSessionString = async () => {
    if (!activeCredential) {
      setError('Please configure and activate an API credential first.');
      return;
    }
    if (!sessionString.trim()) {
      setError('Please enter a session string.');
      return;
    }
    try {
      const res = await axios.post('/api/sessions/register_string', {
        api_id: activeCredential.api_id,
        api_hash: activeCredential.api_hash,
        session_string: sessionString.trim(),
      }, { headers: { 'x-internal-secret': process.env.REACT_APP_INTERNAL_SECRET || '' } });
      if (res.data.success) {
        setSuccess('Session registered successfully');
        fetchSessions();
        handleCloseModal();
      } else {
        setError(res.data.error || 'Failed to register session');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleUpdateSession = async (sessionId) => {
    if (!activeCredential) {
      setError('Please configure and activate an API credential first.');
      return;
    }
    try {
      const res = await axios.put(`/api/sessions/${sessionId}/update_data`, {
        api_id: activeCredential.api_id,
        api_hash: activeCredential.api_hash,
      }, { headers: { 'x-internal-secret': process.env.REACT_APP_INTERNAL_SECRET || '' } });
      if (res.data.success) {
        setSuccess('Session updated successfully');
        fetchSessions();
      } else {
        setError(res.data.error || 'Failed to update session');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };


  const handleTestSession = async (session_id) => {
    try {
      const response = await axios.get(`/internal/pyrogram/get_me?session_string=${encodeURIComponent(session_id)}`);
      if (response.data.success) {
        alert(`Session is valid. User: ${response.data.data.first_name} ${response.data.data.last_name || ''}`);
      }
    } catch (error) {
      setError('Error testing session: ' + error.message);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('en-GB'); // dd/mm/yyyy format
    const formattedTime = date.toLocaleTimeString(); // hh:mm:ss format
    return `${formattedDate} ${formattedTime}`;
  };

  if (loading) return <Container><p>Loading sessions...</p></Container>;

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Sessions</h2>
        <div className="d-flex gap-2 align-items-center">
          <Form.Control
            size="sm"
            type="text"
            placeholder="Search sessions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '240px' }}
          />
          <Button variant="outline-secondary" onClick={handleShowCredModal}>
            Configure API
          </Button>
          <Button variant="primary" onClick={() => handleShowModal()}>
            Add Session
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="mb-3">
        <strong>Active API:</strong>{' '}
        {activeCredential ? (
          <span>{activeCredential.name} (ID: {activeCredential.api_id})</span>
        ) : (
          <span>None</span>
        )}
      </div>

      <Table striped bordered hover>
        <thead>
          <tr>
            <th>ID</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Username</th>
            <th>Data Time</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sessions
            .filter((session) => {
              const q = search.toLowerCase();
              if (!q) return true;
              return (
                (session.first_name || '').toLowerCase().includes(q) ||
                (session.last_name || '').toLowerCase().includes(q) ||
                (session.username || '').toLowerCase().includes(q) ||
                (session.id || '').toLowerCase().includes(q)
              );
            })
            .map((session) => (
            <tr key={session.id}>
              <td>{session.id.substring(0, 8)}...</td>
              <td>{session.first_name || ''}</td>
              <td>{session.last_name || ''}</td>
              <td>{session.username || ''}</td>
              <td>{formatDateTime(session.login_at)}</td>
              <td>
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  className="me-2"
                  onClick={() => handleShowModal()}
                >
                  Edit
                </Button>
                <Button 
                  variant="outline-success" 
                  size="sm" 
                  className="me-2"
                  onClick={() => handleUpdateSession(session.id)}
                  disabled={!activeCredential}
                >
                  Update
                </Button>
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={() => openDeleteModal(session)}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={handleCloseModal} size="md" centered>
        <Modal.Header closeButton>
          <Modal.Title>Add New Session</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Registration Mode Selection */}
          <div className="mb-3">
            <Form.Check
              type="radio"
              label="Register with Phone Number"
              name="registrationMode"
              value="phone"
              checked={registrationMode === 'phone'}
              onChange={(e) => setRegistrationMode(e.target.value)}
              className="mb-2"
            />
            <Form.Check
              type="radio"
              label="Register with Session String"
              name="registrationMode"
              value="session_string"
              checked={registrationMode === 'session_string'}
              onChange={(e) => setRegistrationMode(e.target.value)}
            />
          </div>

          {registrationMode === 'phone' ? (
            <>
              {/* Full international phone number */}
              <Form.Control
                className="mb-3"
                size="sm"
                type="tel"
                placeholder="e.g., +628123456789"
                value={phoneFull}
                onChange={(e) => setPhoneFull(e.target.value)}
                style={{ maxWidth: '280px' }}
              />
              <div className="d-flex gap-2 mb-3">
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="Code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  style={{ maxWidth: '160px' }}
                />
                <Button size="sm" variant="outline-primary" onClick={handleSendCode} disabled={sendingCode || countdown > 0}>
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Send Code'}
                </Button>
              </div>
              <div className="d-flex gap-2 mb-2">
                <Form.Control
                  size="sm"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="2FA Password (numbers only)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ maxWidth: '260px' }}
                />
              </div>
            </>
          ) : (
            <>
              {/* Session String Input */}
              <Form.Group className="mb-3">
                <Form.Label>Session String</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  placeholder="Paste your session string here..."
                  value={sessionString}
                  onChange={(e) => setSessionString(e.target.value)}
                />
                <Form.Text className="text-muted">
                  You can get session strings from other Telegram clients or export them from existing sessions.
                </Form.Text>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>Close</Button>
          {registrationMode === 'phone' ? (
            <Button size="sm" variant="success" onClick={handleCompleteAuth} disabled={!code.trim()}>
              Register
            </Button>
          ) : (
            <Button size="sm" variant="success" onClick={handleRegisterWithSessionString} disabled={!sessionString.trim()}>
              Register
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Credentials Modal */}
      <Modal show={showCredModal} onHide={handleCloseCredModal}>
        <Modal.Header closeButton>
          <Modal.Title>Configure Telegram API</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="mb-3">
            How to obtain your Telegram API ID & API Hash:
            <ol className="mb-0 mt-2">
              <li>Visit <a href="https://my.telegram.org" target="_blank" rel="noreferrer">my.telegram.org</a> and sign in.</li>
              <li>Open "API Development Tools".</li>
              <li>Create a new application (enter a name and short description).</li>
              <li>Copy the displayed API ID and API Hash.</li>
            </ol>
          </Alert>
          <Form onSubmit={handleSaveCredential}>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Production Key"
                value={newCred.name}
                onChange={(e) => setNewCred({ ...newCred, name: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>API ID</Form.Label>
              <Form.Control
                type="number"
                placeholder="123456"
                value={newCred.api_id}
                onChange={(e) => setNewCred({ ...newCred, api_id: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>API Hash</Form.Label>
              <Form.Control
                type="text"
                placeholder="abcdef123456..."
                value={newCred.api_hash}
                onChange={(e) => setNewCred({ ...newCred, api_hash: e.target.value })}
                required
              />
            </Form.Group>
            <div className="d-flex gap-2">
              <Button variant="primary" type="submit">Save</Button>
              <Button variant="secondary" onClick={handleCloseCredModal}>Close</Button>
            </div>
          </Form>
          <hr />
          <h6>Saved API Credentials</h6>
          <Table striped bordered hover size="sm" className="mb-0">
            <thead>
              <tr>
                <th>Name</th>
                <th>API ID</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {credentials.map((cred) => (
                <tr key={cred.id}>
                  <td>{cred.name}</td>
                  <td>{cred.api_id}</td>
                  <td>{cred.is_active ? 'Yes' : 'No'}</td>
                  <td>
                    {!cred.is_active && (
                      <Button size="sm" variant="outline-success" onClick={() => handleActivateCredential(cred.id)}>
                        Set Active
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {credentials.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center">No credentials saved</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={closeDeleteModal}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete Session</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            You are about to delete session {deleteTarget ? <strong>{deleteTarget.name || deleteTarget.first_name || 'Unknown'}</strong> : ''}. This action cannot be undone.
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

export default Sessions;